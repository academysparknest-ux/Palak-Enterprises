import React from "react";
import { business, businessConfig } from "../config/business";
import { servicesData } from "../config/services";

export const StructuredData: React.FC = () => {
  const CANONICAL_DOMAIN = "https://www.palakenterprises.shop";

  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [
      // 1. Core LocalBusiness & Printing Press Entity
      {
        "@type": ["LocalBusiness", "PrintShop"],
        "@id": `${CANONICAL_DOMAIN}/#localbusiness`,
        "name": businessConfig.name.en,
        "alternateName": [
          businessConfig.associatedName.en,
          businessConfig.name.hi,
          businessConfig.associatedName.hi,
          "Palak Printing Press Chakia",
          "Palak Cyber Cafe Chakia",
        ],
        "legalName": "Palak Enterprises",
        "taxID": business.registrations.gstin,
        "vatID": business.registrations.gstin,
        "url": CANONICAL_DOMAIN,
        "logo": `${CANONICAL_DOMAIN}/logo.webp`,
        "image": [
          `${CANONICAL_DOMAIN}/images/palak-printing-press-banner.jpeg`,
          `${CANONICAL_DOMAIN}/logo.webp`
        ],
        "description": "Professional printing press, digital document services, instant passport photos, visiting cards, flex banners, wedding cards, PVC ID cards, and CSC citizen services in Chakia, East Champaran, Bihar.",
        "telephone": `+91${businessConfig.phoneNumbers.primary}`,
        "priceRange": "₹",
        "currenciesAccepted": "INR",
        "paymentAccepted": "Cash, UPI, Credit Card, Debit Card, Net Banking",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Near Block Gate",
          "addressLocality": "Chakia",
          "addressRegion": "Bihar",
          "addressCountry": "IN"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 26.413807,
          "longitude": 85.052013
        },
        "hasMap": businessConfig.googleMapsUrl,
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
        "areaServed": [
          {
            "@type": "City",
            "name": "Chakia"
          },
          {
            "@type": "AdministrativeArea",
            "name": "East Champaran"
          },
          {
            "@type": "State",
            "name": "Bihar"
          }
        ],
        "founder": {
          "@type": "Person",
          "name": businessConfig.owner.name.en,
          "jobTitle": businessConfig.owner.title.en
        },
        "knowsAbout": [
          "Digital Document Printing",
          "Commercial Offset Printing",
          "Visiting Cards Printing",
          "Wedding Invitation Cards",
          "Instant Passport Size Photos",
          "School & Corporate PVC ID Cards",
          "Flex Banners and Vinyl Signage",
          "Common Services Centre (CSC) Government Schemes",
          "Website and Web Application Development"
        ],
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Printing & Online Citizen Services Catalog",
          "itemListElement": servicesData.slice(0, 12).map((s) => ({
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": s.name.en,
              "description": s.description.en,
              "provider": {
                "@id": `${CANONICAL_DOMAIN}/#localbusiness`
              }
            }
          }))
        }
      },

      // 2. Organization Entity
      {
        "@type": "Organization",
        "@id": `${CANONICAL_DOMAIN}/#organization`,
        "name": businessConfig.name.en,
        "alternateName": businessConfig.associatedName.en,
        "taxID": business.registrations.gstin,
        "vatID": business.registrations.gstin,
        "url": CANONICAL_DOMAIN,
        "logo": `${CANONICAL_DOMAIN}/logo.webp`,
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "telephone": `+91${businessConfig.phoneNumbers.primary}`,
            "contactType": "customer service",
            "areaServed": "IN",
            "availableLanguage": ["en", "hi"]
          },
          {
            "@type": "ContactPoint",
            "telephone": `+91${businessConfig.phoneNumbers.secondary}`,
            "contactType": "technical support",
            "areaServed": "IN",
            "availableLanguage": ["en", "hi"]
          }
        ]
      },

      // 3. WebSite Entity with SearchAction
      {
        "@type": "WebSite",
        "@id": `${CANONICAL_DOMAIN}/#website`,
        "url": CANONICAL_DOMAIN,
        "name": "Palak Enterprises",
        "alternateName": "Palak Printing Press Chakia",
        "inLanguage": ["en-IN", "hi-IN"],
        "publisher": {
          "@id": `${CANONICAL_DOMAIN}/#organization`
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${CANONICAL_DOMAIN}/services?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
    />
  );
};

