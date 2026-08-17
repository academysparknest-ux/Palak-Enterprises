import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Printer,
  CheckCircle2,
  Share2,
  Eye,
  Layers,
  FileCheck,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { CardQuoteModal } from "../components/wedding/CardQuoteModal";
import { CardSampleModal } from "../components/wedding/CardSampleModal";
import { CardProductCard } from "../components/wedding/CardProductCard";
import { getWhatsAppLink } from "../config/business";
import { SEO } from "../components/SEO";

export const WeddingCardDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const product = PalakDataStore.getWeddingCardBySlug(slug || "") || PalakDataStore.getProductBySlug(slug || "");

  const [activeImage, setActiveImage] = useState<string>(product?.imageUrl || "");
  const [selectedTierQty, setSelectedTierQty] = useState<number>(100);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!product) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FCFBF7] px-4 py-20">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-md">
          <div className="h-16 w-16 rounded-full bg-rose-50 text-[#881337] flex items-center justify-center mx-auto text-2xl font-bold">
            🪔
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {currentLang === "hi" ? "कार्ड नहीं मिला" : "Card Invitation Not Found"}
          </h2>
          <p className="text-xs text-slate-500">
            The requested card design may have been updated or relocated in our catalogue.
          </p>
          <Link
            to="/wedding-events"
            className="inline-flex items-center gap-2 rounded-xl bg-[#881337] text-white px-6 py-2.5 text-xs font-bold shadow-xs hover:bg-[#700f2d]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Wedding & Events Catalogue</span>
          </Link>
        </div>
      </div>
    );
  }

  const images = product.galleryUrls && product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl];
  const price = product.pricePerCard || (product.startingPrice > 500 ? Math.round(product.startingPrice / 100) : product.startingPrice);
  const minQty = product.minimumQuantity || product.baseQuantity || 100;

  // Quantity pricing tiers calculation
  const quantityTiers = [
    { qty: 50, ratePerCard: Math.round(price * 1.15), total: Math.round(price * 1.15 * 50) },
    { qty: 100, ratePerCard: price, total: price * 100, isPopular: true },
    { qty: 200, ratePerCard: Math.max(price - 1, 6), total: Math.max(price - 1, 6) * 200 },
    { qty: 300, ratePerCard: Math.max(price - 2, 5.5), total: Math.round(Math.max(price - 2, 5.5) * 300) },
    { qty: 500, ratePerCard: Math.max(price - 3, 5), total: Math.max(price - 3, 5) * 500, isBestValue: true },
  ];

  const currentTier = quantityTiers.find((t) => t.qty === selectedTierQty) || quantityTiers[1];

  // Related cards (same occasion or style)
  const relatedCards = PalakDataStore.getWeddingCards()
    .filter((c) => c.id !== product.id && (c.occasion === product.occasion || c.style === product.style))
    .slice(0, 3);

  const waDetailMsg = `Hello Palak Enterprises, I am inquiring about the following Invitation Card from your showroom:
*Product:* ${product.name.en}
*SKU:* ${product.sku || product.id}
*Card Type:* ${product.cardType || "N/A"}
*Selected Quantity:* ${selectedTierQty} Cards (Est. Total: ₹${currentTier.total})

I would like to discuss:
- Custom Hindi / Sanskrit Shloka text printing
- Gold foil stamping / color options
- Turnaround time for delivery/collection in Chakia`;

  const waDetailUrl = getWhatsAppLink(waDetailMsg);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] pb-24">
      <SEO
        title={{
          en: `${product.name.en} (${product.sku || ""}) | Palak Enterprises`,
          hi: `${product.name.hi} (${product.sku || ""}) | पालक इंटरप्राइजेज`,
        }}
        description={{
          en: product.shortDesc.en,
          hi: product.shortDesc.hi,
        }}
      />

      {/* Breadcrumbs Navigation Bar */}
      <div className="border-b border-[#E8E1D5] bg-white py-3.5 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 overflow-hidden">
            <Link to="/" className="hover:text-slate-900 shrink-0">Home</Link>
            <span>/</span>
            <Link to="/wedding-events" className="hover:text-slate-900 shrink-0">Wedding & Events</Link>
            <span>/</span>
            <span className="font-bold text-[#881337] truncate">{product.name[currentLang]}</span>
          </div>

          <button
            onClick={() => navigate("/wedding-events")}
            className="hover:text-[#881337] flex items-center gap-1 font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Showroom</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-12">
        {/* Main Product Presentation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Media Gallery Viewport */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm">
              {/* Active Image Canvas */}
              <div className="relative aspect-4/3 w-full rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden flex items-center justify-center p-4 border border-slate-100">
                <img
                  src={activeImage || product.imageUrl}
                  alt={product.name[currentLang]}
                  className="h-full w-full object-contain transition-all duration-300"
                />

                {/* SKU Badge */}
                {product.sku && (
                  <div className="absolute top-3 left-3 rounded-lg bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-xs font-mono font-bold text-amber-300 border border-white/10">
                    {product.sku}
                  </div>
                )}
              </div>

              {/* Thumbnail selector */}
              {images.length > 1 && (
                <div className="mt-4 flex items-center gap-3">
                  {images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`h-16 w-16 sm:h-20 sm:w-20 rounded-xl border p-1 bg-slate-900 transition-all cursor-pointer overflow-hidden ${
                        (activeImage || product.imageUrl) === img
                          ? "border-[#881337] ring-2 ring-[#881337]/30"
                          : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Printing & Craftsmanship Trust Banner */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Printer className="h-4 w-4 text-[#881337]" />
                <span>Printing & Customization Information</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Card pricing includes high-definition printing of your event details, Sanskrit shlokas, and Hindi typography. Gold foil embossing, matching customized envelopes, and individual inserts for multi-day functions (Haldi, Sangeet, Wedding, Reception) are tailored to your requirements.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Free Sanskrit Shloka Proofing</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>In-House Press (Chakia)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Details, Quantity Tiers & Conversion CTAs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-50 text-[#881337] border border-rose-200 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                  {product.occasion || "Ceremony"} Invitation
                </span>
                {product.cardType && (
                  <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {product.cardType.replace("_", " ")}
                  </span>
                )}
                {product.style && (
                  <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {product.style.replace("_", " ")} Style
                  </span>
                )}
              </div>

              {/* Title & Short Description */}
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {product.name[currentLang]}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  {product.shortDesc[currentLang]}
                </p>
              </div>

              {/* Pricing Box */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Starting Showroom Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-slate-900">
                      ₹{price}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ card</span>
                    {product.mrp && product.mrp > price && (
                      <span className="text-sm text-slate-400 line-through">
                        ₹{product.mrp}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-emerald-700 block">
                    {product.inStock ? "Ready to Customize" : "Made to Order"}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Min Order: {minQty} Cards
                  </span>
                </div>
              </div>

              {/* Quantity Pricing Tier Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "मात्रा के अनुसार अनुमानित दर" : "Select Quantity Tier for Estimate"}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {quantityTiers.map((tier) => {
                    const isSelected = selectedTierQty === tier.qty;
                    return (
                      <button
                        key={tier.qty}
                        type="button"
                        onClick={() => setSelectedTierQty(tier.qty)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#881337] text-white border-[#881337] shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="block text-xs font-black">{tier.qty} pcs</span>
                        <span className={`block text-[10px] ${isSelected ? "text-amber-200 font-bold" : "text-slate-500"}`}>
                          ₹{tier.ratePerCard}/pc
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Estimated Total for {selectedTierQty} cards:</span>
                  <span className="font-extrabold text-slate-900 text-sm">₹{currentTier.total}</span>
                </div>
              </div>

              {/* Primary Action Buttons: Get Quote & WhatsApp */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#881337] hover:bg-[#700f2d] text-white py-3.5 text-xs sm:text-sm font-extrabold shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>{currentLang === "hi" ? "इस कार्ड का कोटेशन मांगें" : "Get Final Quotation for this Card"}</span>
                </button>

                <a
                  href={waDetailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Inquire with SKU on WhatsApp</span>
                </a>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSampleModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#881337]" />
                    <span>Request Sample</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>{copiedLink ? "Link Copied!" : "Share Design"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Specifications Summary Box */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[#881337]" />
                <span>{currentLang === "hi" ? "तकनीकी विवरण" : "Technical Specifications"}</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Dimensions</span>
                  <span className="font-bold text-slate-800">{product.specifications.dimensions || "Custom standard"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Material / Paper</span>
                  <span className="font-bold text-slate-800">{product.material || product.specifications.paperType || "Art Board"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Printing Method</span>
                  <span className="font-bold text-slate-800">{product.specifications.printingTech || "Screen / Gold Foil"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Turnaround Time</span>
                  <span className="font-bold text-slate-800">{product.turnaroundTime[currentLang]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Description Section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-[#881337]" />
            <span>{currentLang === "hi" ? "विस्तृत विवरण एवं विशेषताएँ" : "Detailed Overview & Features"}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {product.description[currentLang]}
          </p>
        </div>

        {/* Related Ceremony Cards */}
        {relatedCards.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#881337]">
                  {currentLang === "hi" ? "संबंधित डिज़ाइन" : "You May Also Like"}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {currentLang === "hi" ? "अन्य लोकप्रिय निमंत्रण पत्र" : "Related Invitation Designs"}
                </h2>
              </div>
              <Link
                to="/wedding-events"
                className="text-xs font-bold text-[#881337] hover:underline flex items-center gap-1"
              >
                <span>View Full Showroom →</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {relatedCards.map((card) => (
                <CardProductCard
                  key={card.id}
                  product={card}
                  onOpenQuoteModal={() => {
                    setIsQuoteModalOpen(true);
                  }}
                  onOpenSampleModal={() => {
                    setIsSampleModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quote Request Modal */}
      <CardQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        product={product}
      />

      {/* Sample Request Modal */}
      <CardSampleModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        product={product}
      />
    </div>
  );
};

export default WeddingCardDetailPage;
