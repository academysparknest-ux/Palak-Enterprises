import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

interface SEOProps {
  title?:
    | {
        en: string;
        hi: string;
      }
    | string;
  description?:
    | {
        en: string;
        hi: string;
      }
    | string;
}

export function SEO({ title, description }: SEOProps) {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  useEffect(() => {
    const defaultTitle =
      currentLang === "hi"
        ? "पालक इंटरप्राइजेज | प्रिंटिंग, डिजिटल और ऑनलाइन सेवाएँ | चकिया"
        : "Palak Enterprises | Printing, Digital & Online Services in Chakia";

    const defaultDesc =
      currentLang === "hi"
        ? "पालक इंटरप्राइजेज (पालक प्रिंटिंग प्रेस) चकिया, पूर्वी चंपारण - प्रिंटिंग, फोटोकॉपी, पासपोर्ट फोटो, आधार प्रिंट, आरटीपीएस फॉर्म व ऑनलाइन सेवा सहायता केंद्र।"
        : "Palak Enterprises (Palak Printing Press) in Chakia, East Champaran, Bihar. Premium printing, instant passport photos, lamination, Aadhaar PVC, online form assistance, and website development.";

    const suffix = currentLang === "hi" ? "पालक इंटरप्राइजेज" : "Palak Enterprises";
    
    let resolvedTitle = defaultTitle;
    if (typeof title === "string") {
      resolvedTitle = title.includes(suffix) ? title : `${title} | ${suffix}`;
    } else if (title && typeof title === "object") {
      const text = title[currentLang] || title.en;
      resolvedTitle = text.includes(suffix) ? text : `${text} | ${suffix}`;
    }
    document.title = resolvedTitle;

    let resolvedDesc = defaultDesc;
    if (typeof description === "string") {
      resolvedDesc = description;
    } else if (description && typeof description === "object") {
      resolvedDesc = description[currentLang] || description.en;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", resolvedDesc);
    }
  }, [title, description, currentLang]);

  return null;
}

export default SEO;
