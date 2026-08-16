import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Choose language / भाषा चुनें"
      className={cn(
        "inline-flex items-center rounded-pill border border-line bg-white p-1 shadow-sm",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={cn(
          "rounded-pill px-3 py-1.5 font-semibold transition-colors cursor-pointer",
          lang === "en" ? "bg-navy text-white shadow-xs" : "text-muted hover:text-navy"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        aria-pressed={lang === "hi"}
        className={cn(
          "rounded-pill px-3 py-1.5 font-semibold transition-colors font-hindi cursor-pointer",
          lang === "hi" ? "bg-navy text-white shadow-xs" : "text-muted hover:text-navy"
        )}
      >
        हिन्दी
      </button>
    </div>
  );
}
