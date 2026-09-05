import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Send,
  MessageSquare,
  ArrowLeft,
  Heart,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { OrderAuthGate } from "../../components/OrderAuthGate";
import { QuickServiceUnavailableBanner } from "../../components/QuickServiceUnavailableBanner";
import { useQuickServiceAvailability } from "../../hooks/useQuickServiceAvailability";
import { getWhatsAppLink } from "../../config/business";
import { PalakDataStore } from "../../lib/storage/store";
import { supabase, isSupabaseConfigured } from "../../lib/supabase/client";
import { cn } from "../../lib/utils";
import { SEO } from "../../components/SEO";

const EVENT_TYPES = [
  { id: "wedding", labelEn: "Wedding / Vivah (शादी)", icon: "💍" },
  { id: "tilak", labelEn: "Tilak / Engagement (तिलक / सगाई)", icon: "👑" },
  { id: "mundan", labelEn: "Mundan Sanskar (मुंडन)", icon: "🪔" },
  { id: "anniversary", labelEn: "Anniversary / Birthday", icon: "🎂" },
  { id: "other", labelEn: "Other Ceremony", icon: "✨" },
];

const CARD_STYLES = [
  { id: "gold_foil", labelEn: "Royal Gold Foil", desc: "Traditional embossed with royal borders" },
  { id: "laser_cut", labelEn: "Laser Cut & Acrylic", desc: "Modern laser filigree & frosted acrylic" },
  { id: "box_card", labelEn: "Velvet Box Card", desc: "Luxury boxed invitation with inserts" },
  { id: "economical", labelEn: "Standard Offset Card", desc: "Budget-friendly classic invitation" },
];

export const InvitationCardsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();
  const { isStopped, stopReason } = useQuickServiceAvailability("invitation-cards");

  const [eventType, setEventType] = useState<string>("wedding");
  const [cardStyle, setCardStyle] = useState<string>("gold_foil");
  const [quantity, setQuantity] = useState<string>("250");
  const [eventDate, setEventDate] = useState<string>("");

  const [customerName, setCustomerName] = useState<string>(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || "");
  const [instructions, setInstructions] = useState<string>("");

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || "");
      setCustomerPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isStopped) {
      setSubmitError(
        stopReason
          ? `Invitation Card Printing is temporarily unavailable (${stopReason}). Please try again later.`
          : "Invitation Card Printing is currently temporarily paused and not accepting new orders."
      );
      return;
    }

    if (!user) {
      setSubmitError(
        currentLang === "hi"
          ? "ऑनलाइन प्रिंटिंग ऑर्डर के लिए अकाउंट आवश्यक है। कृपया नीचे दिए गए फॉर्म से तुरंत अकाउंट बनाएं या लॉगिन करें।"
          : "An account is required to place an instant online print order. Please create an account or sign in below."
      );
      return;
    }

    if (!customerName.trim()) {
      setSubmitError(currentLang === "hi" ? "कृपया अपना नाम दर्ज करें।" : "Please enter your name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setSubmitError(
        currentLang === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const randomSuffix = String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0");
      const requestCode = `PE-INV-${year}${month}${day}-${randomSuffix}`;

      const selectedEvent = EVENT_TYPES.find((e) => e.id === eventType)?.labelEn || eventType;
      const selectedStyle = CARD_STYLES.find((s) => s.id === cardStyle)?.labelEn || cardStyle;

      // 1. Sync local store
      try {
        PalakDataStore.createServiceRequest({
          requestCode,
          serviceId: "invitation-cards",
          serviceName: `Invitation Card Inquiry: ${selectedEvent}`,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          preferredContact: "whatsapp",
          applicantDetails: {
            eventType: selectedEvent,
            cardStyle: selectedStyle,
            quantity,
            eventDate,
          },
          additionalNotes: instructions.trim() || undefined,
          requestStatus: "NEW",
        });
      } catch (err) {
        console.warn("Local store fallback error:", err);
      }

      // 2. Persist to Supabase
      if (isSupabaseConfigured && supabase) {
        const { error: dbErr } = await supabase.from("service_requests").insert({
          request_code: requestCode,
          service_id: "invitation-cards",
          service_name: `Invitation Card Consultation: ${selectedEvent}`,
          customer_name: customerName.trim(),
          customer_phone: cleanPhone,
          preferred_contact: "whatsapp",
          applicant_details: {
            eventType: selectedEvent,
            cardStyle: selectedStyle,
            quantity,
            eventDate,
          },
          additional_notes: instructions.trim() || null,
          request_status: "NEW",
        });

        if (dbErr) {
          console.warn("Supabase insert warning:", dbErr);
        } else {
          await supabase.from("status_history").insert({
            entity_type: "service_request",
            entity_code: requestCode,
            new_status: "NEW",
            message_en: `Invitation inquiry received for ${selectedEvent} (${quantity} cards).`,
            message_hi: `${selectedEvent} के लिए निमंत्रण कार्ड अनुरोध प्राप्त हुआ (${quantity} कार्ड)।`,
            performed_by: "Online Customer",
          });
        }
      }

      setSubmittedCode(requestCode);
    } catch (err: any) {
      console.error("Invitation request error:", err);
      setSubmitError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <SEO
        title={{
          en: "Wedding & Invitation Card Printing in Chakia | Palak Enterprises",
          hi: "शादी व निमंत्रण कार्ड प्रिंटिंग चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Royal wedding cards, Tilak, Mundan, anniversary and event invitation printing in Chakia, Bihar. Gold foil embossing, laser-cut acrylic cards & Hindi/English typography.",
          hi: "चकिया में शाही शादी कार्ड, तिलक, मुंडन और मांगलिक आयोजनों के निमंत्रण पत्र। गोल्ड फॉयल, लेजर कट, पारंपरिक एवं आधुनिक डिज़ाइन।",
        }}
        canonical="/online-services/invitation-cards"
        keywords="Wedding Card Printing Chakia, Shadi Card Maker Chakia, Invitation Cards East Champaran, Palak Enterprises"
        schema={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Wedding & Invitation Card Printing",
          "provider": {
            "@type": "LocalBusiness",
            "name": "Palak Enterprises",
            "url": "https://www.palakenterprises.shop"
          },
          "serviceType": "Invitation Printing Service",
          "areaServed": "Chakia, East Champaran, Bihar"
        }}
      />
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-12 px-4 sm:px-6">
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
        <div className="relative mx-auto max-w-4xl text-center space-y-3">
          <div className="text-xs text-rose-200">
            <Link to="/" className="hover:underline">Home</Link> /{" "}
            <Link to="/online-services" className="hover:underline">Instant Online Services</Link> /{" "}
            <span className="text-amber-300">Invitation Cards</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 px-4 py-1 text-xs font-black uppercase tracking-wider">
            <Heart className="h-3.5 w-3.5 fill-rose-300 text-rose-300" />
            <span>Royal Wedding & Event Stationery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            💍 {currentLang === "hi" ? "शादी एवं मांगलिक निमंत्रण कार्ड" : "Wedding & Invitation Cards"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            {currentLang === "hi"
              ? "शादी, तिलक, मुंडन और गृह प्रवेश के 100+ डिज़ाइनों के लिए ऑनलाइन परामर्श व सैंपल बुकिंग दर्ज करें।"
              : "Register your wedding & ceremony card order or catalog sample request directly with our press specialists."}
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-6">
        {submittedCode ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-card space-y-6 animate-fadeUp">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                {currentLang === "hi" ? "✓ निमंत्रण कार्ड अनुरोध दर्ज हुआ!" : "✓ Invitation Request Registered!"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                {currentLang === "hi"
                  ? "आपका अनुरोध हमारे एडमिन पोर्टल पर पहुंच गया है। हमारी डिज़ाइन टीम जल्द ही आपसे संपर्क कर सैंपल एवं रेट साझा करेगी।"
                  : "Your inquiry is in our Admin Operations portal. Our invitation consultant will contact you with matching catalogs & pricing."}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-[#123B70]/30 bg-blue-50/50 p-4 max-w-sm mx-auto space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {currentLang === "hi" ? "आपका संदर्भ कोड" : "Your Reference ID"}
              </span>
              <span className="text-xl font-mono font-black text-[#123B70] tracking-wide block">
                {submittedCode}
              </span>
            </div>

            <div className="space-y-3 pt-2 max-w-md mx-auto">
              <Link
                to={`/track-order?code=${encodeURIComponent(submittedCode)}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all"
              >
                <span>{currentLang === "hi" ? "अनुरोध लाइव ट्रैक करें" : "Track Request Status"}</span>
              </Link>

              <button
                type="button"
                onClick={() => setSubmittedCode(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                {currentLang === "hi" ? "नया अनुरोध दर्ज करें" : "Submit Another Inquiry"}
              </button>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href={getWhatsAppLink(
                    `Hello Palak Enterprises, I have registered an invitation card inquiry ID: *${submittedCode}*.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{currentLang === "hi" ? "व्हाट्सएप पर कैटलॉग मंगाएं" : "Chat on WhatsApp with Reference ID"}</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {isStopped && (
              <QuickServiceUnavailableBanner
                serviceName={currentLang === "hi" ? "शादी एवं निमंत्रण कार्ड" : "Wedding & Invitation Cards"}
                stopReason={stopReason}
              />
            )}
            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 md:p-10 shadow-card space-y-6">
            {/* Step 1: Event Type */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900">
                1. {currentLang === "hi" ? "मांगलिक अवसर चुनें (Select Event)" : "Select Event / Ceremony"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {EVENT_TYPES.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setEventType(ev.id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                      eventType === ev.id
                        ? "border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-xl">{ev.icon}</span>
                    <span className="text-xs font-bold text-slate-900">{ev.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Card Style Preference */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900">
                2. {currentLang === "hi" ? "कार्ड स्टाइल प्राथमिकता (Card Style)" : "Card Style Preference"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CARD_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setCardStyle(style.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-0.5",
                      cardStyle === style.id
                        ? "border-[#123B70] bg-blue-50/60 ring-2 ring-[#123B70]/20"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                    )}
                  >
                    <div className="text-xs font-bold text-slate-900">{style.labelEn}</div>
                    <div className="text-[11px] text-slate-500">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Quantity & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "अनुमानित प्रतियां (Quantity)" : "Estimated Quantity"}
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                >
                  <option value="100">100 Cards</option>
                  <option value="250">250 Cards</option>
                  <option value="500">500 Cards</option>
                  <option value="1000">1,000 Cards</option>
                  <option value="1500+">1,500+ Cards (Bulk)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "कार्यक्रम की तारीख (Event Date)" : "Event / Ceremony Date"}
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Step 4: Customer Account & Contact Details */}
            <OrderAuthGate
              stepNumber={4}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              instructions={instructions}
              setInstructions={setInstructions}
            />

            {submitError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isStopped}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs sm:text-sm font-extrabold shadow-card transition-all",
                isStopped
                  ? "bg-slate-300 text-slate-600 border border-slate-300 cursor-not-allowed"
                  : "bg-[#123B70] hover:bg-[#0c274c] disabled:opacity-50 text-white cursor-pointer"
              )}
            >
              {isStopped ? (
                <span>
                  {currentLang === "hi"
                    ? "⚠️ सेवा अस्थायी रूप से बंद है (Service Unavailable)"
                    : "⚠️ Service Temporarily Unavailable"}
                </span>
              ) : submitting ? (
                "Submitting Inquiry..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Card Request to Admin →</span>
                </>
              )}
            </button>
          </form>
        </div>
        )}

        <div className="text-center pt-6">
          <Link
            to="/online-services"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123B70] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "सभी इंस्टेंट ऑनलाइन सेवाएँ देखें" : "Back to Instant Online Services"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
