import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft, ShieldCheck, File, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";

export const CartPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { items, removeItem, updateQuantity, clearCart, subtotal, total, itemCount } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) {
    return (
      <div className="min-h-[70vh] bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-xs">
          <div className="h-16 w-16 rounded-full bg-blue-50 text-[#123B70] flex items-center justify-center mx-auto">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {currentLang === "hi" ? "आपकी कार्ट खाली है" : "Your Cart is Empty"}
          </h2>
          <p className="text-xs text-slate-500">
            {currentLang === "hi"
              ? "आपकी कार्ट में अभी कोई प्रिंटिंग उत्पाद नहीं है। हमारे कैटलॉग से उत्पाद चुनें।"
              : "Looks like you haven't added any printing products or customized cards yet."}
          </p>
          <Link
            to="/printing"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c] shadow-card transition-all w-full"
          >
            <span>{currentLang === "hi" ? "प्रिंटिंग कैटलॉग देखें" : "Explore Printing Catalog"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-10 px-4 sm:px-6">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 75%, #0284C7 0, transparent 50%), radial-gradient(circle at 50% 50%, #10B981 0, transparent 65%)",
          }}
        />
        {/* Subtle geometric dot grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl space-y-2">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Shopping Cart</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "शॉपिंग कार्ट" : "Review Your Cart"} ({itemCount} {itemCount === 1 ? "Item" : "Items"})
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-8 items-start">
          {/* Left Column: Cart Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Link to="/printing" className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{currentLang === "hi" ? "और उत्पाद जोड़ें" : "Continue Shopping"}</span>
              </Link>
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
              >
                {currentLang === "hi" ? "कार्ट खाली करें" : "Clear All"}
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.imageUrl && (
                        <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 flex items-center justify-center">
                          <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                          {item.productName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {item.unit}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Selected Options Badges */}
                  {item.selectedOptionsLabels && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(item.selectedOptionsLabels).map(([optName, optVal]) => (
                        <span
                          key={optName}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          <span className="text-slate-400">{optName}:</span> {optVal}
                        </span>
                      ))}
                      {item.designAssistanceRequested && (
                        <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 text-[11px] font-bold">
                          Palak Design Assistance (+₹150)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Uploaded File Indicator */}
                  {item.uploadedFileName && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 border border-emerald-200/60 px-2.5 py-1 text-xs text-emerald-800">
                      <File className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="truncate">Attached Artwork: {item.uploadedFileName}</span>
                    </div>
                  )}

                  {/* Pricing & Quantity Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Packs:</span>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-l-xl cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-slate-900 bg-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-r-xl cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-slate-900">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="sticky top-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-5">
              <h3 className="text-base font-extrabold text-slate-900">
                {currentLang === "hi" ? "ऑर्डर सारांश" : "Order Summary"}
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Store Pickup (Chakia)</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>Design Verification Proof</span>
                  <span className="font-bold text-emerald-600">Included</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">Total Payable</span>
                <span className="text-2xl font-black text-[#123B70]">₹{total}</span>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all cursor-pointer"
              >
                <span>{currentLang === "hi" ? "चेकआउट करें" : "Proceed to Checkout"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="pt-2 text-[11px] text-slate-500 space-y-1.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>No payment required now. Pay on pickup or after proof.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>100% Quality & reprint guarantee if defect found.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
