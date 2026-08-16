import React from "react";
import { businessConfig } from "../config/business";
import { servicesData } from "../config/services";

export const StructuredData: React.FC = () => {
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://palakenterprises.com";

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": businessConfig.name,
    "alternateName": businessConfig.associatedName,
    "description": businessConfig.subtitle.en,
    "url": currentOrigin,
    "telephone": businessConfig.phoneNumbers.primary,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": `${businessConfig.address.street}, ${businessConfig.address.landmark.en}`,
      "addressLocality": businessConfig.address.city,
      "addressRegion": businessConfig.address.state,
      "postalCode": businessConfig.address.pincode,
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 26.42,
      "longitude": 85.04
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "08:00",
        "closes": "20:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Sunday"],
        "opens": "09:00",
        "closes": "17:00"
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Printing & Online Services",
      "itemListElement": servicesData.slice(0, 10).map((s) => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": s.name.en,
          "description": s.description.en
        }
      }))
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
    />
  );
};
