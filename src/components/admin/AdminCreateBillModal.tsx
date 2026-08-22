import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import type { StoredInvoice, InvoiceItem, InvoiceCustomerSnapshot } from "../../lib/invoice/types";
import { PalakInvoiceStore, roundCurrency } from "../../lib/invoice/invoiceStore";
import { useScrollLock } from "../../hooks/useScrollLock";
import {
  X,
  Plus,
  Trash2,
  Receipt,
  FileCheck,
  Eye,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface AdminCreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: StoredInvoice) => void;
  onPreviewInvoice?: (invoice: StoredInvoice) => void;
  existingCustomers?: { name: string; phone: string; email?: string; address?: string }[];
  draftToEdit?: StoredInvoice | null;
  adminName?: string;
}

const COMMON_UNITS = ["Pcs", "Copies", "Pages", "Sq.Ft", "Sets", "Books", "Nos", "Cards", "Sheets", "Banners"];
const GST_RATES = [0, 5, 12, 18, 28];

export const AdminCreateBillModal: React.FC<AdminCreateBillModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  onPreviewInvoice,
  existingCustomers = [],
  draftToEdit = null,
  adminName = "Admin Staff",
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);
  // Document Type
  const [documentType, setDocumentType] = useState<"TAX_INVOICE" | "RETAIL_BILL">(
    draftToEdit?.documentType || "TAX_INVOICE"
  );

  // Customer Mode & Fields
  const [customerMode, setCustomerMode] = useState<"new" | "existing">("new");
  const [customerName, setCustomerName] = useState(draftToEdit?.customerSnapshot?.name || "");
  const [customerPhone, setCustomerPhone] = useState(draftToEdit?.customerSnapshot?.phone || "");
  const [customerEmail, setCustomerEmail] = useState(draftToEdit?.customerSnapshot?.email || "");
  const [customerAddress, setCustomerAddress] = useState(
    draftToEdit?.customerSnapshot?.deliveryAddress?.street || ""
  );
  const [customerGstin, setCustomerGstin] = useState(draftToEdit?.customerSnapshot?.gstin || "");
  const [fulfillmentType, setFulfillmentType] = useState<string>(
    draftToEdit?.customerSnapshot?.fulfillmentType || "pickup"
  );

  // Items
  const [items, setItems] = useState<InvoiceItem[]>(
    draftToEdit?.items && draftToEdit.items.length > 0
      ? draftToEdit.items
      : [
          {
            id: "item_1",
            productName: "",
            description: "",
            quantity: 1,
            unit: "Pcs",
            unitPrice: 0,
            discount: 0,
            taxRate: 0,
            tax: 0,
            totalPrice: 0,
          },
        ]
  );

  // Payment
  const [paymentMode, setPaymentMode] = useState<string>(draftToEdit?.paymentMethod || "cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partially_paid">(
    (draftToEdit?.paymentStatus as any) || "paid"
  );
  const [customAmountPaid, setCustomAmountPaid] = useState<string>(
    draftToEdit?.amountPaid ? String(draftToEdit.amountPaid) : ""
  );

  // Notes
  const [notes, setNotes] = useState(draftToEdit?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Calculations
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const computedItems = items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitP = Math.max(0, Number(item.unitPrice) || 0);
      const disc = Math.max(0, Number(item.discount) || 0);
      const rate = Number(item.taxRate) || 0;

      const itemBase = roundCurrency(qty * unitP);
      const itemNet = Math.max(0, roundCurrency(itemBase - disc));
      const itemTax = rate > 0 ? roundCurrency((itemNet * rate) / 100) : 0;
      const lineTotal = roundCurrency(itemNet + itemTax);

      subtotal += itemBase;
      totalDiscount += disc;
      totalTax += itemTax;

      return {
        ...item,
        tax: itemTax,
        totalPrice: lineTotal,
      };
    });

    const taxableAmount = Math.max(0, roundCurrency(subtotal - totalDiscount));
    const grandTotal = Math.max(0, roundCurrency(taxableAmount + totalTax));

    let amountPaid = grandTotal;
    if (paymentStatus === "pending") {
      amountPaid = 0;
    } else if (paymentStatus === "partially_paid") {
      const parsedCustom = Number(customAmountPaid);
      amountPaid = !isNaN(parsedCustom) && parsedCustom >= 0 ? parsedCustom : roundCurrency(grandTotal / 2);
    } else if (customAmountPaid !== "") {
      amountPaid = Math.max(0, Number(customAmountPaid) || grandTotal);
    }

    const amountDue = Math.max(0, roundCurrency(grandTotal - amountPaid));

    return {
      computedItems,
      subtotal: roundCurrency(subtotal),
      discount: roundCurrency(totalDiscount),
      taxableAmount,
      taxAmount: roundCurrency(totalTax),
      grandTotal,
      amountPaid,
      amountDue,
    };
  }, [items, paymentStatus, customAmountPaid]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        productName: "",
        description: "",
        quantity: 1,
        unit: "Pcs",
        unitPrice: 0,
        discount: 0,
        taxRate: 0,
        tax: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSelectExistingCustomer = (custPhone: string) => {
    const found = existingCustomers.find((c) => c.phone === custPhone);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email || "");
      setCustomerAddress(found.address || "");
    }
  };

  const buildCustomerSnapshot = (): InvoiceCustomerSnapshot => {
    return {
      name: customerName.trim() || "Walk-in Customer",
      phone: customerPhone.trim(),
      email: customerEmail.trim() || undefined,
      fulfillmentType: fulfillmentType || "pickup",
      deliveryAddress: customerAddress.trim()
        ? { street: customerAddress.trim(), city: "Chakia", pincode: "845412" }
        : undefined,
      gstin: customerGstin.trim() || undefined,
    };
  };

  const handleSubmit = async (action: "DRAFT" | "ISSUE") => {
    setError(null);

    // Validation
    if (!customerName.trim()) {
      setError("Please enter customer name or select a customer.");
      return;
    }

    const hasValidItem = items.some((i) => i.productName.trim().length > 0 && i.unitPrice >= 0);
    if (!hasValidItem) {
      setError("Please add at least one item with a valid name and price.");
      return;
    }

    setSubmitting(true);
    try {
      const customer = buildCustomerSnapshot();
      const payload = {
        action,
        draftId: draftToEdit?.id,
        documentType,
        customer,
        items: calculatedTotals.computedItems,
        financials: {
          subtotal: calculatedTotals.subtotal,
          discount: calculatedTotals.discount,
          taxableAmount: calculatedTotals.taxableAmount,
          taxAmount: calculatedTotals.taxAmount,
          grandTotal: calculatedTotals.grandTotal,
        },
        paymentMode,
        paymentStatus,
        amountPaid: calculatedTotals.amountPaid,
        notes: notes.trim() || undefined,
        performedBy: adminName,
      };

      const res = await PalakInvoiceStore.createAdminBill(payload);
      if (res.success && res.invoice) {
        onInvoiceCreated(res.invoice);
        onClose();
      } else {
        setError(res.error || "Failed to create invoice");
      }
    } catch (e: any) {
      setError(e?.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = () => {
    const customer = buildCustomerSnapshot();
    const mockPreviewInvoice: StoredInvoice = {
      id: draftToEdit?.id || `preview_${Date.now()}`,
      invoiceNumber: draftToEdit?.invoiceNumber || "DRAFT (Unissued)",
      source: "ADMIN",
      documentType,
      financialYear: "2026-27",
      invoiceDate: new Date().toISOString(),
      completionDate: new Date().toISOString(),
      customerSnapshot: customer,
      businessSnapshot: {
        nameEn: "Palak Enterprises",
        nameHi: "पालक इंटरप्राइजेज",
        unitEn: "Palak Printing Press & Digital CSC Hub",
        unitHi: "पालक प्रिंटिंग प्रेस एवं डिजिटल सेवा केंद्र",
        taglineEn: "Printing & Digital Services, All in One Place",
        taglineHi: "आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह",
        ownerName: "Kumar Pankaj",
        ownerTitle: "Proprietor",
        primaryPhone: "+91 99052 38015",
        secondaryPhone: "+91 73249 64770",
        email: "support@palakenterprises.in",
        addressLine: "Ward No. 7, Saniganj Mohalla, Near Block Gate",
        city: "Chakia",
        district: "East Champaran",
        state: "Bihar",
        pincode: "845412",
        fullAddressEn: "Ward No. 7, Saniganj Mohalla, Near Block Gate, Chakia, East Champaran, Bihar - 845412",
        cscId: "634165120013",
        udyamNo: "UDYAM-BR-11-0061705",
        gstin: "10BRKPK1234F1Z5",
        logoUrl: "/logo.webp",
        terms: [
          "1. This is a computer generated invoice and does not require physical signature.",
          "2. Goods/prints once inspected and delivered will not be returned.",
          "3. Online services fees are non-refundable once portal filing is initiated.",
          "4. Jurisdiction for disputes: Chakia / Motihari, East Champaran, Bihar.",
        ],
      },
      items: calculatedTotals.computedItems,
      subtotalAmount: calculatedTotals.subtotal,
      discountAmount: calculatedTotals.discount,
      taxableAmount: calculatedTotals.taxableAmount,
      taxAmount: calculatedTotals.taxAmount,
      deliveryFee: 0,
      otherCharges: 0,
      totalAmount: calculatedTotals.grandTotal,
      amountPaid: calculatedTotals.amountPaid,
      amountDue: calculatedTotals.amountDue,
      paymentStatus,
      paymentMethod: paymentMode,
      status: "DRAFT",
      createdBy: adminName,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onPreviewInvoice) {
      onPreviewInvoice(mockPreviewInvoice);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={draftToEdit ? "Edit Bill / Draft" : "Create Professional A4 Bill"}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative flex flex-col w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] md:max-h-[min(94vh,940px)] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Modal Top Bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#123B70] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                {draftToEdit ? "Edit Bill / Draft" : "Create Professional A4 Bill"}
              </h3>
              <p className="text-[11px] text-blue-200">
                Palak Enterprises Custom Bill & Official Tax Invoice Engine
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Scrollable Form Body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 bg-slate-50">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Document Type & Customer Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Document Type Switcher */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Document Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDocumentType("TAX_INVOICE")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer",
                    documentType === "TAX_INVOICE"
                      ? "bg-[#123B70] text-white border-[#123B70] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType("RETAIL_BILL")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer",
                    documentType === "RETAIL_BILL"
                      ? "bg-[#123B70] text-white border-[#123B70] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Retail Bill
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {documentType === "TAX_INVOICE"
                  ? "Standard Tax Invoice with GST / HSN breakdown."
                  : "Simple Retail Cash / Counter Receipt."}
              </p>
            </div>

            {/* Customer Details */}
            <div className="lg:col-span-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Customer Information
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      checked={customerMode === "new"}
                      onChange={() => setCustomerMode("new")}
                      className="text-[#123B70]"
                    />
                    <span>New Customer</span>
                  </label>
                  {existingCustomers.length > 0 && (
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={customerMode === "existing"}
                        onChange={() => setCustomerMode("existing")}
                        className="text-[#123B70]"
                      />
                      <span>Select Existing</span>
                    </label>
                  )}
                </div>
              </div>

              {customerMode === "existing" && existingCustomers.length > 0 ? (
                <div className="space-y-2">
                  <select
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                  >
                    <option value="">-- Choose Customer --</option>
                    {existingCustomers.map((c, i) => (
                      <option key={i} value={c.phone}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Customer Name *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Phone Number (10 digits)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address (optional)"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Address / Delivery Location (optional)"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Customer GSTIN (optional)"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                    />
                  </div>
                  <div>
                    <select
                      value={fulfillmentType}
                      onChange={(e) => setFulfillmentType(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white cursor-pointer"
                    >
                      <option value="pickup">Store Pickup (Chakia Shop)</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Itemized Line Items Table */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Bill Line Items
                </h4>
                <p className="text-[10px] text-slate-500">
                  Add products, printing services, or custom service entries
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#123B70] text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-50">
                    <th className="py-2 px-2">Item Name *</th>
                    <th className="py-2 px-2">Description / Specs</th>
                    <th className="py-2 px-2 w-20 text-center">Qty</th>
                    <th className="py-2 px-2 w-24">Unit</th>
                    <th className="py-2 px-2 w-24 text-right">Price (₹)</th>
                    <th className="py-2 px-2 w-20 text-right">Disc (₹)</th>
                    <th className="py-2 px-2 w-20 text-right">GST %</th>
                    <th className="py-2 px-2 w-24 text-right">Total (₹)</th>
                    <th className="py-2 px-1.5 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item, idx) => {
                    const computed = calculatedTotals.computedItems[idx] || item;
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            placeholder="e.g. A4 Color Print, Flex Banner"
                            value={item.productName}
                            onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            placeholder="e.g. 100 GSM, Matte Lamination"
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white text-center font-bold"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.unit || "Pcs"}
                            onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-300 bg-white cursor-pointer"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white text-right font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.discount || 0}
                            onChange={(e) => handleItemChange(idx, "discount", parseFloat(e.target.value) || 0)}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white text-right font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.taxRate || 0}
                            onChange={(e) => handleItemChange(idx, "taxRate", parseInt(e.target.value) || 0)}
                            className="w-full text-xs px-1 py-1 rounded border border-slate-300 bg-white text-right cursor-pointer"
                          >
                            {GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black text-slate-900">
                          ₹{computed.totalPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Payment Details & Totals Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Details */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Payment & Fulfillment
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold cursor-pointer"
                  >
                    <option value="cash">Cash (Counter)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="card">Card / POS</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="pay_at_store">Pay at Store (Pending)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e: any) => setPaymentStatus(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold cursor-pointer"
                  >
                    <option value="paid">PAID (Full)</option>
                    <option value="pending">PENDING (Due)</option>
                    <option value="partially_paid">PARTIALLY PAID</option>
                  </select>
                </div>

                {paymentStatus === "partially_paid" && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Custom Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      value={customAmountPaid}
                      onChange={(e) => setCustomAmountPaid(e.target.value)}
                      placeholder={`Default ₹${(calculatedTotals.grandTotal / 2).toFixed(2)}`}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Billing Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions or bill notes..."
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Live Financial Totals */}
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
                  Invoice Financial Summary
                </h4>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{calculatedTotals.subtotal.toFixed(2)}</span>
                  </div>

                  {calculatedTotals.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-mono">-₹{calculatedTotals.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-300">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">₹{calculatedTotals.taxableAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>GST / Tax:</span>
                    <span className="font-mono">₹{calculatedTotals.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-sm font-black bg-[#123B70] p-2 rounded-lg">
                  <span className="text-amber-300">GRAND TOTAL:</span>
                  <span className="font-mono text-base tracking-tight text-white">
                    ₹{calculatedTotals.grandTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-400 px-1">
                  <span>Amount Paid:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    ₹{calculatedTotals.amountPaid.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-400 px-1">
                  <span>Balance Due:</span>
                  <span className={cn("font-mono font-bold", calculatedTotals.amountDue > 0 ? "text-amber-400" : "text-slate-300")}>
                    ₹{calculatedTotals.amountDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Modal Footer Action Bar ───────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-slate-600" />
              <span>Preview A4 Bill</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("DRAFT")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-amber-700" />
              <span>Save Draft</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("ISSUE")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileCheck className="h-4 w-4 text-amber-400" />
              <span>{submitting ? "Allocating Number..." : "Generate & Issue Invoice"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminCreateBillModal;
