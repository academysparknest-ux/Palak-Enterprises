import React, { useState, useMemo, useRef } from "react";
import { Sparkles, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { type LocalProduct, type CardOccasion, type CardStyle } from "../lib/storage/catalogData";
import { WeddingHero } from "../components/wedding/WeddingHero";
import { OccasionCollections } from "../components/wedding/OccasionCollections";
import { StyleCollections } from "../components/wedding/StyleCollections";
import { CatalogueToolbar, type FilterState } from "../components/wedding/CatalogueToolbar";
import { CardProductCard } from "../components/wedding/CardProductCard";
import { CardQuoteModal } from "../components/wedding/CardQuoteModal";
import { CardSampleModal } from "../components/wedding/CardSampleModal";
import { WhyChoosePalakCards } from "../components/wedding/WhyChoosePalakCards";
import { WeddingFinalCTA } from "../components/wedding/WeddingFinalCTA";
import { SEO } from "../components/SEO";

export const WeddingEventsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const catalogueRef = useRef<HTMLDivElement>(null);

  // Filter and search state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    occasion: "all",
    style: "all",
    cardType: "all",
    religion: "all",
    priceRange: "all",
    sortBy: "featured",
  });

  // Active modals
  const [selectedProductForQuote, setSelectedProductForQuote] = useState<LocalProduct | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedProductForSample, setSelectedProductForSample] = useState<LocalProduct | null>(null);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

  // Scroll helper
  const scrollToCatalogue = () => {
    if (catalogueRef.current) {
      catalogueRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      occasion: "all",
      style: "all",
      cardType: "all",
      religion: "all",
      priceRange: "all",
      sortBy: "featured",
    });
  };

  const handleSelectOccasion = (occ: CardOccasion | "all") => {
    setFilters((prev) => ({ ...prev, occasion: occ }));
    scrollToCatalogue();
  };

  const handleSelectStyle = (st: CardStyle | "all") => {
    setFilters((prev) => ({ ...prev, style: st }));
    scrollToCatalogue();
  };

  const handleOpenQuoteModal = (product: LocalProduct) => {
    setSelectedProductForQuote(product);
    setIsQuoteModalOpen(true);
  };

  const handleOpenSampleModal = (product: LocalProduct) => {
    setSelectedProductForSample(product);
    setIsSampleModalOpen(true);
  };

  const handleOpenGenericCustomQuote = () => {
    const customCard = PalakDataStore.getWeddingCardBySlug("bespoke-custom-designer-invitation") || PalakDataStore.getWeddingCards()[0];
    setSelectedProductForQuote(customCard);
    setIsQuoteModalOpen(true);
  };

  // Filtered Cards list
  const filteredCards = useMemo(() => {
    return PalakDataStore.getWeddingCards({
      searchQuery: filters.searchQuery,
      occasion: filters.occasion,
      style: filters.style,
      cardType: filters.cardType,
      religion: filters.religion,
      priceRange: filters.priceRange,
      sortBy: filters.sortBy,
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-slate-900 pb-20">
      <SEO
        title={{
          en: "Royal Wedding & Invitation Card Printing in Chakia | Palak Enterprises",
          hi: "शाही शादी एवं मांगलिक कार्ड प्रिंटिंग चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Explore luxury Indian wedding stationery, Tilak & Mundan invitations, laser cut cards, and velvet boxes with high-speed in-house printing in Chakia, Bihar.",
          hi: "शादी, तिलक, मुंडन, सगाई और गृह प्रवेश के 500+ सुंदर कार्ड। गोल्डन फॉयल, संस्कृत श्लोक एवं चकिया में इन-हाउस प्रिंटिंग।",
        }}
        canonicalUrl="/wedding-events"
        keywords="wedding card printing Chakia, shadi card Chakia, invitation card printer Bihar, tilak card, mundan card, gold foil wedding card East Champaran"
      />

      {/* 1. Hero Section */}
      <WeddingHero
        onBrowseClick={scrollToCatalogue}
        onOpenCustomQuote={handleOpenGenericCustomQuote}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-12 sm:space-y-16">
        {/* 2. Occasion Discovery Collections */}
        <OccasionCollections
          selectedOccasion={filters.occasion}
          onSelectOccasion={handleSelectOccasion}
        />

        {/* 3. Style Discovery Pills */}
        <StyleCollections
          selectedStyle={filters.style}
          onSelectStyle={handleSelectStyle}
        />

        {/* 4. Catalogue Toolbar & Product Grid Anchor */}
        <div ref={catalogueRef} className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#881337] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{currentLang === "hi" ? "डिजिटल शोरूम कैटलॉग" : "Digital Showroom Catalogue"}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {currentLang === "hi" ? "कार्ड्स एवं निमंत्रण पत्र" : "Explore Invitation Cards"}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {currentLang === "hi"
                ? "सभी कार्ड्स में नाम, तारीख और हिंदी/संस्कृत श्लोक कस्टमाइज़ किए जा सकते हैं।"
                : "All designs include custom Sanskrit/Hindi text, gold foil and envelope options."}
            </p>
          </div>

          {/* Search, Filters, Price, Sort Toolbar */}
          <CatalogueToolbar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            totalCount={filteredCards.length}
          />

          {/* 5. Responsive Product Grid */}
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {filteredCards.map((product) => (
                <CardProductCard
                  key={product.id}
                  product={product}
                  onOpenQuoteModal={handleOpenQuoteModal}
                  onOpenSampleModal={handleOpenSampleModal}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 sm:p-16 text-center space-y-4 shadow-2xs">
              <div className="h-16 w-16 rounded-full bg-rose-50 text-[#881337] flex items-center justify-center mx-auto">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {currentLang === "hi"
                  ? "चयनित फ़िल्टर के अनुसार कोई कार्ड नहीं मिला"
                  : "No Invitation Cards Match Your Filters"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {currentLang === "hi"
                  ? "कृपया कोई अन्य श्रेणी या बजट चुनें, या अपनी विशेष पसंद के अनुसार कस्टम डिज़ाइन का अनुरोध करें।"
                  : "Try clearing some filters or search keywords, or request a custom quotation tailored to your exact specifications."}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{currentLang === "hi" ? "सभी फ़िल्टर रीसेट करें" : "Reset All Filters"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenGenericCustomQuote}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#881337] text-white px-5 py-2.5 text-xs font-bold hover:bg-[#700f2d] transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{currentLang === "hi" ? "कस्टम डिज़ाइन मांगें" : "Request Custom Design"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 6. Why Choose Palak Cards Trust Section */}
        <WhyChoosePalakCards />

        {/* 7. Bottom Final CTA */}
        <WeddingFinalCTA
          onScrollToTop={scrollToCatalogue}
          onOpenCustomQuote={handleOpenGenericCustomQuote}
        />
      </div>

      {/* Quote Request Modal */}
      <CardQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        product={selectedProductForQuote}
      />

      {/* Sample Request Modal */}
      <CardSampleModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        product={selectedProductForSample}
      />
    </div>
  );
};

export default WeddingEventsPage;
