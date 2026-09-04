import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  categories,
  services,
  getServiceBySlug,
  getServiceById,
} from "../config/services";
import CategoryPageContent from "../components/CategoryPageContent";
import ServiceDetailPageContent from "../components/ServiceDetailPageContent";
import { useLanguage } from "../context/LanguageContext";
import { SEO } from "../components/SEO";

export interface ServiceDetailPageProps {
  onOpenRequestModal?: (serviceId?: string) => void;
  onSelectService?: (service: any) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = () => {
  const { category: categoryParam, serviceSlug, slug } = useParams<{
    category?: string;
    serviceSlug?: string;
    slug?: string;
  }>();
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  // Case 1: /services/:category/:serviceSlug
  if (categoryParam && serviceSlug) {
    const matchedCategory = categories.find(
      (c) => c.slug === categoryParam || c.id === categoryParam
    );
    const matchedService =
      (matchedCategory && getServiceBySlug(matchedCategory.slug, serviceSlug)) ||
      getServiceById(serviceSlug) ||
      services.find((s) => s.slug === serviceSlug || s.id === serviceSlug);

    if (matchedService) {
      const parentCategory =
        matchedCategory ||
        categories.find((c) => c.id === matchedService.categoryId) ||
        categories[0];
      return (
        <ServiceDetailPageContent
          service={matchedService}
          category={parentCategory}
        />
      );
    }
  }

  // Case 2: /services/:slug or /services/:category
  const identifier = serviceSlug || categoryParam || slug || "";

  // Check if identifier is a category slug
  const matchedCategory = categories.find(
    (c) => c.slug === identifier || c.id === identifier
  );
  if (matchedCategory && !serviceSlug) {
    return <CategoryPageContent category={matchedCategory} />;
  }

  // Check if identifier is a service id / slug directly
  const matchedService =
    getServiceById(identifier) ||
    services.find((s) => s.slug === identifier || s.id === identifier);

  if (matchedService) {
    const parentCategory =
      categories.find((c) => c.id === matchedService.categoryId) || categories[0];
    return (
      <ServiceDetailPageContent
        service={matchedService}
        category={parentCategory}
      />
    );
  }

  // Fallback: Not Found
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <SEO title="Service Not Found | Palak Enterprises Chakia" noIndex={true} />
      <h2 className="text-2xl font-black text-slate-900 mb-2">
        {currentLang === "hi" ? "सेवा नहीं मिली" : "Service Not Found"}
      </h2>
      <p className="text-slate-600 mb-6 max-w-md text-sm">
        {currentLang === "hi"
          ? "यह सेवा सूची में उपलब्ध नहीं है। कृपया हमारी संपूर्ण सेवा सूची देखें।"
          : "The requested service could not be located. Please browse our full service directory."}
      </p>
      <Link
        to="/services"
        className="px-6 py-3 rounded-full bg-navy text-white font-bold text-xs shadow-md hover:bg-brandred transition-colors"
      >
        {currentLang === "hi" ? "सभी सेवाएँ देखें" : "Browse All Services"}
      </Link>
    </div>
  );
};

export default ServiceDetailPage;
