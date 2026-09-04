import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

export interface LocalizedString {
  en: string;
  hi: string;
}

export interface SEOProps {
  title?: LocalizedString | string;
  description?: LocalizedString | string;
  canonical?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  keywords?: string;
  schema?: Record<string, any> | Array<Record<string, any>> | null;
  structuredData?: Record<string, any> | Array<Record<string, any>> | null;
}

const CANONICAL_BASE = "https://www.palakenterprises.shop";
const DEFAULT_OG_IMAGE = "https://www.palakenterprises.shop/images/palak-printing-press-banner.jpeg";

function setMetaTag(selector: string, attrName: string, attrValue: string, content: string) {
  if (typeof document === "undefined") return;
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonicalUrl(url: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setRouteSchema(schema?: Record<string, any> | Array<Record<string, any>> | null) {
  if (typeof document === "undefined") return;
  const SCRIPT_ID = "route-structured-data";
  let script = document.getElementById(SCRIPT_ID);
  if (!schema) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.setAttribute("type", "application/ld+json");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function SEO({
  title,
  description,
  canonical,
  canonicalUrl,
  noIndex = false,
  ogType = "website",
  ogImage,
  keywords,
  schema,
  structuredData,
}: SEOProps) {
  const activeCanonical = canonicalUrl || canonical;
  const activeSchema = structuredData !== undefined ? structuredData : schema;
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Resolve Title
    const brandSuffix = currentLang === "hi" ? "पालक इंटरप्राइजेज" : "Palak Enterprises";
    const defaultTitle =
      currentLang === "hi"
        ? "पालक इंटरप्राइजेज | प्रिंटिंग प्रेस, डिजिटल एवं ऑनलाइन सेवाएँ चकिया, बिहार"
        : "Palak Enterprises | Printing Press & Online Services in Chakia, Bihar";

    let resolvedTitle = defaultTitle;
    if (typeof title === "string") {
      resolvedTitle = title.includes(brandSuffix) ? title : `${title} | ${brandSuffix}`;
    } else if (title && typeof title === "object") {
      const text = title[currentLang] || title.en;
      resolvedTitle = text.includes(brandSuffix) ? text : `${text} | ${brandSuffix}`;
    }
    document.title = resolvedTitle;

    // 2. Resolve Description
    const defaultDesc =
      currentLang === "hi"
        ? "पालक इंटरप्राइजेज (पालक प्रिंटिंग प्रेस) चकिया, पूर्वी चंपारण - प्रिंटिंग, फोटोकॉपी, पासपोर्ट फोटो, विजिटिंग कार्ड, शादी कार्ड, फ्लेक्स बैनर, आधार प्रिंट, आरटीपीएस फॉर्म व ऑनलाइन सेवा केंद्र।"
        : "Palak Enterprises (Palak Printing Press) in Chakia, East Champaran, Bihar. Premium document printing, instant passport photos, visiting cards, wedding cards, flex banners, lamination, PVC ID cards & CSC services.";

    let resolvedDesc = defaultDesc;
    if (typeof description === "string") {
      resolvedDesc = description;
    } else if (description && typeof description === "object") {
      resolvedDesc = description[currentLang] || description.en;
    }

    setMetaTag('meta[name="description"]', "name", "description", resolvedDesc);

    // 3. Resolve Canonical URL
    let resolvedCanonical: string;
    if (activeCanonical) {
      resolvedCanonical = activeCanonical.startsWith("http")
        ? activeCanonical
        : `${CANONICAL_BASE}${activeCanonical.startsWith("/") ? "" : "/"}${activeCanonical}`;
    } else if (typeof window !== "undefined") {
      resolvedCanonical = `${CANONICAL_BASE}${window.location.pathname}`;
    } else {
      resolvedCanonical = CANONICAL_BASE;
    }
    // Standardize canonical: root homepage has trailing slash (matching index.html & sitemap.xml), subpages have no trailing slash
    const normalizedWithoutSlash = resolvedCanonical.replace(/\/+$/, "");
    if (normalizedWithoutSlash === CANONICAL_BASE) {
      resolvedCanonical = `${CANONICAL_BASE}/`;
    } else {
      resolvedCanonical = normalizedWithoutSlash;
    }
    setCanonicalUrl(resolvedCanonical);

    // 4. Robots Directives
    if (noIndex) {
      setMetaTag('meta[name="robots"]', "name", "robots", "noindex, nofollow");
    } else {
      setMetaTag(
        'meta[name="robots"]',
        "name",
        "robots",
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      );
    }

    // 5. Open Graph Meta Tags
    const resolvedImage = ogImage || DEFAULT_OG_IMAGE;
    setMetaTag('meta[property="og:title"]', "property", "og:title", resolvedTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", resolvedDesc);
    setMetaTag('meta[property="og:url"]', "property", "og:url", resolvedCanonical);
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    setMetaTag('meta[property="og:site_name"]', "property", "og:site_name", "Palak Enterprises");
    setMetaTag('meta[property="og:image"]', "property", "og:image", resolvedImage);
    setMetaTag('meta[property="og:locale"]', "property", "og:locale", currentLang === "hi" ? "hi_IN" : "en_IN");

    // 6. Twitter Card Meta Tags
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", resolvedTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", resolvedDesc);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", resolvedImage);

    // 7. Keywords if provided
    if (keywords) {
      setMetaTag('meta[name="keywords"]', "name", "keywords", keywords);
    }

    // 8. Route-specific JSON-LD Schema
    setRouteSchema(activeSchema);

    return () => {
      // Clean up route-specific schema when unmounting
      if (activeSchema) {
        setRouteSchema(null);
      }
    };
  }, [title, description, activeCanonical, noIndex, ogType, ogImage, keywords, activeSchema, currentLang]);

  return null;
}

export default SEO;
