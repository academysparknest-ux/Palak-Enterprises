import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MapPin, Store, Send, AlertCircle, ArrowRight, MessageSquare, User, Sparkles, CreditCard, Building } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { PalakDataStore } from "../lib/storage/store";
import { getWhatsAppLink } from "../config/business";

export const CheckoutPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { items, subtotal, total, clearCart, itemCount } = useCart();
  const { user, isAuthenticated } = useAuth();

  // Form State
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || "");
      setCustomerPhone((prev) => prev || user.phone || "");
      setCustomerEmail((prev) => prev || user.email || "");
    }
  }, [user]);
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pay_online" | "pay_at_shop" | "pay_at_store" | "pay_after_confirmation">("pay_at_store");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    code: string;
    paymentMethod: string;
    paymentStatus: string;
    totalAmount: number;
    fulfillmentType: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (itemCount === 0 && !placedOrder) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500">Please add items to cart before proceeding to checkout.</p>
        <Link to="/printing" className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!customerName.trim()) {
      setError(currentLang === "hi" ? "कृपया अपना नाम दर्ज करें" : "Please enter your name");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      setError(currentLang === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें" : "Please enter a valid 10-digit mobile number");
      return;
    }
    if (fulfillmentType === "delivery" && !streetAddress.trim()) {
      setError(currentLang === "hi" ? "कृपया डिलीवरी पता दर्ज करें" : "Please enter delivery address");
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedSubtotal = items.reduce((acc, i) => acc + (Number(i.unitPrice) * Number(i.quantity)), 0);
      const deliveryCharge = fulfillmentType === "delivery" ? 50 : 0;
      const finalTotal = calculatedSubtotal + deliveryCharge;

      const order = await PalakDataStore.createOrder({
        userId: user?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        fulfillmentType,
        deliveryAddress:
          fulfillmentType === "delivery"
            ? {
                street: streetAddress.trim(),
                landmark: landmark.trim() || undefined,
                city: "Chakia",
                pincode: "845412",
              }
            : undefined,
        orderNotes: orderNotes.trim() || undefined,
        subtotalAmount: calculatedSubtotal,
        deliveryFee: deliveryCharge,
        totalAmount: finalTotal,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === "pay_online" ? "paid" : "pending",
        orderStatus: "NEW",
        items,
      });

      setPlacedOrder({
        code: order.orderCode,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        fulfillmentType: order.fulfillmentType,
      });
      clearCart();
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="bg-[#123B70] text-white py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-2">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <Link to="/cart" className="hover:underline">Cart</Link> / <span className="text-amber-300">Checkout</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "चेकआउट एवं ऑर्डर पुष्टिकरण" : "Complete Your Order"}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4">
        {placedOrder ? (
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 shadow-card animate-fadeUp">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-900">
                {currentLang === "hi" ? "ऑर्डर सफलतापूर्वक दर्ज हुआ!" : "Order Placed Successfully!"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {placedOrder.paymentMethod === "pay_online"
                  ? (currentLang === "hi"
                      ? "⚡ ऑनलाइन भुगतान सफल! आपका ऑर्डर प्राथमिकता से प्रिंट व पैक किया जा रहा है। दुकान पहुँचते ही बिना लाइन लगे सीधे अपना पार्सल प्राप्त करें।"
                      : "⚡ Online payment confirmed! Your job is queued for priority printing and express packing. Skip the line and collect directly at the shop.")
                  : (currentLang === "hi"
                      ? "ऑर्डर दर्ज हो गया है। कृपया दुकान (ब्लॉक गेट, चकिया) आकर काउंटर पर भुगतान करें और प्रिंट प्राप्त करें।"
                      : "Order registered. Please visit our shop (Near Block Gate, Chakia) to pay at the counter and collect your prints.")}
              </p>
            </div>

            {/* Express Pickup Instructions Callout */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left space-y-1 text-xs text-slate-700">
              <span className="font-extrabold text-[#123B70] block">
                📍 {currentLang === "hi" ? "दुकान से संग्रह निर्देश (Store Pickup):" : "Shop Collection Location & Pickup:"}
              </span>
              <p className="text-[11px] text-slate-600">
                {currentLang === "hi"
                  ? "पालक एंटरप्राइजेज, ब्लॉक गेट के पास, चकिया। दुकान पहुँचकर केवल अपना ऑर्डर आईडी दिखाएं।"
                  : "Palak Enterprises, Near Block Gate, Chakia, East Champaran. Just show your Order ID at the counter to collect."}
              </p>
            </div>

            {/* Order Summary Receipt Box */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Order ID</span>
                <span className="text-lg font-black text-[#123B70] tracking-wider font-mono">{placedOrder.code}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Payment Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                  placedOrder.paymentStatus === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {placedOrder.paymentStatus === "paid" ? "✓ Paid Online (Express Zero Wait)" : "⏳ Pay at Shop"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Collection:</span>
                <span className="font-bold text-slate-800">
                  {placedOrder.fulfillmentType === "delivery" ? "Local Delivery" : "Store Pickup (Chakia Block Gate)"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-800">Total Amount:</span>
                <span className="text-base text-[#123B70]">₹{placedOrder.totalAmount}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={`/track-order?code=${placedOrder.code}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c]"
              >
                <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order Status"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <Link
                to="/account"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <span>{currentLang === "hi" ? "मेरे ऑर्डर्स देखें" : "View in Account"}</span>
              </Link>

              <a
                href={getWhatsAppLink(`Hello Palak Enterprises, I placed Order *${placedOrder.code}*.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-xs font-bold text-emerald-800"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp Notice</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-8 items-start">
            {/* Left: Customer Contact & Delivery Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              {/* Auth status banner */}
              {isAuthenticated ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {currentLang === "hi" ? "लॉगिन किया हुआ है:" : "Signed in as"}{" "}
                      <strong>{user?.name}</strong> {user?.email && `(${user.email})`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    {user?.role || "CUSTOMER"}
                  </span>
                </div>
              ) : (
                <div className="rounded-2xl bg-blue-50 border border-blue-200/80 p-3 text-xs flex flex-wrap items-center justify-between gap-2 text-[#123B70]">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#123B70] shrink-0" />
                    <span>
                      {currentLang === "hi" ? "क्या आपका खाता है?" : "Have a Palak account?"}{" "}
                      <Link to="/login?returnTo=/checkout" className="font-bold underline hover:text-[#0c274c]">
                        {currentLang === "hi" ? "त्वरित चेकआउट के लिए साइन इन करें" : "Sign in for saved details"}
                      </Link>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {currentLang === "hi" ? "कार्ट सुरक्षित रहेगी" : "Cart is preserved"}
                  </span>
                </div>
              )}

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {currentLang === "hi" ? "ग्राहक विवरण एवं संपर्क" : "1. Contact & Customer Details"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  We need this to send digital proofs, status notifications and ready-for-pickup SMS.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "पूरा नाम *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "मोबाइल नंबर (व्हाट्सएप) *" : "WhatsApp Mobile Number *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9905238015"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "ईमेल पता (वैकल्पिक)" : "Email Address (Optional)"}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              {/* Fulfillment Option: Pickup vs Local Delivery */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {currentLang === "hi" ? "प्राप्ति माध्यम चुनें" : "2. Fulfillment Method"}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("pickup")}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      fulfillmentType === "pickup"
                        ? "border-[#123B70] bg-blue-50/60 ring-1 ring-[#123B70]"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Store className="h-4 w-4 text-[#123B70]" />
                      <span>Store Pickup (Chakia)</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-1">FREE • Near Block Gate</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType("delivery")}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      fulfillmentType === "delivery"
                        ? "border-[#123B70] bg-blue-50/60 ring-1 ring-[#123B70]"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <MapPin className="h-4 w-4 text-[#123B70]" />
                      <span>Local Delivery</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Within Chakia / East Champaran (+₹50)</div>
                  </button>
                </div>

                {fulfillmentType === "delivery" && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 animate-fadeUp">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Delivery Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="House no, Street name, Mohalla"
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Landmark / City
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="Near School / Temple, Chakia"
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Express Pickup & Skip-the-Queue Highlight Notice */}
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-blue-50/60 p-4 sm:p-5 space-y-2.5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-emerald-950">
                        {currentLang === "hi"
                          ? "⚡ दुकान से पिकअप — ऑनलाइन भुगतान से लाइन से बचें!"
                          : "⚡ Store Pickup — Pay Online to Skip the Counter Queue!"}
                      </h3>
                      <span className="rounded-full bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wide">
                        Zero Wait
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {currentLang === "hi"
                        ? "प्रिंट लेने के लिए आपको दुकान (ब्लॉक गेट, चकिया) आना होगा। ऑनलाइन भुगतान करने से आपको दुकान पर फ़ाइल भेजने या प्रिंटिंग के लिए लाइन में इंतज़ार नहीं करना पड़ेगा — आपके पहुँचने से पहले ही आपका प्रिंट तैयार व पैक रहेगा!"
                        : "You will collect your order at our shop (Near Block Gate, Chakia). Paying online ensures your files are pre-printed and packed in advance—so you don't wait in queue to transfer files or wait for printing. Just walk in and collect instantly!"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Option */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {currentLang === "hi" ? "3. भुगतान विकल्प चुनें" : "3. Choose Payment Method"}
                  </h2>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {currentLang === "hi" ? "✓ तेज़ और सुरक्षित" : "✓ Fast & Secure"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pay_online")}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all space-y-2 ${
                      paymentMethod === "pay_online"
                        ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600 shadow-xs"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-emerald-700" />
                        <span>{currentLang === "hi" ? "ऑनलाइन भुगतान (UPI / QR)" : "Pay Online (UPI / QR / Cards)"}</span>
                      </span>
                      <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {currentLang === "hi" ? "सुझावित • 0 इंतज़ार" : "Recommended"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      {currentLang === "hi"
                        ? "✅ सबसे तेज़! दुकान पर बिना लाइन लगे सीधे तैयार प्रिंट पैकेट प्राप्त करें।"
                        : "✅ Fastest! Pre-printed & kept packed. Walk in, show Order ID, collect immediately with zero queue."}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pay_at_shop")}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all space-y-2 ${
                      paymentMethod === "pay_at_shop"
                        ? "border-[#123B70] bg-blue-50/70 ring-2 ring-[#123B70] shadow-xs"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-[#123B70]" />
                        <span>{currentLang === "hi" ? "दुकान काउंटर पर भुगतान" : "Pay at Shop Counter"}</span>
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        {currentLang === "hi" ? "काउंटर पर" : "Cash / UPI"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {currentLang === "hi"
                        ? "ऑर्डर अभी सबमिट करें और दुकान पहुँचने पर काउंटर पर नकद या UPI द्वारा भुगतान करें।"
                        : "Submit order now and pay at the shop counter when you arrive to collect."}
                    </p>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Order Notes / Instructions (Optional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any urgent timing, packaging request, or additional printing notes..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="sticky top-20">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  {currentLang === "hi" ? "ऑर्डर का संक्षिप्त विवरण" : "Order Summary"}
                </h3>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{item.productName}</span>
                        <div className="text-[11px] text-slate-400">{item.unit}</div>
                      </div>
                      <span className="font-bold text-slate-900">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fulfillment</span>
                    <span>{fulfillmentType === "delivery" ? "₹50 (Local Delivery)" : "FREE (Pickup)"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-black text-[#123B70]">
                    ₹{total + (fulfillmentType === "delivery" ? 50 : 0)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? "Placing Order..."
                      : currentLang === "hi"
                      ? "ऑर्डर कन्फर्म करें"
                      : "Confirm & Place Order"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
