import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";

export interface BreadcrumbItem {
  label: {
    en: string;
    hi: string;
  };
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center space-x-1.5 text-xs sm:text-sm text-slate-500 py-3 overflow-x-auto whitespace-nowrap scrollbar-none",
        currentLang === "hi" && "font-hindi",
        className
      )}
    >
      <Link
        to="/"
        className="inline-flex items-center text-slate-600 hover:text-navy transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5 mr-1 text-slate-400" />
        <span>{currentLang === "hi" ? "होम" : "Home"}</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {isLast || !item.path ? (
              <span className="font-bold text-navy select-none" aria-current="page">
                {item.label[currentLang]}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-slate-600 hover:text-navy transition-colors font-medium"
              >
                {item.label[currentLang]}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
