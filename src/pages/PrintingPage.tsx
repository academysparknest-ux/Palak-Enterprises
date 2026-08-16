import React, { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Printer, ArrowUpDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { ProductCard } from "../components/ProductCard";
import { PalakDataStore } from "../lib/storage/store";
import { cn } from "../lib/utils";

interface PrintingPageProps {
  onOpenRequestModal?: (serviceId?: string) => void;
  onSelectService?: (service: any) => void;
}

export const PrintingPage: React.FC<PrintingPageProps> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc">("popular");

  const allProducts = PalakDataStore.getProducts();

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    if (activeTab !== "all") {
      if (activeTab === "cards") {
        list = list.filter((p) => p.slug.includes("card"));
      } else if (activeTab === "marketing") {
        list = list.filter((p) => p.slug.includes("pamphlet") || p.slug.includes("banner"));
      } else if (activeTab === "stationery") {
        list = list.filter((p) => p.slug.includes("letterhead") || p.slug.includes("bill") || p.slug.includes("lamination"));
      } else if (activeTab === "photo") {
        list = list.filter((p) => p.slug.includes("photo") || p.slug.includes("id"));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.en.toLowerCase().includes(q) ||
          p.name.hi.toLowerCase().includes(q) ||
          p.shortDesc.en.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === "price_asc") {
      list.sort((a, b) => a.startingPrice - b.startingPrice);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.startingPrice - a.startingPrice);
    } else {
      list.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    }

    return list;
  }, [allProducts, activeTab, searchQuery, sortBy]);

  const tabs = [
    { key: "all", labelEn: "All Printing", labelHi: "सभी प्रिंटिंग" },
    { key: "cards", labelEn: "Cards & ID", labelHi: "विजिटिंग व आईडी कार्ड" },
    { key: "marketing", labelEn: "Banners & Flyers", labelHi: "बैनर व पम्पलेट" },
    { key: "stationery", labelEn: "Office Stationery", labelHi: "लेटरहेड व बिल बुक" },
    { key: "photo", labelEn: "Photo & Lamination", labelHi: "फोटो व लैमिनेशन" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header Banner */}
      <div className="bg-[#123B70] text-white py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-3">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Printing Services</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "प्रिंटिंग सेवाएँ एवं उत्पाद कैटलॉग" : "Printing Products & Custom Press"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "विजिटिंग कार्ड, फ्लेक्स बैनर, पम्पलेट, लेटरहेड, बिल बुक और फोटो प्रिंटिंग के लिए सीधे ऑनलाइन कस्टमाइज़ व ऑर्डर करें।"
              : "High-definition offset and digital printing with customizable paper grades, laminations, volume pricing and store pickup."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4">
        {/* Controls Bar: Tabs, Search & Sort */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                    activeTab === tab.key
                      ? "bg-[#123B70] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {currentLang === "hi" ? tab.labelHi : tab.labelEn}
                </button>
              ))}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={currentLang === "hi" ? "उत्पाद खोजें..." : "Filter products..."}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  aria-label="Sort products by"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="popular">Popular</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-8">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 my-8">
              <Printer className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                {currentLang === "hi" ? "कोई उत्पाद नहीं मिला" : "No printing products match your filter"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {currentLang === "hi"
                  ? "कृपया फ़िल्टर रीसेट करें या कस्टम कोटेशन का अनुरोध करें।"
                  : "Try clearing your search query or request a custom print quote for non-standard requirements."}
              </p>
              <button
                onClick={() => {
                  setActiveTab("all");
                  setSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Need Custom Printing Assistance Card */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {currentLang === "hi" ? "क्या आपको कोई विशेष प्रिंटिंग साइज़ या पेपर चाहिए?" : "Need Custom Size, Bulk Quantity or Specific Paper?"}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {currentLang === "hi"
                ? "हम पुस्तकों, शादी पत्रिकाओं, विशेष स्टिकर एवं संस्थागत प्रिंटिंग के लिए कस्टम कोटेशन प्रदान करते हैं।"
                : "We provide instant wholesale quotes for books, catalogs, vinyl stickers, and specialty printing."}
            </p>
          </div>
          <Link
            to="/request-quote"
            className="inline-flex items-center gap-2 rounded-xl bg-[#123B70] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] transition-colors shrink-0"
          >
            <span>{currentLang === "hi" ? "कस्टम कोटेशन मांगें" : "Request Custom Quote"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrintingPage;
