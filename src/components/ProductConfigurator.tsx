import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Sparkles, Check, MessageSquare } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { FileUploadZone } from "./FileUploadZone";
import { AnimatedPrice } from "./ui/motion/AnimatedPrice";
import { getWhatsAppLink } from "../config/business";
import type { LocalProduct, ProductOption } from "../lib/storage/catalogData";
import { cn } from "../lib/utils";

interface ProductConfiguratorProps {
  product: LocalProduct;
}

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({ product }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { addItem } = useCart();
  const navigate = useNavigate();

  // Initialize state with default options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.options.forEach((opt) => {
      const def = opt.values.find((v) => v.isDefault) || opt.values[0];
      if (def) initial[opt.key] = def.key;
    });
    return initial;
  });

  const [designChoice, setDesignChoice] = useState<"upload" | "need_assistance">("upload");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [designNotes, setDesignNotes] = useState("");
  const [addedNotice, setAddedNotice] = useState(false);

  // Dynamic price calculation
  const calculatedPricing = useMemo(() => {
    let price = product.startingPrice;
    let multiplier = 1.0;
    let flatAddons = 0;

    product.options.forEach((opt) => {
      const selectedKey = selectedOptions[opt.key];
      const val = opt.values.find((v) => v.key === selectedKey);
      if (val) {
        if (val.multiplier) multiplier *= val.multiplier;
        if (val.priceModifier) flatAddons += val.priceModifier;
      }
    });

    // Design assistance flat fee if selected
    const designFee = designChoice === "need_assistance" ? 150 : 0;

    const subtotal = Math.round(price * multiplier + flatAddons + designFee);

    // Find selected quantity
    const qtyOptionKey = selectedOptions["quantity"];
    const qtyNum = qtyOptionKey ? parseInt(qtyOptionKey, 10) || product.baseQuantity : product.baseQuantity;

    const unitPrice = Number((subtotal / (qtyNum || 1)).toFixed(2));

    return {
      total: subtotal,
      unitPrice,
      qtyNum,
    };
  }, [product, selectedOptions, designChoice]);

  const handleOptionChange = (optionKey: string, valueKey: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionKey]: valueKey,
    }));
  };

  const handleAddToCart = () => {
    // Generate label summary for cart display
    const labels: Record<string, string> = {};
    product.options.forEach((opt) => {
      const selKey = selectedOptions[opt.key];
      const val = opt.values.find((v) => v.key === selKey);
      if (val) {
        labels[opt.name[currentLang]] = val.label[currentLang];
      }
    });

    addItem({
      productId: product.id,
      productName: product.name[currentLang],
      quantity: 1, // 1 pack / order item of specified configured quantity
      unitPrice: calculatedPricing.total,
      totalPrice: calculatedPricing.total,
      selectedOptions,
      selectedOptionsLabels: labels,
      uploadedFileName: uploadedFile?.name,
      uploadedFileUrl: uploadedFile?.url,
      designAssistanceRequested: designChoice === "need_assistance",
      designNotes: designChoice === "need_assistance" ? designNotes : undefined,
      imageUrl: product.imageUrl,
      unit: `${calculatedPricing.qtyNum} ${product.unit}`,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/checkout");
  };

  const whatsappInquiryUrl = getWhatsAppLink(
    `Hello Palak Enterprises, I am inquiring about *${product.name.en}* with options: ${JSON.stringify(
      selectedOptions
    )} (Estimated: ₹${calculatedPricing.total})`
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card space-y-6">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {currentLang === "hi" ? "कस्टम कॉन्फ़िगरेशन" : "Custom Configuration"}
          </span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "थोक छूट लागू" : "Bulk Rate Applied"}</span>
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <AnimatedPrice
            value={calculatedPricing.total}
            className="text-3xl font-extrabold text-slate-900"
          />
          <span className="text-xs text-slate-500">
            ({calculatedPricing.qtyNum} {product.unit} @ ₹{calculatedPricing.unitPrice}/{product.unit})
          </span>
        </div>
      </div>

      {/* Option Groups */}
      <div className="space-y-5">
        {product.options.map((option: ProductOption) => (
          <div key={option.key} className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{option.name[currentLang]}</span>
              <span className="text-[11px] font-normal text-slate-400">
                {option.values.find((v) => v.key === selectedOptions[option.key])?.label[currentLang]}
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {option.values.map((val) => {
                const isSelected = selectedOptions[option.key] === val.key;
                return (
                  <button
                    key={val.key}
                    type="button"
                    onClick={() => handleOptionChange(option.key, val.key)}
                    className={cn(
                      "flex flex-col items-start justify-center p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer",
                      isSelected
                        ? "border-[#123B70] bg-blue-50/60 font-bold text-[#123B70] ring-1 ring-[#123B70]"
                        : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{val.label[currentLang]}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#123B70] shrink-0 ml-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Design Choice: Upload Artwork vs Design Assistance */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-800">
          {currentLang === "hi" ? "आर्टवर्क / डिज़ाइन विकल्प" : "Artwork & Design Selection"}
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDesignChoice("upload")}
            className={cn(
              "p-3 rounded-xl border text-left text-xs transition-all cursor-pointer",
              designChoice === "upload"
                ? "border-[#123B70] bg-blue-50/60 font-bold text-[#123B70] ring-1 ring-[#123B70]"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
            )}
          >
            <div className="font-bold">{currentLang === "hi" ? "मेरे पास डिज़ाइन है" : "Upload Ready Design"}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{currentLang === "hi" ? "कोई अतिरिक्त शुल्क नहीं (फ्री)" : "Free (PDF, Corel, JPG)"}</div>
          </button>

          <button
            type="button"
            onClick={() => setDesignChoice("need_assistance")}
            className={cn(
              "p-3 rounded-xl border text-left text-xs transition-all cursor-pointer",
              designChoice === "need_assistance"
                ? "border-amber-500 bg-amber-50/70 font-bold text-amber-900 ring-1 ring-amber-500"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
            )}
          >
            <div className="font-bold">{currentLang === "hi" ? "डिज़ाइन बनवाना है" : "Need Palak Design Help"}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">+₹150 {currentLang === "hi" ? "(प्रोफेशनल ग्राफिक)" : "(Custom artwork)"}</div>
          </button>
        </div>

        {designChoice === "upload" ? (
          <FileUploadZone
            selectedFile={uploadedFile}
            onFileSelect={setUploadedFile}
            helperText="Upload print-ready PDF, CorelDraw CDR, PNG or high-res JPG"
          />
        ) : (
          <div className="space-y-2">
            <textarea
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder={
                currentLang === "hi"
                  ? "डिज़ाइन में क्या लिखना है (नाम, पता, फोन नंबर, लोगो का विवरण यहाँ लिखें)..."
                  : "Type text content, phone numbers, addresses, or instructions for our designer..."
              }
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-[#123B70] focus:outline-hidden"
            />
            <FileUploadZone
              selectedFile={uploadedFile}
              onFileSelect={setUploadedFile}
              label={currentLang === "hi" ? "लोगो / रफ़ स्केच अपलोड करें (वैकल्पिक)" : "Attach Logo / Rough sketch (optional)"}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {addedNotice && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-xs font-bold text-emerald-800 animate-fadeUp flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>
              {currentLang === "hi" ? "कार्ट में सफलतापूर्वक जोड़ा गया!" : "Added to Cart successfully!"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#123B70] bg-white py-3 text-xs sm:text-sm font-bold text-[#123B70] hover:bg-blue-50/60 transition-all cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{currentLang === "hi" ? "कार्ट में जोड़ें" : "Add to Cart"}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>{currentLang === "hi" ? "अभी ऑर्डर करें" : "Order Now"}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/70 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>{currentLang === "hi" ? "व्हाट्सएप पर बात करें" : "WhatsApp Inquiry"}</span>
          </a>

          <button
            type="button"
            onClick={() => navigate("/request-quote")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span>{currentLang === "hi" ? "बल्क कोटेशन लें" : "Request Bulk Quote"}</span>
          </button>
        </div>
      </div>

      {/* Trust reassurance */}
      <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{currentLang === "hi" ? "प्रिंटिंग से पहले डिज़ाइन प्रूफ़ भेजा जाएगा" : "Design proof verified before final printing"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{currentLang === "hi" ? "दुकान पर आकर अथवा स्थानीय डिलीवरी उपलब्ध" : "Store pickup in Chakia or local delivery"}</span>
        </div>
      </div>
    </div>
  );
};
