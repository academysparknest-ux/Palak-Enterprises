import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { ProductConfigurator } from "../components/ProductConfigurator";
import { ProductCard } from "../components/ProductCard";

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const product = PalakDataStore.getProductBySlug(slug || "");
  const [activeImage, setActiveImage] = useState<string>(product?.imageUrl || "");

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">
          {currentLang === "hi" ? "उत्पाद नहीं मिला" : "Product Not Found"}
        </h2>
        <p className="text-xs text-slate-500">
          The requested printing product does not exist or has been relocated.
        </p>
        <Link
          to="/printing"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Printing Catalog</span>
        </Link>
      </div>
    );
  }

  const relatedProducts = PalakDataStore.getProducts()
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  const images = product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl];

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Breadcrumb Bar */}
      <div className="border-b border-slate-200 bg-white py-3 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link to="/printing" className="hover:text-slate-900">Printing</Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-none">
              {product.name[currentLang]}
            </span>
          </div>
          <Link to="/printing" className="hover:text-[#123B70] flex items-center gap-1 font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Products</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-12">
        {/* Main Product Layout: Gallery on Left + Configurator on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 sm:gap-10 items-start">
          {/* Left Column: Image Gallery & Product Information */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              {/* Main Active Image Viewport */}
              <div className="aspect-4/3 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-6 overflow-hidden">
                <img
                  src={activeImage || product.imageUrl}
                  alt={product.name[currentLang]}
                  className="h-full w-full object-contain transition-all duration-300"
                />
              </div>

              {/* Thumbnail selector */}
              {images.length > 1 && (
                <div className="mt-4 flex items-center gap-2.5">
                  {images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`h-14 w-14 rounded-xl border p-1 bg-slate-50 transition-all cursor-pointer ${
                        (activeImage || product.imageUrl) === img
                          ? "border-[#123B70] ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Overview Text */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#123B70] px-3 py-1 text-xs font-bold border border-blue-200/60">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Turnaround: {product.turnaroundTime[currentLang]}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Chakia In-house Press</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {product.name[currentLang]}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {product.description[currentLang]}
              </p>

              {/* Technical Specifications Table */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {currentLang === "hi" ? "तकनीकी विवरण" : "Technical Specifications"}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Standard Dimensions</span>
                    <span className="font-bold text-slate-800">{product.specifications.dimensions || "Customizable"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Paper Stock</span>
                    <span className="font-bold text-slate-800">{product.specifications.paperType || "Art Card / Bond"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Print Technology</span>
                    <span className="font-bold text-slate-800">{product.specifications.printingTech || "High-Def Offset"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Minimum Order</span>
                    <span className="font-bold text-slate-800">{product.specifications.minimumOrder || "1 Unit"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Configurator */}
          <div className="sticky top-20">
            <ProductConfigurator product={product} />
          </div>
        </div>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {currentLang === "hi" ? "अन्य लोकप्रिय प्रिंटिंग उत्पाद" : "Customers Also Ordered"}
              </h2>
              <Link to="/printing" className="text-xs font-bold text-[#123B70] hover:underline">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
