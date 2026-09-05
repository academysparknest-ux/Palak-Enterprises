import React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Package,
  Clock,
  MapPin,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Building,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import type { StoredOrder } from "../../lib/storage/store";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useLanguage } from "../../context/LanguageContext";
import { getWhatsAppLink } from "../../config/business";
import { cn } from "../../lib/utils";
import { isOrderPaidOnline, extractRazorpayId, getQueueClassification } from "../../lib/queue";
import { OrderItemsSummaryList } from "../orders/OrderItemsSummaryList";

export interface CustomerOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: StoredOrder | null;
  onOpenInvoice?: (orderCode: string) => void;
}

export const CustomerOrderDetailModal: React.FC<CustomerOrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenInvoice,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  useScrollLock(isOpen);

  if (!isOpen || !order) return null;

  const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "paid" || isOrderPaidOnline(order);
  const qMeta = getQueueClassification(order);
  const isPriority = qMeta.queuePriority === 1;
  const rzpId = extractRazorpayId(order.orderNotes);
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const isCompleted = order.orderStatus === "COMPLETED";
  const isReady = (order.orderStatus as string) === "READY_FOR_PICKUP" || (order.orderStatus as string) === "READY";
  const isEligibleForBill = isCompleted || isReady || Boolean((order as any).invoice || (order as any).invoiceNumber);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? "Recently"
        : d.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
    } catch {
      return "Recently";
    }
  };

  const getCustomerFriendlyStatus = (status: string) => {
    switch (status) {
      case "NEW":
        return {
          label: currentLang === "hi" ? "ऑर्डर प्राप्त हुआ" : "Order Received",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          step: 1,
        };
      case "UNDER_REVIEW":
        return {
          label: currentLang === "hi" ? "समीक्षाधीन" : "Under Review",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          step: 2,
        };
      case "CONFIRMED":
        return {
          label: currentLang === "hi" ? "ऑर्डर स्वीकृत" : "Order Confirmed",
          color: "bg-teal-50 text-teal-800 border-teal-200",
          step: 2,
        };
      case "IN_PRODUCTION":
      case "PROCESSING":
      case "DESIGN_REVIEW":
        return {
          label: currentLang === "hi" ? "प्रिंटिंग जारी" : "Being Prepared",
          color: "bg-indigo-50 text-indigo-800 border-indigo-200",
          step: 3,
        };
      case "READY_FOR_PICKUP":
      case "READY":
        return {
          label: currentLang === "hi" ? "पिकअप के लिए तैयार" : "Ready for Pickup",
          color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-black",
          step: 4,
        };
      case "OUT_FOR_DELIVERY":
        return {
          label: currentLang === "hi" ? "डिलीवरी के लिए रवाना" : "Out for Delivery",
          color: "bg-sky-50 text-sky-800 border-sky-200",
          step: 4,
        };
      case "COMPLETED":
        return {
          label: currentLang === "hi" ? "पूर्ण (तैयार)" : "Completed",
          color: "bg-emerald-100 text-emerald-950 border-emerald-400 font-bold",
          step: 5,
        };
      case "CANCELLED":
      case "REJECTED":
        return {
          label: currentLang === "hi" ? "रद्द" : "Cancelled",
          color: "bg-rose-50 text-rose-800 border-rose-200",
          step: 0,
        };
      default:
        return {
          label: status,
          color: "bg-slate-100 text-slate-800 border-slate-200",
          step: 1,
        };
    }
  };

  const statusInfo = getCustomerFriendlyStatus(order.orderStatus || "NEW");

  const timelineSteps = [
    { num: 1, title: currentLang === "hi" ? "प्राप्त हुआ" : "Received" },
    { num: 2, title: currentLang === "hi" ? "स्वीकृत" : "Confirmed" },
    { num: 3, title: currentLang === "hi" ? "प्रिंटिंग" : "Printing" },
    { num: 4, title: currentLang === "hi" ? "तैयार" : "Ready" },
    { num: 5, title: currentLang === "hi" ? "पूर्ण" : "Completed" },
  ];

  const paymentMethodLabel = (method?: string) => {
    switch (method) {
      case "pay_at_shop":
      case "pay_at_store":
        return currentLang === "hi" ? "दुकान काउंटर पर भुगतान" : "Pay at Shop Counter";
      case "upi_online":
      case "pay_online":
        return currentLang === "hi" ? "ऑनलाइन UPI भुगतान" : "UPI / Online Payment";
      case "pay_after_confirmation":
        return currentLang === "hi" ? "प्रूफ पुष्टि के बाद भुगतान" : "Pay After Proof Approval";
      default:
        return method ? method.replace(/_/g, " ") : "Pay at Counter";
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#123B70] text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-black text-amber-300 text-sm sm:text-base bg-amber-400/20 px-2.5 py-0.5 rounded-lg border border-amber-300/30">
                {order.orderCode}
              </span>
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full border shadow-xs", statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-200 flex items-center gap-1.5 pt-1">
              <Clock className="h-3.5 w-3.5 text-amber-300" />
              <span>{currentLang === "hi" ? "ऑर्डर दिनांक:" : "Ordered on:"} {formatDateTime(order.createdAt)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
          {/* Priority Queue Banner for Paid Online Orders */}
          {isPriority && (
            <div className="bg-amber-500/10 border border-amber-400/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  🔥
                </div>
                <div>
                  <span className="font-black text-amber-950 block text-xs">
                    {currentLang === "hi" ? "प्राथमिकता प्रिंटिंग कतार (Level 1 Express Priority)" : "Express Priority Queue (Level 1)"}
                  </span>
                  <p className="text-[11px] text-amber-900 font-medium">
                    {currentLang === "hi"
                      ? "सत्यापित ऑनलाइन भुगतान: आपका ऑर्डर सीधे प्राथमिकता कतार में है और सबसे पहले प्रिंट किया जाएगा।"
                      : "Verified Online Payment: Your order jumps ahead in queue and is printed with express priority."}
                  </p>
                </div>
              </div>
              <span className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                {currentLang === "hi" ? "प्राथमिकता" : "PRIORITY"}
              </span>
            </div>
          )}

          {/* Progress Timeline */}
          {statusInfo.step > 0 && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                {currentLang === "hi" ? "ऑर्डर प्रगति स्थिति" : "Order Lifecycle Progress"}
              </span>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {timelineSteps.map((step) => {
                  const isCurrent = statusInfo.step === step.num;
                  const isPassed = statusInfo.step >= step.num;
                  return (
                    <div key={step.num} className="space-y-1">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          isCurrent
                            ? "bg-amber-500 ring-2 ring-amber-300/50"
                            : isPassed
                            ? "bg-emerald-600"
                            : "bg-slate-200"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] block truncate font-medium",
                          isCurrent
                            ? "font-bold text-amber-700"
                            : isPassed
                            ? "text-emerald-800"
                            : "text-slate-400"
                        )}
                      >
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ordered Items & Add-ons List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-[#123B70]" />
              <span>{currentLang === "hi" ? "ऑर्डर की गई सामग्री एवं ऐड-ऑन्स" : "Ordered Items & Add-ons"}</span>
            </h3>

            <OrderItemsSummaryList
              items={itemsList}
              rootPrintSnapshot={order.printSnapshot}
              currentLang={currentLang}
            />
          </div>

          {/* Fulfillment & Collection Details */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-[#123B70]" />
              <span>{currentLang === "hi" ? "प्राप्ति एवं संग्रह विवरण" : "Fulfillment & Store Collection"}</span>
            </h3>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#123B70] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    {order.fulfillmentType === "delivery"
                      ? currentLang === "hi" ? "होम डिलीवरी" : "Home Delivery"
                      : currentLang === "hi" ? "दुकान से संग्रह (Store Pickup)" : "Store Counter Pickup"}
                  </span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {order.fulfillmentType === "delivery"
                      ? `${order.deliveryAddress?.street || ""}, ${order.deliveryAddress?.city || "Chakia"} - ${order.deliveryAddress?.pincode || "845412"}`
                      : "Palak Enterprises, Near Block Gate, Chakia, East Champaran, Bihar"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financials & Payment Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#123B70]" />
              <span>{currentLang === "hi" ? "भुगतान एवं बिल सारांश" : "Payment & Billing Summary"}</span>
            </h3>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-100 pb-3">
                <div className="flex justify-between">
                  <span>{currentLang === "hi" ? "उप-योग (Subtotal)" : "Subtotal"}</span>
                  <span className="font-medium text-slate-900">₹{order.subtotalAmount ?? order.totalAmount}</span>
                </div>
                {Boolean(order.discountAmount) && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>{currentLang === "hi" ? "छूट (Discount)" : "Discount"}</span>
                    <span>-₹{order.discountAmount}</span>
                  </div>
                )}
                {Boolean(order.deliveryFee) && (
                  <div className="flex justify-between">
                    <span>{currentLang === "hi" ? "डिलीवरी शुल्क" : "Delivery Fee"}</span>
                    <span className="font-medium text-slate-900">₹{order.deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-dashed border-slate-200">
                  <span>{currentLang === "hi" ? "कुल राशि (Grand Total)" : "Grand Total"}</span>
                  <span className="font-mono text-base">₹{order.totalAmount}</span>
                </div>
              </div>

              {/* Payment Method & Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-500">{currentLang === "hi" ? "भुगतान विधि:" : "Payment Mode:"}</span>
                  <p className="font-bold text-slate-900">
                    {isPaid && (order.paymentMethod === "upi_online" || order.paymentMethod === "pay_online" || isOrderPaidOnline(order))
                      ? (currentLang === "hi" ? "ऑनलाइन UPI भुगतान (Razorpay)" : "UPI / Online Payment (Razorpay)")
                      : paymentMethodLabel(order.paymentMethod)}
                  </p>
                  {rzpId && (
                    <div className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                      Razorpay ID: {rzpId}
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right space-y-0.5">
                  <span className="text-slate-500">{currentLang === "hi" ? "भुगतान स्थिति:" : "Payment Status:"}</span>
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span
                      className={cn(
                        "font-black px-2.5 py-0.5 rounded-full text-xs uppercase inline-flex items-center gap-1",
                        isPaid
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      )}
                    >
                      {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>{isPaid ? (currentLang === "hi" ? "सत्यापित (PAID)" : "PAID") : (currentLang === "hi" ? "लंबित (UNPAID)" : "UNPAID")}</span>
                    </span>
                  </div>
                  {!isPaid && (
                    <span className="text-[11px] font-bold text-rose-700 block">
                      {currentLang === "hi" ? `देय राशि: ₹${order.totalAmount}` : `Amount Due: ₹${order.totalAmount}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <a
            href={getWhatsAppLink(`Hi Palak Enterprises, I have an inquiry about my Order #${order.orderCode}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>{currentLang === "hi" ? "सहायता व्हाट्सएप" : "Need Help?"}</span>
          </a>

          <div className="flex flex-wrap items-center gap-2">
            {isEligibleForBill && onOpenInvoice && (
              <button
                type="button"
                onClick={() => onOpenInvoice(order.orderCode)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-[#123B70] hover:bg-[#0c274c] px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>{currentLang === "hi" ? "बिल देखें / प्रिंट करें" : "View / Download Bill"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              {currentLang === "hi" ? "बंद करें" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default CustomerOrderDetailModal;
