import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Sparkles, Eye, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { type LocalProduct } from "../../lib/storage/catalogData";
import { getWhatsAppLink } from "../../config/business";

interface CardProductCardProps {
  product: LocalProduct;
  onOpenQuoteModal: (product: LocalProduct) => void;
  onOpenSampleModal?: (product: LocalProduct) => void;
}

export const CardProductCard: React.FC<CardProductCardProps> = ({
  product,
  onOpenQuoteModal,
  onOpenSampleModal,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const price = product.pricePerCard || (product.startingPrice > 500 ? Math.round(product.startingPrice / 100) : product.startingPrice);
  const minQty = product.minimumQuantity || product.baseQuantity || 100;

  // WhatsApp Inquiry Template
  const waMsg = `Hello Palak Enterprises, I am interested in your Invitation Card:
*Product:* ${product.name.en}
*SKU:* ${product.sku || product.id}
*Card Type:* ${product.cardType || "Ceremony Card"}
*Price:* Approx ₹${price}/card (Min: ${minQty} pcs)

Please provide pricing for customized printing with Sanskrit/Hindi text and available finish options.`;

  const waUrl = getWhatsAppLink(waMsg);

  return (
    <div className="group relative rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col justify-between gold-foil-sheen interactive-card">
      {/* Top Media Viewport */}
      <div>
        <div className="relative aspect-4/3 w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 overflow-hidden border border-slate-100 flex items-center justify-center p-2">
          {/* Main Visual Image with Graceful SVG / WebP rendering */}
          <img
            src={product.imageUrl}
            alt={product.name[currentLang]}
            loading="lazy"
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500 will-change-transform"
          />

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {product.sku && (
              <span className="rounded-md bg-slate-950/80 backdrop-blur-md text-amber-300 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border border-white/10">
                {product.sku}
              </span>
            )}
            {product.isNew && (
              <span className="rounded-md bg-[#881337] text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
                New Design
              </span>
            )}
          </div>

          {/* Quick View Button Hover Overlay */}
          <Link
            to={`/wedding-events/${product.slug}`}
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-3xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label={`View details for ${product.name[currentLang]}`}
          >
            <span className="rounded-xl bg-white/95 text-slate-900 px-4 py-2 text-xs font-extrabold shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
              <Eye className="h-3.5 w-3.5 text-[#881337]" />
              <span>{currentLang === "hi" ? "विवरण देखें" : "View Showroom Card"}</span>
            </span>
          </Link>
        </div>

        {/* Card Header & Content */}
        <div className="mt-3.5 space-y-1.5">
          {/* Card format & Occasion Tag */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#881337] capitalize">
              {product.occasion ? `${product.occasion} • ` : ""}
              {product.cardType?.replace("_", " ") || "Invitation"}
            </span>
            <span className="text-slate-400 text-[10px] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>{minQty} Min Qty</span>
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-[#881337] transition-colors">
            <Link to={`/wedding-events/${product.slug}`}>
              {product.name[currentLang]}
            </Link>
          </h3>

          {/* Short description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.shortDesc[currentLang]}
          </p>
        </div>
      </div>

      {/* Pricing & Conversion CTAs */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        {/* Price & Minimum Batch Info */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {currentLang === "hi" ? "अनुमानित मूल्य" : "Showroom Price"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900">
                ₹{price}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ card</span>
              {product.mrp && product.mrp > price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.mrp}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">
              {currentLang === "hi" ? "100 कार्ड सेट" : "Est. 100 pcs"}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              ₹{price * 100}
            </span>
          </div>
        </div>

        {/* Action Buttons: Details & WhatsApp */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenQuoteModal(product)}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#881337] hover:bg-[#700f2d] text-white py-2 px-1.5 xs:px-2 text-[11px] xs:text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="truncate">{currentLang === "hi" ? "ऑर्डर पूछताछ" : "Inquire Now"}</span>
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-2 px-1.5 xs:px-2 text-[11px] xs:text-xs font-bold transition-colors cursor-pointer"
            title="Chat about this card on WhatsApp"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Sample link if available */}
        {product.sampleAvailable !== false && onOpenSampleModal && (
          <button
            type="button"
            onClick={() => onOpenSampleModal(product)}
            className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-[#881337] hover:underline cursor-pointer"
          >
            {currentLang === "hi" ? "दुकान में सैंपल देखने का अनुरोध करें" : "Request Sample / Store Viewing →"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CardProductCard;
