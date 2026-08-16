import React from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { LocalProduct } from "../lib/storage/catalogData";
import { cn } from "../lib/utils";

interface ProductCardProps {
  product: LocalProduct;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, className }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg",
        className
      )}
    >
      <div>
        {/* Product Image & Badges */}
        <div className="relative mb-3.5 aspect-4/3 w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-3">
          <img
            src={product.imageUrl}
            alt={product.name[currentLang]}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            {product.isPopular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs backdrop-blur-xs">
                <Sparkles className="h-3 w-3" />
                <span>{currentLang === "hi" ? "लोकप्रिय" : "Popular"}</span>
              </span>
            )}
            {product.isNew && (
              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                {currentLang === "hi" ? "नया" : "New"}
              </span>
            )}
          </div>
        </div>

        {/* Product Meta */}
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{product.turnaroundTime[currentLang]}</span>
          </span>
          <span>•</span>
          <span>Min: {product.baseQuantity} {product.unit}</span>
        </div>

        <h3 className="font-display text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#123B70] transition-colors">
          {product.name[currentLang]}
        </h3>

        <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {product.shortDesc[currentLang]}
        </p>
      </div>

      {/* Pricing & CTA */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[11px] text-slate-400 block">
            {currentLang === "hi" ? "शुरुआती मूल्य" : "Starting from"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-extrabold text-slate-900">
              ₹{product.startingPrice}
            </span>
            <span className="text-[11px] text-slate-500">
              /{product.baseQuantity} {product.unit}
            </span>
          </div>
        </div>

        <Link
          to={`/printing/${product.slug}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#0c274c] hover:shadow-md cursor-pointer shrink-0"
        >
          <span>{currentLang === "hi" ? "ऑर्डर करें" : "Customize"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
