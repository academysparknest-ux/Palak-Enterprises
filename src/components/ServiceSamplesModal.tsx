import { X, Sparkles, MessageSquare } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { Service } from "../config/services";
import type { SampleItem } from "../config/samples";
import { sampleItems, getSamplesByServiceId } from "../config/samples";
import SampleImage from "./SampleImage";
import { getWhatsAppLink } from "../config/business";
import { cn } from "../lib/utils";

interface ServiceSamplesModalProps {
  service: Service | null;
  onClose: () => void;
  onSelectSample: (sample: SampleItem) => void;
}

export default function ServiceSamplesModal({
  service,
  onClose,
  onSelectSample,
}: ServiceSamplesModalProps) {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  if (!service) return null;

  // Get direct samples for this service ID / slug
  let samples = getSamplesByServiceId(service.id);
  if (samples.length === 0 && service.slug) {
    samples = getSamplesByServiceId(service.slug);
  }

  // If fewer than 3 samples directly matched, supplement with category samples
  if (samples.length < 3) {
    const categoryKey = service.categoryId;
    const categorySamples = sampleItems.filter((item) => {
      if (categoryKey === "printing") return item.category === "printing" || item.category === "wedding";
      if (categoryKey === "stationery") return item.category === "stationery" || item.category === "business";
      if (categoryKey === "photo-id") return item.category === "digital";
      if (categoryKey === "wedding-invitations") return item.category === "wedding" || item.category === "printing";
      if (categoryKey === "design") return item.category === "design";
      return (item.category as string) === (categoryKey as string);
    });

    const existingIds = new Set(samples.map((s) => s.id));
    for (const catSample of categorySamples) {
      if (!existingIds.has(catSample.id)) {
        samples.push(catSample);
        existingIds.add(catSample.id);
      }
      if (samples.length >= 6) break;
    }
  }

  // Fallback to top samples if still empty
  if (samples.length === 0) {
    samples = sampleItems.slice(0, 4);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${service.name[currentLang]} Samples`}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[90vh] max-w-3xl w-full overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-fadeUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy/10 text-navy">
              <Sparkles size={18} className="text-amber-500" />
            </div>
            <div>
              <h3
                className={cn(
                  "font-display text-lg font-bold text-navy",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {service.name[currentLang]} — {currentLang === "hi" ? "सैंपल डिज़ाइन" : "Sample Designs"}
              </h3>
              <p className={cn("text-xs text-slate-500", currentLang === "hi" && "font-hindi")}>
                {currentLang === "hi"
                  ? "इस सेवा के लिए उपलब्ध संदर्भ व सैंपल डिज़ाइन देखें"
                  : "Explore reference sample designs for this service"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {samples.map((item) => {
              const message =
                currentLang === "hi"
                  ? `नमस्ते, मुझे "${service.name.hi}" सेवा के लिए "${item.title.hi}" (सैंपल डिज़ाइन) जैसा डिज़ाइन करवाना है।`
                  : `Hello, I would like a design similar to "${item.title.en}" for "${service.name.en}".`;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
                    onClick={() => {
                      onClose();
                      onSelectSample(item);
                    }}
                  >
                    <SampleImage
                      src={item.image}
                      alt={item.title[currentLang]}
                      title={item.title[currentLang]}
                      fallbackType={item.fallbackType}
                      width={400}
                      height={300}
                    />

                    <span
                      className={cn(
                        "absolute top-2.5 left-2.5 rounded-full bg-slate-900/85 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-white/20",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {item.badge[currentLang]}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-3.5">
                    <h4
                      className={cn(
                        "font-display text-sm font-bold text-navy line-clamp-1 group-hover:text-brandred transition-colors",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {item.title[currentLang]}
                    </h4>
                    <p
                      className={cn(
                        "mt-1 flex-1 text-[11px] text-slate-500 line-clamp-2 leading-tight",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {item.description[currentLang]}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectSample(item);
                        }}
                        className={cn(
                          "text-[11px] font-bold text-navy hover:text-brandred transition-colors cursor-pointer",
                          currentLang === "hi" && "font-hindi"
                        )}
                      >
                        {currentLang === "hi" ? "ज़ूम देखें" : "View Zoom"}
                      </button>

                      <a
                        href={getWhatsAppLink(message)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-500 hover:text-white",
                          currentLang === "hi" && "font-hindi"
                        )}
                      >
                        <MessageSquare size={12} />
                        {currentLang === "hi" ? "चुनें" : "Inquire"}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-center">
            <p className={cn("text-[11px] text-amber-900 font-medium", currentLang === "hi" && "font-hindi")}>
              {currentLang === "hi"
                ? "नोट: ये केवल संदर्भ सैंपल डिज़ाइन हैं। आपकी आवश्यकता के अनुसार पूरी तरह कस्टम डिज़ाइन बनाया जाता है।"
                : "Note: These are reference sample designs. All prints and digital work are fully customized for your order."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
