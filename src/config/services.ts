export type ServiceCategoryId =
  | "printing"
  | "stationery"
  | "photo-id"
  | "wedding-invitations"
  | "design"
  | "government"
  | "online-services"
  | "pension"
  | "agriculture"
  | "land"
  | "banking"
  | "website-development";

export type ServiceCtaType =
  | "quote"
  | "design"
  | "assistance"
  | "help"
  | "service"
  | "discuss";

export interface ServiceSubcategory {
  id: string;
  categoryId: ServiceCategoryId;
  slug: string;
  name: { en: string; hi: string };
  description?: { en: string; hi: string };
  sortOrder: number;
}

export interface ServiceCategory {
  id: ServiceCategoryId;
  slug: string;
  name: { en: string; hi: string };
  shortName: { en: string; hi: string };
  description: { en: string; hi: string };
  icon: string;
  iconName?: string;
  image?: string;
  sortOrder: number;
  subcategories: ServiceSubcategory[];
}

export interface ServiceFaq {
  question: { en: string; hi: string };
  answer: { en: string; hi: string };
}

export interface ServiceOption {
  label: { en: string; hi: string };
  values: { en: string; hi: string }[];
}

export interface ServiceProcessStep {
  step: number;
  title: { en: string; hi: string };
  description: { en: string; hi: string };
}

export interface Service {
  id: string;
  slug: string;
  categoryId: ServiceCategoryId;
  subcategoryId: string;
  name: { en: string; hi: string };
  shortDescription: { en: string; hi: string };
  description: { en: string; hi: string };
  icon: string;
  iconName?: string;
  image?: string;
  ctaType: ServiceCtaType;
  featured?: boolean;
  popular?: boolean;
  popularRank?: number;
  options?: ServiceOption[];
  process?: ServiceProcessStep[];
  suitableFor?: { en: string; hi: string }[];
  faqs?: ServiceFaq[];
  relatedServiceIds?: string[];
  aliases?: string[];
  tags?: string[];
  disclaimer?: { en: string; hi: string };
  sampleFallbackType?: string;
  sortOrder: number;
}

export const categories: ServiceCategory[] = [
  {
    id: "printing",
    slug: "printing",
    name: {
      en: "Printing & Commercial Printing",
      hi: "प्रिंटिंग व व्यावसायिक ऑफसेट प्रिंटिंग",
    },
    shortName: { en: "Printing", hi: "प्रिंटिंग" },
    description: {
      en: "High-resolution offset, digital, multicolor document, flex banner, poster and invitation printing services.",
      hi: "हाई-रेजोल्यूशन ऑफसेट, डिजिटल, मल्टीकलर डॉक्यूमेंट, फ्लेक्स बैनर, पोस्टर और शादी कार्ड प्रिंटिंग।",
    },
    icon: "Printer",
    sortOrder: 1,
    subcategories: [
      {
        id: "document-printing",
        categoryId: "printing",
        slug: "document-printing",
        name: { en: "Document Printing", hi: "दस्तावेज़ प्रिंटिंग" },
        sortOrder: 1,
      },
      {
        id: "commercial-printing",
        categoryId: "printing",
        slug: "commercial-printing",
        name: { en: "Commercial & Promotional Printing", hi: "व्यावसायिक व प्रचार प्रिंटिंग" },
        sortOrder: 2,
      },
      {
        id: "invitation-printing",
        categoryId: "printing",
        slug: "invitation-printing",
        name: { en: "Invitation Printing", hi: "निमंत्रण पत्र प्रिंटिंग" },
        sortOrder: 3,
      },
      {
        id: "finishing-binding",
        categoryId: "printing",
        slug: "finishing-binding",
        name: { en: "Finishing & Binding", hi: "लैमिनेशन व बाइंडिंग" },
        sortOrder: 4,
      },
    ],
  },
  {
    id: "stationery",
    slug: "stationery",
    name: {
      en: "Business & Office Stationery",
      hi: "व्यावसायिक व ऑफिस स्टेशनरी",
    },
    shortName: { en: "Stationery", hi: "स्टेशनरी" },
    description: {
      en: "Custom letterheads, bill books, registers, school notebooks, envelopes, and desk supplies for organizations.",
      hi: "कस्टम लेटरहेड, बिल बुक, लेजर रजिस्टर, कॉपियाँ, लिफाफे और ऑफिस स्टेशनरी उत्पाद।",
    },
    icon: "FileText",
    sortOrder: 2,
    subcategories: [
      {
        id: "business-stationery",
        categoryId: "stationery",
        slug: "business-stationery",
        name: { en: "Business Stationery", hi: "व्यावसायिक स्टेशनरी" },
        sortOrder: 1,
      },
      {
        id: "office-school-supplies",
        categoryId: "stationery",
        slug: "office-school-supplies",
        name: { en: "Office & School Supplies", hi: "स्कूल व ऑफिस सामग्री" },
        sortOrder: 2,
      },
      {
        id: "business-identity",
        categoryId: "stationery",
        slug: "business-identity",
        name: { en: "Business & School Identity", hi: "पहचान पत्र व बैज" },
        sortOrder: 3,
      },
    ],
  },
  {
    id: "photo-id",
    slug: "photo-id",
    name: {
      en: "Photo, ID & Document Services",
      hi: "फोटो, आईडी कार्ड व दस्तावेज़ सेवाएँ",
    },
    shortName: { en: "Photo & ID", hi: "फोटो व आईडी" },
    description: {
      en: "Instant passport photos, studio photo printing, PVC smart cards, lamination, high-speed scanning, and thesis binding.",
      hi: "तत्काल पासपोर्ट फोटो, स्टूडियो प्रिंटिंग, पीवीसी स्मार्ट आईडी कार्ड, लैमिनेशन, स्कैनिंग व बाइंडिंग।",
    },
    icon: "Camera",
    sortOrder: 3,
    subcategories: [
      {
        id: "photo-studio",
        categoryId: "photo-id",
        slug: "photo-studio",
        name: { en: "Photo Studio Services", hi: "फोटो स्टूडियो सेवाएँ" },
        sortOrder: 1,
      },
      {
        id: "pvc-cards",
        categoryId: "photo-id",
        slug: "pvc-cards",
        name: { en: "PVC Cards & ID Badges", hi: "पीवीसी कार्ड व बैज" },
        sortOrder: 2,
      },
      {
        id: "document-finishing",
        categoryId: "photo-id",
        slug: "document-finishing",
        name: { en: "Document Finishing & Binding", hi: "दस्तावेज़ फिनिशिंग व बाइंडिंग" },
        sortOrder: 3,
      },
    ],
  },
  {
    id: "wedding-invitations",
    slug: "wedding-invitations",
    name: {
      en: "Wedding & Invitation Services",
      hi: "शादी व मांगलिक निमंत्रण कार्ड",
    },
    shortName: { en: "Invitations", hi: "शादी कार्ड्स" },
    description: {
      en: "Traditional & premium modern wedding cards, Tilak, Mundan, Birthday invites, condolence cards, and custom biodata.",
      hi: "पारंपरिक व आधुनिक शादी के कार्ड, तिलक, मुंडन, जन्मदिन निमंत्रण, शोक संदेश और विवाह बायोडाटा।",
    },
    icon: "Heart",
    sortOrder: 4,
    subcategories: [
      {
        id: "wedding-cards-sub",
        categoryId: "wedding-invitations",
        slug: "wedding-cards-sub",
        name: { en: "Wedding Cards", hi: "शादी के निमंत्रण कार्ड" },
        sortOrder: 1,
      },
      {
        id: "ceremony-invitations",
        categoryId: "wedding-invitations",
        slug: "ceremony-invitations",
        name: { en: "Ceremony & Event Invites", hi: "मांगलिक व उत्सव निमंत्रण" },
        sortOrder: 2,
      },
      {
        id: "invitation-design-sub",
        categoryId: "wedding-invitations",
        slug: "invitation-design-sub",
        name: { en: "Design & Custom Biodata", hi: "बायोडाटा व विशेष डिज़ाइन" },
        sortOrder: 3,
      },
    ],
  },
  {
    id: "design",
    slug: "design",
    name: {
      en: "Graphic & Creative Design",
      hi: "ग्राफिक व क्रिएटिव डिज़ाइन",
    },
    shortName: { en: "Design", hi: "डिज़ाइन" },
    description: {
      en: "Brand logos, advertising flex designs, banners, posters, social media creatives, resume formatting, and custom layouts.",
      hi: "व्यावसायिक लोगो, विज्ञापन पोस्टर व बैनर डिज़ाइन, सोशल मीडिया पोस्ट, रिज्यूमे और कस्टम लेआउट।",
    },
    icon: "Sparkles",
    sortOrder: 5,
    subcategories: [
      {
        id: "brand-identity",
        categoryId: "design",
        slug: "brand-identity",
        name: { en: "Brand Identity Design", hi: "ब्रांड पहचान व लोगो डिज़ाइन" },
        sortOrder: 1,
      },
      {
        id: "marketing-creatives",
        categoryId: "design",
        slug: "marketing-creatives",
        name: { en: "Marketing & Poster Creatives", hi: "प्रचार पोस्टर व बैनर डिज़ाइन" },
        sortOrder: 2,
      },
      {
        id: "personal-business-design",
        categoryId: "design",
        slug: "personal-business-design",
        name: { en: "Personal & Document Layouts", hi: "व्यक्तिगत व दस्तावेज़ डिज़ाइन" },
        sortOrder: 3,
      },
    ],
  },
  {
    id: "government",
    slug: "government",
    name: {
      en: "Government & Certificate Services",
      hi: "सरकारी प्रमाण पत्र व दस्तावेज़ सहायता",
    },
    shortName: { en: "Government Services", hi: "सरकारी सेवाएँ" },
    description: {
      en: "Assistance with RTPS Caste/Income/Residence certificates, PAN Card applications, Aadhaar print, and Ayushman cards.",
      hi: "आरटीपीएस जाति, आय, निवास प्रमाण पत्र, पैन कार्ड, आधार कार्ड प्रिंट और आयुष्मान कार्ड ऑनलाइन सहायता।",
    },
    icon: "FileCheck",
    sortOrder: 6,
    subcategories: [
      {
        id: "rtps-certificates",
        categoryId: "government",
        slug: "rtps-certificates",
        name: { en: "RTPS Certificates", hi: "जाति, आय व निवास प्रमाण पत्र" },
        sortOrder: 1,
      },
      {
        id: "identity-government",
        categoryId: "government",
        slug: "identity-government",
        name: { en: "PAN & Aadhaar Assistance", hi: "पैन, आधार व आयुष्मान सहायता" },
        sortOrder: 2,
      },
      {
        id: "admit-scorecard",
        categoryId: "government",
        slug: "admit-scorecard",
        name: { en: "Admit Cards & Results", hi: "एडमिट कार्ड व परीक्षा परिणाम" },
        sortOrder: 3,
      },
    ],
  },
  {
    id: "online-services",
    slug: "online-services",
    name: {
      en: "Online Forms & Applications",
      hi: "ऑनलाइन फॉर्म व आवेदन सेवाएँ",
    },
    shortName: { en: "Online Forms", hi: "ऑनलाइन फॉर्म" },
    description: {
      en: "Application filling for SSC, Railway, BPSC, Police, School/College admissions, scholarships, document resizing, and uploads.",
      hi: "एसएससी, रेलवे, बीपीएससी, पुलिस भर्ती, स्कूल-कॉलेज एडमिशन और छात्रवृत्ति के ऑनलाइन फॉर्म आवेदन।",
    },
    icon: "ClipboardList",
    sortOrder: 7,
    subcategories: [
      {
        id: "job-forms",
        categoryId: "online-services",
        slug: "job-forms",
        name: { en: "Government Job Forms", hi: "सरकारी नौकरी आवेदन" },
        sortOrder: 1,
      },
      {
        id: "education-forms",
        categoryId: "online-services",
        slug: "education-forms",
        name: { en: "Education & Admission Forms", hi: "एडमिशन व छात्रवृत्ति फॉर्म" },
        sortOrder: 2,
      },
      {
        id: "document-upload-assistance",
        categoryId: "online-services",
        slug: "document-upload-assistance",
        name: { en: "Document & Photo Resizing Assistance", hi: "डॉक्यूमेंट अपलोड व रीसाइज़िंग" },
        sortOrder: 3,
      },
    ],
  },
  {
    id: "pension",
    slug: "pension",
    name: {
      en: "Pension & Social Security",
      hi: "पेंशन व सामाजिक सुरक्षा योजनाएँ",
    },
    shortName: { en: "Pension & Welfare", hi: "पेंशन योजनाएँ" },
    description: {
      en: "Facilitation for Old Age, Widow, Disability pension schemes, Jeevan Pramaan KYC, e-Shram cards, and Ration card assistance.",
      hi: "वृद्धा, विधवा, दिव्यांग पेंशन ऑनलाइन आवेदन, जीवन प्रमाण बायोमेट्रिक ई-केवाईसी, ई-श्रम और राशन कार्ड।",
    },
    icon: "HeartHandshake",
    sortOrder: 8,
    subcategories: [
      {
        id: "social-pension",
        categoryId: "pension",
        slug: "social-pension",
        name: { en: "Pension Applications & KYC", hi: "पेंशन आवेदन व ई-केवाईसी" },
        sortOrder: 1,
      },
      {
        id: "welfare-cards",
        categoryId: "pension",
        slug: "welfare-cards",
        name: { en: "e-Shram & Ration Card", hi: "ई-श्रम व राशन कार्ड सेवाएँ" },
        sortOrder: 2,
      },
    ],
  },
  {
    id: "agriculture",
    slug: "agriculture",
    name: {
      en: "Agriculture & Farmer Services",
      hi: "कृषि व किसान सेवा केंद्र",
    },
    shortName: { en: "Agriculture", hi: "किसान सेवाएँ" },
    description: {
      en: "DBT Bihar farmer registration, PM-Kisan Samman Nidhi application & e-KYC, status tracking, and Crop Insurance assistance.",
      hi: "डीबीटी किसान पंजीकरण, पीएम किसान सम्मान निधि आवेदन व ई-केवाईसी, स्थिति जाँच व फसल बीमा सहायता।",
    },
    icon: "Sprout",
    sortOrder: 9,
    subcategories: [
      {
        id: "pm-kisan-dbt",
        categoryId: "agriculture",
        slug: "pm-kisan-dbt",
        name: { en: "Farmer Registration & PM-Kisan", hi: "किसान रजिस्ट्रेशन व पीएम-किसान" },
        sortOrder: 1,
      },
      {
        id: "crop-insurance",
        categoryId: "agriculture",
        slug: "crop-insurance",
        name: { en: "Crop Insurance & Schemes", hi: "फसल बीमा व सरकारी योजनाएँ" },
        sortOrder: 2,
      },
    ],
  },
  {
    id: "land",
    slug: "land",
    name: {
      en: "Land & Revenue Services",
      hi: "भूमि व राजस्व सहायता सेवाएँ",
    },
    shortName: { en: "Land Records", hi: "जमीन रसीद" },
    description: {
      en: "Assistance with Bihar Bhumi portal, online land tax (Lagan) payment, receipt downloads, mutation (Dakhil-Kharij) tracking.",
      hi: "बिहार भूमि पोर्टल सहायता, ऑनलाइन जमीन लगान रसीद भुगतान, जमाबंदी नकल और दाखिल-खारिज स्थिति।",
    },
    icon: "Landmark",
    sortOrder: 10,
    subcategories: [
      {
        id: "mutation-dakhil-kharij",
        categoryId: "land",
        slug: "mutation-dakhil-kharij",
        name: { en: "Mutation / Dakhil-Kharij", hi: "दाखिल-खारिज ऑनलाइन सहायता" },
        sortOrder: 1,
      },
      {
        id: "lagan-jamabandi",
        categoryId: "land",
        slug: "lagan-jamabandi",
        name: { en: "Lagan Payment & Jamabandi", hi: "भू-लगान भुगतान व जमाबंदी" },
        sortOrder: 2,
      },
    ],
  },
  {
    id: "banking",
    slug: "banking",
    name: {
      en: "Banking, Recharge & Utility Services",
      hi: "बैंकिंग, मोबाइल रिचार्ज व बिल भुगतान",
    },
    shortName: { en: "Banking & Utilities", hi: "बिल व रिचार्ज" },
    description: {
      en: "Domestic money transfers, electricity bill payments, prepaid mobile recharges, DTH top-ups, and utility payments.",
      hi: "घरेलू मनी ट्रांसफर, बिजली बिल भुगतान, मोबाइल रिचार्ज, डीटीएच टॉप-अप और उपयोगिता बिल भुगतान।",
    },
    icon: "Banknote",
    sortOrder: 11,
    subcategories: [
      {
        id: "money-transfer",
        categoryId: "banking",
        slug: "money-transfer",
        name: { en: "Domestic Money Transfer", hi: "घरेलू मनी ट्रांसफर" },
        sortOrder: 1,
      },
      {
        id: "recharge-bills",
        categoryId: "banking",
        slug: "recharge-bills",
        name: { en: "Recharge & Utility Bills", hi: "मोबाइल/डीटीएच रिचार्ज व बिल" },
        sortOrder: 2,
      },
    ],
  },
  {
    id: "website-development",
    slug: "website-development",
    name: {
      en: "Website & Digital Business Services",
      hi: "वेबसाइट निर्माण व डिजिटल व्यवसाय समाधान",
    },
    shortName: { en: "Website & Digital", hi: "वेबसाइट निर्माण" },
    description: {
      en: "Modern websites for schools, coaching institutes, local shops, businesses, Google Business profile setup, and web maintenance.",
      hi: "स्कूलों, कोचिंग संस्थानों, दुकानों और व्यवसायों के लिए आधुनिक वेबसाइट और गूगल बिजनेस प्रोफाइल सेटअप।",
    },
    icon: "MonitorSmartphone",
    sortOrder: 12,
    subcategories: [
      {
        id: "web-development-sub",
        categoryId: "website-development",
        slug: "web-development-sub",
        name: { en: "Website Design & Development", hi: "वेबसाइट डिज़ाइन व डेवलपमेंट" },
        sortOrder: 1,
      },
      {
        id: "digital-business-setup",
        categoryId: "website-development",
        slug: "digital-business-setup",
        name: { en: "Digital Business & Google Setup", hi: "गूगल बिजनेस व डिजिटल सेटअप" },
        sortOrder: 2,
      },
    ],
  },
];

// Helper to get CTA label
export const ctaLabels: Record<
  ServiceCtaType,
  { en: string; hi: string }
> = {
  quote: { en: "Get Quote", hi: "कोटेशन प्राप्त करें" },
  design: { en: "Request Design", hi: "डिज़ाइन ऑर्डर करें" },
  assistance: { en: "Get Assistance", hi: "सहायता प्राप्त करें" },
  help: { en: "Get Help", hi: "मदद प्राप्त करें" },
  service: { en: "Request Service", hi: "सेवा प्राप्त करें" },
  discuss: { en: "Discuss Project", hi: "प्रोजेक्ट पर बात करें" },
};

// =========================================================================
// CANONICAL SERVICE REPOSITORY
// =========================================================================
export const services: Service[] = [
  // -----------------------------------------------------------------------
  // 1. PRINTING & COMMERCIAL PRINTING (`printing`)
  // -----------------------------------------------------------------------
  {
    id: "visiting-cards",
    slug: "visiting-cards",
    categoryId: "printing",
    subcategoryId: "commercial-printing",
    name: { en: "Visiting Cards Printing", hi: "विजिटिंग कार्ड प्रिंटिंग" },
    shortDescription: {
      en: "Premium matte, glossy, textured, and embossed business visiting cards in bulk.",
      hi: "मैट, ग्लॉसी, टेक्सचर्ड और एम्बॉस फिनिश में प्रीमियम बिजनेस विजिटिंग कार्ड।",
    },
    description: {
      en: "Create a powerful professional impression with high-quality offset and digital business visiting cards. Choose from standard 300/350 GSM cards, velvet touch, spot UV gloss, metallic accents, and rounded corner cuts.",
      hi: "अपने व्यापार और पेशे के लिए उच्च गुणवत्ता वाले विजिटिंग कार्ड्स प्रिंट करवाएं। 300/350 जीएसएम पेपर, मैट लेमिनेशन, ग्लॉस फिनिश, स्पॉट यूवी और कॉर्नर कटिंग के कई विकल्प उपलब्ध हैं।",
    },
    icon: "CreditCard",
    image: "/gallery/visiting-cards-sample.svg",
    ctaType: "quote",
    featured: true,
    popularRank: 1,
    options: [
      {
        label: { en: "Paper Finish", hi: "पेपर फिनिश" },
        values: [
          { en: "Matte Lamination", hi: "मैट लेमिनेशन" },
          { en: "Glossy Finish", hi: "ग्लॉसी फिनिश" },
          { en: "Velvet Soft-Touch", hi: "वेलवेट सॉफ्ट-टच" },
          { en: "Spot UV Highlighting", hi: "स्पॉट यूवी" },
          { en: "Textured Metallic", hi: "टेक्सचर्ड मैटेलिक" },
        ],
      },
      {
        label: { en: "Sides", hi: "प्रिंटिंग साइड" },
        values: [
          { en: "Single-sided Print", hi: "सिंगल साइड" },
          { en: "Double-sided Multicolor", hi: "डबल साइड मल्टीकलर" },
        ],
      },
      {
        label: { en: "Quantities", hi: "मात्रा विकल्प" },
        values: [
          { en: "100 Cards (Sample/Quick)", hi: "100 कार्ड्स" },
          { en: "500 Cards (Standard)", hi: "500 कार्ड्स" },
          { en: "1,000 Cards (Bulk Value)", hi: "1,000 कार्ड्स" },
          { en: "2,000+ Cards (Wholesale)", hi: "2,000+ कार्ड्स" },
        ],
      },
    ],
    process: [
      {
        step: 1,
        title: { en: "Share Requirement", hi: "विवरण साझा करें" },
        description: {
          en: "Provide business details, logo, contact info, or upload an existing design.",
          hi: "कंपनी का नाम, लोगो, मोबाइल, पता और अपनी पसंद साझा करें।",
        },
      },
      {
        step: 2,
        title: { en: "Design Proof Approval", hi: "डिज़ाइन प्रूफ़ देखें" },
        description: {
          en: "We generate a digital mockup and verify spellings, colors, and layout.",
          hi: "हम डिजिटल लेआउट बनाकर व्हाट्सएप पर अंतिम स्वीकृति के लिए भेजते हैं।",
        },
      },
      {
        step: 3,
        title: { en: "Precision Printing", hi: "उच्च-गुणवत्ता प्रिंटिंग" },
        description: {
          en: "Printed on heavy GSM paper using high-speed offset or digital presses.",
          hi: "मजबूत जीएसएम पेपर पर साफ और चमकदार मल्टीकलर प्रिंटिंग की जाती है।",
        },
      },
      {
        step: 4,
        title: { en: "Finishing & Cutting", hi: "कटिंग व फिनिशिंग" },
        description: {
          en: "Lamination, spot UV, and hydraulic precision edge cutting.",
          hi: "मैट/ग्लॉस लैमिनेशन और हाइड्रोलिक कटर से सटीक किनारों की कटिंग।",
        },
      },
      {
        step: 5,
        title: { en: "Collection / Delivery", hi: "प्राप्ति या डिलीवरी" },
        description: {
          en: "Collect from our Chakia center or opt for safe dispatch.",
          hi: "चकिया सेंटर से प्राप्त करें या डिलीवरी विकल्प चुनें।",
        },
      },
    ],
    suitableFor: [
      { en: "Retail Shops & Store Owners", hi: "दुकानदार व खुदरा विक्रेता" },
      { en: "Doctors, Clinics & Hospitals", hi: "डॉक्टर व क्लीनिक" },
      { en: "Lawyers, CAs & Consultants", hi: "वकील, सीए और सलाहकार" },
      { en: "Coaching Centers & Teachers", hi: "कोचिंग संस्थान व शिक्षक" },
      { en: "Contractors & Service Providers", hi: "ठेकेदार व सेवा प्रदाता" },
    ],
    faqs: [
      {
        question: {
          en: "What is the standard turnaround time for visiting card printing?",
          hi: "विजिटिंग कार्ड प्रिंटिंग में कितना समय लगता है?",
        },
        answer: {
          en: "Digital urgent cards can be printed same day or within 24 hours. Offset bulk runs (500–1000 cards) typically take 2–3 business days for optimal finish.",
          hi: "डिजिटल अर्जेंट कार्ड 24 घंटे में तैयार हो जाते हैं। 500 या 1000 कार्ड्स के बड़े ऑफसेट लॉट में 2-3 दिन का समय लगता है।",
        },
      },
      {
        question: {
          en: "Can you design my visiting card if I don't have artwork?",
          hi: "क्या आप कार्ड का डिज़ाइन भी तैयार करते हैं?",
        },
        answer: {
          en: "Yes, our in-house graphic designers will create a clean, modern layout with your logo and details before printing.",
          hi: "हाँ, हमारे ग्राफिक डिज़ाइनर आपके लोगो और जानकारी के साथ आकर्षक डिज़ाइन तैयार करते हैं।",
        },
      },
      {
        question: {
          en: "What paper thickness is used?",
          hi: "किस मोटाई का पेपर इस्तेमाल होता है?",
        },
        answer: {
          en: "We offer 300 GSM art card, 350 GSM premium imported board, and heavy textured sheets.",
          hi: "हम 300 जीएसएम आर्ट कार्ड, 350 जीएसएम प्रीमियम बोर्ड और टेक्सचर्ड पेपर का उपयोग करते हैं।",
        },
      },
    ],
    relatedServiceIds: [
      "visiting-card-design",
      "letterheads",
      "pamphlets-flyers",
      "bill-books",
      "pvc-id-cards",
    ],
    aliases: [
      "business card",
      "visiting card",
      "visiting card printing",
      "name card",
      "विजिटिंग कार्ड",
      "कार्ड प्रिंटिंग",
    ],
    sampleFallbackType: "visiting-card",
    sortOrder: 1,
  },
  {
    id: "pamphlets-flyers",
    slug: "pamphlets-flyers",
    categoryId: "printing",
    subcategoryId: "commercial-printing",
    name: { en: "Pamphlets & Advertising Flyers", hi: "पम्पलेट व प्रचार फ्लायर्स" },
    shortDescription: {
      en: "Single & double-sided A4/A5 advertising pamphlets with sharp multicolor print.",
      hi: "प्रचार और विज्ञापनों के लिए स्पष्ट मल्टीकलर सिंगल व डबल साइड पम्पलेट।",
    },
    description: {
      en: "Promote your school admissions, coaching batches, store inaugurations, seasonal offers, and events with high-volume advertising pamphlets printed on newsprint, 70 GSM maplitho, or 100/130 GSM glossy art paper.",
      hi: "स्कूल एडमिशन, कोचिंग बैच, दुकान के उद्घाटन या विशेष ऑफर के प्रचार के लिए 1/8, A5 और A4 साइज में हाई-स्पीड रंगीन और सिंगल कलर पम्पलेट प्रिंटिंग।",
    },
    icon: "Newspaper",
    image: "/gallery/promotional-poster-sample.svg",
    ctaType: "quote",
    featured: false,
    options: [
      {
        label: { en: "Paper Type", hi: "पेपर प्रकार" },
        values: [
          { en: "Lightweight Promo (60-70 GSM)", hi: "हल्का प्रचार पेपर (60-70 GSM)" },
          { en: "Standard Maplitho (80 GSM)", hi: "मानक मैपलिथो (80 GSM)" },
          { en: "Glossy Art Paper (100-130 GSM)", hi: "चमकदार आर्ट पेपर (100-130 GSM)" },
        ],
      },
      {
        label: { en: "Size", hi: "साइज" },
        values: [
          { en: "A5 (1/8 Royal standard handbill)", hi: "A5 / 1/8 साइज" },
          { en: "A4 (Full page leaflet)", hi: "A4 साइज" },
          { en: "Custom 1/4 Size", hi: "कस्टम 1/4 साइज" },
        ],
      },
    ],
    process: [
      {
        step: 1,
        title: { en: "Share Content", hi: "मैटर व सामग्री दें" },
        description: {
          en: "Provide headline, dates, offers, and contact info.",
          hi: "प्रचार का मैटर, तारीखें, ऑफर और फोन नंबर साझा करें।",
        },
      },
      {
        step: 2,
        title: { en: "Layout Proof", hi: "प्रूफ़ जांचें" },
        description: {
          en: "We design eye-catching text and imagery for proofing.",
          hi: "हम आकर्षक लेआउट बनाकर व्हाट्सएप पर प्रूफ़ भेजते हैं।",
        },
      },
      {
        step: 3,
        title: { en: "High-Volume Print", hi: "थोक प्रिंटिंग" },
        description: {
          en: "Offset multi-thousand run for maximum cost economy.",
          hi: "थोक ऑफसेट प्रिंटिंग से सबसे कम दर पर प्रिंट तैयार होता है।",
        },
      },
      {
        step: 4,
        title: { en: "Bundle & Dispatch", hi: "बंडल व डिलीवरी" },
        description: {
          en: "Neatly tied bundles of 500 or 1,000 ready for newspaper inserts.",
          hi: "अखबार में डलवाने हेतु 500-1000 के बंडल तैयार किए जाते हैं।",
        },
      },
    ],
    suitableFor: [
      { en: "Coaching Classes & Tuitions", hi: "कोचिंग क्लासेस व ट्यूशन" },
      { en: "Schools & Colleges", hi: "स्कूल व कॉलेज" },
      { en: "Electronics & Clothes Stores", hi: "कपड़ा व इलेक्ट्रॉनिक्स शोरूम" },
      { en: "Local Events & Melas", hi: "स्थानीय मेले व आयोजन" },
    ],
    faqs: [
      {
        question: {
          en: "What is the minimum quantity for flyer printing?",
          hi: "पम्पलेट प्रिंटिंग की न्यूनतम मात्रा क्या है?",
        },
        answer: {
          en: "Offset economical runs start at 1,000 or 2,000 copies. Short runs (100–500) can also be printed on digital machines.",
          hi: "ऑफसेट प्रिंटिंग में 1000 या 2000 प्रतियों से शुरुआत होती है। अर्जेंट जरूरत के लिए कम मात्रा डिजिटल पर भी संभव है।",
        },
      },
    ],
    relatedServiceIds: [
      "brochures-catalogs",
      "posters-printing",
      "flex-banners",
      "visiting-cards",
    ],
    aliases: ["pamphlet", "flyer", "handbill", "पम्पलेट", "हैंडबिल", "पर्चा"],
    sampleFallbackType: "flyer",
    sortOrder: 2,
  },
  {
    id: "brochures-catalogs",
    slug: "brochures-catalogs",
    categoryId: "printing",
    subcategoryId: "commercial-printing",
    name: { en: "Brochures & Product Catalogs", hi: "ब्रोशर व प्रोडक्ट कैटलॉग" },
    shortDescription: {
      en: "Bi-fold and tri-fold corporate brochures detailing company services and products.",
      hi: "कंपनी और व्यावसायिक जानकारी प्रदर्शित करने वाले फोल्डेड ब्रोशर व कैटलॉग।",
    },
    description: {
      en: "Showcase your full line of products and professional services with high-impact corporate brochures. We offer 2-fold, 3-fold, and multi-page stapled or perfect-bound product catalogs on premium coated paper with gloss or matte finish.",
      hi: "अपने उत्पादों और सेवाओं का संपूर्ण विवरण देने के लिए दो-तह, तीन-तह वाले ब्रोशर और मल्टी-पेज कैटलॉग तैयार करवाएं।",
    },
    icon: "BookOpen",
    image: "/gallery/trifold-brochure-sample.svg",
    ctaType: "quote",
    featured: false,
    options: [
      {
        label: { en: "Fold Type", hi: "फोल्ड का प्रकार" },
        values: [
          { en: "Bi-Fold (4 Panels)", hi: "बाय-फोल्ड (4 पेज)" },
          { en: "Tri-Fold (6 Panels)", hi: "ट्राई-फोल्ड (6 पेज)" },
          { en: "Multi-page Booklet", hi: "मल्टी-पेज बुकलेट" },
        ],
      },
    ],
    suitableFor: [
      { en: "Hospitals, Clinics & Labs", hi: "अस्पताल व पैथोलॉजी लैब" },
      { en: "Corporate Offices & Agencies", hi: "कंपनियां व एजेंसियां" },
      { en: "Educational Campuses", hi: "शैक्षणिक संस्थान" },
    ],
    relatedServiceIds: ["pamphlets-flyers", "visiting-cards", "posters-printing"],
    aliases: ["brochure", "catalog", "catalogue", "booklet", "ब्रोशर", "कैटलॉग"],
    sampleFallbackType: "brochure",
    sortOrder: 3,
  },
  {
    id: "posters-printing",
    slug: "posters-printing",
    categoryId: "printing",
    subcategoryId: "commercial-printing",
    name: { en: "Promotional & Event Posters", hi: "पोस्टर प्रिंटिंग" },
    shortDescription: {
      en: "High-resolution indoor & outdoor promotional posters for events, shops, and institutions.",
      hi: "दुकान, कोचिंग और आयोजनों के लिए उच्च गुणवत्ता वाले रंगीन पोस्टर प्रिंटिंग।",
    },
    description: {
      en: "Vibrant high-resolution wall posters in A3, 12x18, and large formats on heavy gloss art paper or synthetic tear-resistant media.",
      hi: "दीवारों, नोटिस बोर्ड और आयोजनों के लिए 12x18 और A3 साइज में चमकदार और टिकाऊ रंगीन पोस्टर प्रिंटिंग।",
    },
    icon: "Image",
    image: "/gallery/promotional-poster-sample.svg",
    ctaType: "quote",
    featured: false,
    suitableFor: [
      { en: "Schools, Colleges & Hostels", hi: "स्कूल, कॉलेज व हॉस्टल" },
      { en: "Religious & Cultural Gatherings", hi: "धार्मिक व सांस्कृतिक कार्यक्रम" },
    ],
    relatedServiceIds: ["flex-banners", "pamphlets-flyers"],
    aliases: ["poster", "wall poster", "event poster", "पोस्टर"],
    sampleFallbackType: "flyer",
    sortOrder: 4,
  },
  {
    id: "flex-banners",
    slug: "flex-banners",
    categoryId: "printing",
    subcategoryId: "commercial-printing",
    name: { en: "Flex Banners & Hoardings", hi: "फ्लेक्स बैनर व होर्डिंग्स" },
    shortDescription: {
      en: "Weatherproof heavy vinyl flex banners for shopfronts, political campaigns, and exhibitions.",
      hi: "दुकानों और विज्ञापनों के लिए वाटरप्रूफ और टिकाऊ फ्लेक्स बैनर प्रिंट।",
    },
    description: {
      en: "Durable all-weather outdoor flex banners and hoardings printed with vibrant UV solvent inks. Available in normal, star flex, black-back, and backlit varieties with eyelets, framing support, and reinforced hems.",
      hi: "दुकान के बोर्ड, चुनाव प्रचार, उत्सवों और विज्ञापनों के लिए उच्च रेजोल्यूशन विनाइल फ्लेक्स बैनर। नॉर्मल फ्लेक्स, स्टार फ्लेक्स और बैकलाइट बोर्ड उपलब्ध हैं।",
    },
    icon: "Layers",
    image: "/images/palak-printing-press-banner.jpeg",
    ctaType: "quote",
    featured: true,
    popularRank: 8,
    options: [
      {
        label: { en: "Quality Type", hi: "क्वालिटी प्रकार" },
        values: [
          { en: "Normal Vinyl Flex (Outdoor)", hi: "नॉर्मल विनाइल फ्लेक्स" },
          { en: "Star Flex (High Gloss & Heavy)", hi: "स्टार फ्लेक्स (प्रीमियम शाइन)" },
          { en: "Black Back Flex (Opaque)", hi: "ब्लैक बैक फ्लेक्स" },
          { en: "Backlit Light-Box Flex", hi: "बैकलाइट बोर्ड फ्लेक्स" },
        ],
      },
    ],
    suitableFor: [
      { en: "Shops & Showrooms", hi: "दुकानें व शोरूम" },
      { en: "Campaigns & Rallies", hi: "प्रचार व सभाएं" },
      { en: "Stage Backdrops & Events", hi: "स्टेज बैकड्रॉप व कार्यक्रम" },
    ],
    relatedServiceIds: ["poster-banner-design", "posters-printing"],
    aliases: ["flex", "banner", "hoarding", "flex board", "फ्लेक्स", "बैनर", "होर्डिंग"],
    sampleFallbackType: "banner",
    sortOrder: 5,
  },
  {
    id: "document-color-bw-print",
    slug: "document-color-bw-print",
    categoryId: "printing",
    subcategoryId: "document-printing",
    name: { en: "Digital Document Printing (Color & B/W)", hi: "डिजिटल डॉक्यूमेंट प्रिंटिंग (कलर व B/W)" },
    shortDescription: {
      en: "Crisp black & white and vivid color document printing on 75 GSM to 300 GSM papers.",
      hi: "सादे और ग्लॉसी पेपर पर साफ ब्लैक एंड व्हाइट और रंगीन डिजिटल प्रिंटिंग।",
    },
    description: {
      en: "High-speed laser printing for project reports, legal drafts, study materials, certificates, and multi-page books on crisp bond paper and heavy sheets.",
      hi: "प्रोजेक्ट रिपोर्ट, कानूनी दस्तावेज, नोट्स और किताबों की तुरंत लेजर ब्लैक एंड व्हाइट व कलर प्रिंटिंग सेवा।",
    },
    icon: "Printer",
    image: "/gallery/photocopy-color-print-sample.svg",
    ctaType: "quote",
    featured: false,
    options: [
      {
        label: { en: "Print Color", hi: "रंग प्रकार" },
        values: [
          { en: "Crisp Black & White Laser", hi: "ब्लैक एंड व्हाइट लेजर" },
          { en: "High-Resolution Full Color", hi: "फुल कलर हाई-रेजोल्यूशन" },
        ],
      },
    ],
    suitableFor: [
      { en: "Students & Researchers", hi: "छात्र व शोधकर्ता" },
      { en: "Lawyers & Notaries", hi: "अधिवक्ता व नोटरी" },
      { en: "Offices & Businesses", hi: "दफ्तर व व्यवसाय" },
    ],
    relatedServiceIds: ["photocopy-service", "spiral-binding-finishing", "lamination-finishing"],
    aliases: ["printout", "color print", "bw print", "कलर प्रिंट", "प्रिंटआउट"],
    sampleFallbackType: "photocopy",
    sortOrder: 6,
  },
  {
    id: "photocopy-service",
    slug: "photocopy-service",
    categoryId: "printing",
    subcategoryId: "document-printing",
    name: { en: "High-Speed Photocopy / Xerox", hi: "फोटोकॉपी / ज़ेरॉक्स सेवा" },
    shortDescription: {
      en: "Rapid single & double-sided photocopying for books, notes, forms, and legal documents.",
      hi: "पुस्तकों, नोट्स और कानूनी दस्तावेज़ों की तुरंत सिंगल व डबल साइड फोटोकॉपी।",
    },
    description: {
      en: "High-speed digital photocopying with consistent black contrast on premium 70/75 GSM paper. Ideal for student class notes, bulk test papers, books, government forms, and registry documents.",
      hi: "किताबों, नोट्स, कोर्ट कागजात और फॉर्म्स की साफ और तुरंत फोटोकॉपी सेवा। बल्क ऑर्डर पर विशेष रियायती दरें उपलब्ध हैं।",
    },
    icon: "Copy",
    image: "/gallery/photocopy-color-print-sample.svg",
    ctaType: "service",
    featured: true,
    popularRank: 4,
    suitableFor: [
      { en: "Students & Coaching Batches", hi: "विद्यार्थी व कोचिंग बैच" },
      { en: "Advocates & Courts", hi: "अधिवक्ता व कोर्ट कार्य" },
      { en: "General Public", hi: "आम नागरिक" },
    ],
    relatedServiceIds: ["document-color-bw-print", "spiral-binding-finishing", "lamination-finishing"],
    aliases: ["xerox", "photocopy", "photostat", "फोटोकॉपी", "ज़ेरॉक्स", "फोटोस्टेट"],
    sampleFallbackType: "photocopy",
    sortOrder: 7,
  },
  {
    id: "wedding-cards-printing",
    slug: "wedding-cards-printing",
    categoryId: "printing",
    subcategoryId: "invitation-printing",
    name: { en: "Wedding Invitation Card Printing", hi: "शादी के निमंत्रण कार्ड प्रिंटिंग" },
    shortDescription: {
      en: "Exquisite traditional & modern wedding invitations with gold foil, embossing, and custom inserts.",
      hi: "गोल्डन फॉयल और सुंदर एम्बॉसिंग वाले पारंपरिक व आधुनिक शादी के निमंत्रण पत्र।",
    },
    description: {
      en: "Premium marriage invitations printed in traditional Sanskrit/Hindi verse or modern English styling. Features foil stamping, laser cutting, velvet board, multi-leaf inserts, and matching printed envelopes.",
      hi: "शुभ विवाह के लिए पारंपरिक और आधुनिक निमंत्रण पत्र। गोल्डन फॉयल, एम्बॉसिंग, सुंदर लिफाफे और मांगलिक श्लोकों के साथ सटीक प्रिंटिंग।",
    },
    icon: "Heart",
    image: "/gallery/wedding-invitation-sample.svg",
    ctaType: "quote",
    featured: true,
    popularRank: 5,
    options: [
      {
        label: { en: "Card Style", hi: "कार्ड शैली" },
        values: [
          { en: "Traditional Folded Royal Cards", hi: "पारंपरिक रॉयल फोल्ड कार्ड" },
          { en: "Laser-Cut Floral Hardboard", hi: "लेजर-कट फ्लोरल बोर्ड" },
          { en: "Velvet Touch with Gold Foil", hi: "गोल्ड फॉयल वेलवेट कार्ड" },
          { en: "Modern Single Sheet Sleek", hi: "आधुनिक सिंगल शीट कार्ड" },
        ],
      },
    ],
    suitableFor: [
      { en: "Families Planning Weddings", hi: "विवाह समारोह वाले परिवार" },
    ],
    relatedServiceIds: ["ceremony-invitations-printing", "marriage-biodata-design"],
    aliases: ["wedding card", "shaadi card", "vivah card", "शादी कार्ड", "विवाह निमंत्रण"],
    sampleFallbackType: "wedding-card",
    sortOrder: 8,
  },
  {
    id: "ceremony-invitations-printing",
    slug: "ceremony-invitations-printing",
    categoryId: "printing",
    subcategoryId: "invitation-printing",
    name: { en: "Ceremony, Tilak & Event Invitations", hi: "तिलक, मुंडन व मांगलिक निमंत्रण" },
    shortDescription: {
      en: "Custom invitation cards for Tilak, Mundan, Griha Pravesh, Anniversaries, and Birthdays.",
      hi: "तिलक, मुंडन, गृह प्रवेश, वर्षगांठ और जन्मदिन समारोह के लिए कस्टम निमंत्रण कार्ड।",
    },
    description: {
      en: "Personalized invitation cards for auspicious family gatherings: Tilak, Upanayana (Janeu), Mundan, Griha Pravesh, Birthdays, and Anniversaries with matching envelopes.",
      hi: "तिलक समारोह, मुंडन, गृह प्रवेश, जन्मदिन और मांगलिक उत्सवों के लिए विशेष निमंत्रण पत्र प्रिंटिंग।",
    },
    icon: "PartyPopper",
    image: "/gallery/birthday-invitation-sample.svg",
    ctaType: "quote",
    featured: false,
    relatedServiceIds: ["wedding-cards-printing", "condolence-cards-printing"],
    aliases: ["tilak card", "mundan card", "birthday invite", "तिलक कार्ड", "मुंडन कार्ड"],
    sampleFallbackType: "birthday-invitation",
    sortOrder: 9,
  },
  {
    id: "condolence-cards-printing",
    slug: "condolence-cards-printing",
    categoryId: "printing",
    subcategoryId: "invitation-printing",
    name: { en: "Condolence & Shradh Cards", hi: "शोक-संदेश व श्राद्ध कार्ड" },
    shortDescription: {
      en: "Dignified and respectful condolence invitation cards and remembrance prints.",
      hi: "सम्मानपूर्वक तैयार किए गए शोक-संदेश और पुण्यतिथि निमंत्रण पत्र।",
    },
    description: {
      en: "Fast and respectful printing of Shradh, Terahvi, and condolence gathering cards with photo restoration and dignified formatting.",
      hi: "श्राद्ध, तेरहवीं और पुण्यतिथि सभा के लिए तुरंत और गरिमापूर्ण शोक संदेश प्रिंटिंग।",
    },
    icon: "FileText",
    image: "/gallery/condolence-card-sample.svg",
    ctaType: "quote",
    featured: false,
    aliases: ["shok sandesh", "condolence card", "terahvi card", "शोक संदेश"],
    sampleFallbackType: "condolence-card",
    sortOrder: 10,
  },
  {
    id: "lamination-finishing",
    slug: "lamination-finishing",
    categoryId: "printing",
    subcategoryId: "finishing-binding",
    name: { en: "Thermal Pouch & Roll Lamination", hi: "थर्मल लैमिनेशन सेवा" },
    shortDescription: {
      en: "Waterproof, dustproof heavy-duty lamination for marksheets, degrees, and identity cards.",
      hi: "मार्कशीट, डिग्री, प्रमाण पत्रों और कार्ड्स के लिए 100% वाटरप्रूफ मजबूत लैमिनेशन।",
    },
    description: {
      en: "Protect valuable educational certificates, property deeds, identity cards, and menus with 125/250 micron crystal-clear waterproof thermal pouch lamination.",
      hi: "मार्कशीट, जमीन के दस्तावेज, पहचान पत्र और जरूरी कागजात को सुरक्षित रखने के लिए मजबूत थर्मल लैमिनेशन।",
    },
    icon: "ShieldCheck",
    image: "/gallery/laminated-document-sample.svg",
    ctaType: "service",
    featured: false,
    relatedServiceIds: ["spiral-binding-finishing", "photocopy-service"],
    aliases: ["lamination", "document lamination", "लैमिनेशन"],
    sampleFallbackType: "lamination",
    sortOrder: 11,
  },
  {
    id: "spiral-binding-finishing",
    slug: "spiral-binding-finishing",
    categoryId: "printing",
    subcategoryId: "finishing-binding",
    name: { en: "Spiral & Hardcover Project Binding", hi: "स्पाइरल व हार्डकवर बाइंडिंग" },
    shortDescription: {
      en: "Plastic spiral binding, softcover binding, and hardcover thesis binding for reports and books.",
      hi: "प्रोजेक्ट्स, नोट्स और थीसिस के लिए मजबूत प्लास्टिक स्पाइरल व हार्डकवर बाइंडिंग।",
    },
    description: {
      en: "Professional document binding for college projects, thesis submissions, legal case files, and office records using plastic coil, wire-o, or golden-embossed hardbound covers.",
      hi: "कॉलेज प्रोजेक्ट, थीसिस, नोट्स और ऑफिस रिकॉर्ड्स के लिए पारदर्शी शीट सहित स्पाइरल और हार्डकवर बाइंडिंग।",
    },
    icon: "BookOpen",
    image: "/gallery/spiral-binding-sample.svg",
    ctaType: "service",
    featured: false,
    relatedServiceIds: ["document-color-bw-print", "photocopy-service"],
    aliases: ["spiral binding", "thesis binding", "book binding", "स्पाइरल बाइंडिंग", "बाइंडिंग"],
    sampleFallbackType: "spiral-binding",
    sortOrder: 12,
  },

  // -----------------------------------------------------------------------
  // 2. BUSINESS & OFFICE STATIONERY (`stationery`)
  // -----------------------------------------------------------------------
  {
    id: "letterheads",
    slug: "letterheads",
    categoryId: "stationery",
    subcategoryId: "business-stationery",
    name: { en: "Letterheads & Prescription Pads", hi: "लेटरहेड व डॉक्टर पर्चा पैड" },
    shortDescription: {
      en: "Official branded company letterheads, doctor prescription pads, and institutional pads.",
      hi: "कंपनी के नाम, लोगो और संपर्क के साथ मुद्रित आधिकारिक लेटरहेड व लेटर पैड।",
    },
    description: {
      en: "Printed on crisp executive 80–100 GSM bond paper or textured luxury stock with precise color reproduction for official correspondence and medical prescriptions.",
      hi: "कंपनियों, डॉक्टरों और संस्थानों के लिए उच्च गुणवत्ता वाले बॉन्ड पेपर पर स्पष्ट लेटरहेड और प्रिस्क्रिप्शन पैड प्रिंटिंग।",
    },
    icon: "FileText",
    image: "/gallery/letterhead-envelope-sample.svg",
    ctaType: "quote",
    featured: false,
    relatedServiceIds: ["envelopes-stationery", "bill-books", "visiting-cards"],
    aliases: ["letterhead", "letter pad", "prescription pad", "लेटरहेड", "लेटर पैड"],
    sampleFallbackType: "letterhead",
    sortOrder: 1,
  },
  {
    id: "bill-books",
    slug: "bill-books",
    categoryId: "stationery",
    subcategoryId: "business-stationery",
    name: { en: "Bill Books, Invoice Pads & Cash Memos", hi: "बिल बुक, इनवॉइस व रसीद पैड" },
    shortDescription: {
      en: "Numbered duplicate and triplicate GST/non-GST carbon bill books and cash memos.",
      hi: "जीएसटी/नॉन-जीएसटी नंबरिंग वाली डुप्लिकेट और ट्रिप्लिकेट बिल बुक व रसीद पैड।",
    },
    description: {
      en: "Custom carbonless (NCR) or carbon paper bill books with sequential numbering, perforated tear-offs, sturdy board binding, and your business details.",
      hi: "दुकान, फर्म और संस्थाओं के लिए सीरियल नंबर, कार्बन कॉपी और पक्की बाइंडिंग वाली जीएसटी व नॉन-जीएसटी बिल बुक।",
    },
    icon: "Receipt",
    image: "/gallery/bill-book-sample.svg",
    ctaType: "quote",
    featured: true,
    popularRank: 9,
    options: [
      {
        label: { en: "Copies", hi: "कॉपी प्रकार" },
        values: [
          { en: "Duplicate (1+1 Copies)", hi: "डुप्लिकेट (1 मूल + 1 कार्बन)" },
          { en: "Triplicate (1+2 Copies)", hi: "ट्रिप्लिकेट (1 मूल + 2 कार्बन)" },
        ],
      },
    ],
    suitableFor: [
      { en: "Shops, Wholesalers & Distributors", hi: "दुकानदार, थोक व्यापारी व वितरक" },
      { en: "Repair Centers & Service Providers", hi: "सर्विस सेंटर व मैकेनिक" },
    ],
    relatedServiceIds: ["letterheads", "registers-notebooks", "visiting-cards"],
    aliases: ["bill book", "invoice pad", "cash memo", "receipt book", "बिल बुक", "रसीद बुक", "कैश मेमो"],
    sampleFallbackType: "bill-book",
    sortOrder: 2,
  },
  {
    id: "envelopes-stationery",
    slug: "envelopes-stationery",
    categoryId: "stationery",
    subcategoryId: "business-stationery",
    name: { en: "Custom Printed Envelopes", hi: "प्रिंटेड लिफाफे" },
    shortDescription: {
      en: "Custom office envelopes, invitation envelopes, and mailing pouches in all standard sizes.",
      hi: "ऑफिस पत्राचार और निमंत्रण के लिए सभी साइज़ में कस्टम प्रिंटेड लिफाफे।",
    },
    description: {
      en: "Enhance official communication with custom envelopes featuring your company logo and return address. Available in 9x4, A4 cloth-line, windowed, and colored options.",
      hi: "कंपनी और ऑफिस पत्राचार के लिए ब्रांडेड लिफाफे। 9x4 साइज, A4 डॉक्यूमेंट लिफाफा और क्लॉथ लिफाफे उपलब्ध हैं।",
    },
    icon: "Mail",
    image: "/gallery/letterhead-envelope-sample.svg",
    ctaType: "quote",
    featured: false,
    aliases: ["envelope", "printed envelope", "लिफाफा"],
    sampleFallbackType: "letterhead",
    sortOrder: 3,
  },
  {
    id: "registers-notebooks",
    slug: "registers-notebooks",
    categoryId: "stationery",
    subcategoryId: "office-school-supplies",
    name: { en: "Registers, Ledgers & Custom Notebooks", hi: "रजिस्टर, बहीखाता व कॉपियाँ" },
    shortDescription: {
      en: "Custom printed attendance registers, stock books, ledger registers, and ruled notebooks.",
      hi: "उपस्थिति रजिस्टर, स्टॉक रजिस्टर, लेजर बहीखाता और स्कूल/कॉलेज कॉपियाँ।",
    },
    description: {
      en: "Durable hardbound registers with customized inner columns for employee attendance, stock inventory, fees records, and general ledgers.",
      hi: "स्कूलों, दुकानों और कंपनियों के लिए कस्टम कॉलम वाले अटेंडेंस रजिस्टर, स्टॉक रजिस्टर और बहीखाता।",
    },
    icon: "BookMarked",
    image: "/gallery/bill-book-sample.svg",
    ctaType: "quote",
    featured: false,
    aliases: ["register", "attendance register", "ledger", "notebook", "रजिस्टर", "बहीखाता"],
    sampleFallbackType: "bill-book",
    sortOrder: 4,
  },
  {
    id: "pvc-id-cards",
    slug: "pvc-id-cards",
    categoryId: "stationery",
    subcategoryId: "business-identity",
    name: { en: "PVC Staff ID Cards & Student Badges", hi: "पीवीसी आईडी कार्ड व छात्र पहचान पत्र" },
    shortDescription: {
      en: "Durable plastic identity cards with barcode/QR code, printed lanyards, and card holders.",
      hi: "स्कूलों, कॉलेजों और कर्मचारियों के लिए डोरी व होल्डर सहित मजबूत पीवीसी पहचान पत्र।",
    },
    description: {
      en: "Waterproof credit-card sized PVC plastic identity cards for staff, students, club members, and security personnel with personalized custom-printed neck ribbons.",
      hi: "स्कूल, कॉलेज और ऑफिस के लिए हाई-डेफिनिशन प्रिंटेड प्लास्टिक आईडी कार्ड, फीता (डोरी) और कार्ड केस।",
    },
    icon: "IdCard",
    image: "/gallery/pvc-id-card-sample.svg",
    ctaType: "quote",
    featured: true,
    popularRank: 7,
    options: [
      {
        label: { en: "Accessories", hi: "सहायक सामग्री" },
        values: [
          { en: "Plain Lanyard + Plastic Holder", hi: "सादी डोरी + कार्ड होल्डर" },
          { en: "Custom Screen-Printed Lanyard", hi: "नाम व लोगो प्रिंटेड डोरी" },
          { en: "Rigid Acrylic Badge Holder", hi: "मजबूत एक्रिलिक होल्डर" },
        ],
      },
    ],
    suitableFor: [
      { en: "Schools, Colleges & Institutes", hi: "स्कूल, कॉलेज व शिक्षण संस्थान" },
      { en: "Offices & Private Companies", hi: "दफ्तर व निजी कंपनियां" },
    ],
    relatedServiceIds: ["visiting-cards", "aadhaar-pvc-government"],
    aliases: ["id card", "pvc id card", "student id", "staff card", "पहचान पत्र", "आईडी कार्ड"],
    sampleFallbackType: "id-card",
    sortOrder: 5,
  },

  // -----------------------------------------------------------------------
  // 3. PHOTO, ID & DOCUMENT SERVICES (`photo-id`)
  // -----------------------------------------------------------------------
  {
    id: "instant-passport-photos",
    slug: "instant-passport-photos",
    categoryId: "photo-id",
    subcategoryId: "photo-studio",
    name: { en: "Instant Passport Size Photos", hi: "तत्काल पासपोर्ट साइज फोटो" },
    shortDescription: {
      en: "Studio-quality passport photos with white/blue background, ready in 5 minutes.",
      hi: "सफेद या नीले बैकग्राउंड के साथ 5 मिनट में तैयार स्टूडियो-क्वालिटी पासपोर्ट फोटो।",
    },
    description: {
      en: "Quick studio-lit photography formatted precisely for government forms, visas, school admissions, job applications, and PAN/Aadhaar updates. Free minor facial touch-up included.",
      hi: "सरकारी फॉर्म, पासपोर्ट, वीजा और एडमिशन के लिए सटीक साइज, स्पष्ट रोशनी और बैकग्राउंड वाली 5 मिनट में तैयार फोटो।",
    },
    icon: "Camera",
    image: "/gallery/passport-photo-sheet-sample.svg",
    ctaType: "service",
    featured: true,
    popularRank: 2,
    suitableFor: [
      { en: "Exam Applicants & Students", hi: "परीक्षा अभ्यर्थी व छात्र" },
      { en: "Passport & Visa Applicants", hi: "पासपोर्ट व वीजा आवेदक" },
    ],
    relatedServiceIds: ["photo-printing-enlargements", "job-forms-assistance"],
    aliases: ["passport photo", "urgent photo", "photo studio", "पासपोर्ट फोटो", "फोटो"],
    sampleFallbackType: "passport-photo",
    sortOrder: 1,
  },
  {
    id: "photo-printing-enlargements",
    slug: "photo-printing-enlargements",
    categoryId: "photo-id",
    subcategoryId: "photo-studio",
    name: { en: "Studio Photo Printing & Enlargements", hi: "स्टूडियो फोटो प्रिंटिंग व एनलार्जमेंट" },
    shortDescription: {
      en: "Studio-grade photo printing in 4x6, 5x7, 8x10, and 12x18 on glossy waterproof paper.",
      hi: "ग्लॉसी वाटरप्रूफ फोटो पेपर पर छोटे व बड़े सभी आकारों में स्पष्ट फोटो प्रिंटिंग।",
    },
    description: {
      en: "High-density color reproduction on genuine archival photo paper. Bring photos from mobile, memory card, or WhatsApp for instant frame-ready prints.",
      hi: "मोबाइल और कैमरे की यादगार तस्वीरों की बड़े साइज में चमकदार और टिकाऊ फोटो प्रिंटिंग।",
    },
    icon: "Image",
    image: "/gallery/glossy-photo-prints-sample.svg",
    ctaType: "service",
    featured: false,
    aliases: ["photo print", "photo enlargement", "फोटो प्रिंटिंग"],
    sampleFallbackType: "photo",
    sortOrder: 2,
  },
  {
    id: "document-scanning-pdf",
    slug: "document-scanning-pdf",
    categoryId: "photo-id",
    subcategoryId: "document-finishing",
    name: { en: "High-Resolution Scanning & PDF Creation", hi: "डॉक्यूमेंट स्कैनिंग व पीडीएफ निर्माण" },
    shortDescription: {
      en: "High-resolution multi-page document scanning, OCR digitization, and PDF compression.",
      hi: "दस्तावेज़ों की साफ एचडी स्कैनिंग, साइज कंप्रेस करना और डिजिटल पीडीएफ निर्माण।",
    },
    description: {
      en: "Fast scanning of certificates, land records, signed agreements, and books with multi-page merging and exact file size compression for online portals.",
      hi: "सरकारी फॉर्म्स और ईमेल के लिए मार्कशीट, कागजात और फाइलों की साफ स्कैनिंग व पीडीएफ तैयार करना।",
    },
    icon: "Scan",
    image: "/gallery/scanned-pdf-document-sample.svg",
    ctaType: "service",
    featured: false,
    aliases: ["scan", "pdf", "document scan", "स्कैन", "पीडीएफ"],
    sampleFallbackType: "document-scan",
    sortOrder: 3,
  },

  // -----------------------------------------------------------------------
  // 4. WEDDING & INVITATION SERVICES (`wedding-invitations`)
  // -----------------------------------------------------------------------
  {
    id: "wedding-invitations-hub",
    slug: "wedding-cards",
    categoryId: "wedding-invitations",
    subcategoryId: "wedding-cards-sub",
    name: { en: "Designer Wedding Invitation Cards", hi: "डिजाइनर शादी के कार्ड" },
    shortDescription: {
      en: "Extensive collection of royal, traditional, religious, and modern marriage invitation cards.",
      hi: "रॉयल, पारंपरिक, धार्मिक और आधुनिक शादी के निमंत्रण पत्रों का विशाल संग्रह।",
    },
    description: {
      en: "Choose from hundreds of ready physical samples at our Chakia showroom or design custom bespoke invitations. Complete with envelope addressing and RSVP cards.",
      hi: "हमारे चकिया केंद्र पर शादी के कार्ड्स के सैकड़ों आकर्षक नमूने देखें और अपनी पसंद अनुसार प्रिंट करवाएं।",
    },
    icon: "Heart",
    image: "/gallery/wedding-invitation-sample.svg",
    ctaType: "quote",
    featured: false,
    aliases: ["wedding invitation", "shaadi card", "विवाह कार्ड"],
    sampleFallbackType: "wedding-card",
    sortOrder: 1,
  },
  {
    id: "marriage-biodata-design",
    slug: "marriage-biodata-design",
    categoryId: "wedding-invitations",
    subcategoryId: "invitation-design-sub",
    name: { en: "Marriage Biodata & Profile Design", hi: "विवाह बायोडाटा व प्रोफाइल डिज़ाइन" },
    shortDescription: {
      en: "Elegantly formatted Hindu, Muslim, and modern matrimonial biodatas with photo framing.",
      hi: "पारिवारिक विवरण और फोटो के साथ सुंदर व आकर्षक वैवाहिक बायोडाटा निर्माण।",
    },
    description: {
      en: "Custom designed matrimonial biodata in Hindi or English with traditional motifs, astrological details (Kundali/Gotra), education, and family background.",
      hi: "पारंपरिक बॉर्डर, धार्मिक चिन्ह और स्पष्ट अक्षरों के साथ शादी के लिए बायोडाटा पीडीएफ व प्रिंट।",
    },
    icon: "FileText",
    image: "/gallery/marriage-biodata-sample.svg",
    ctaType: "design",
    featured: false,
    aliases: ["biodata", "marriage biodata", "kundali format", "बायोडाटा", "विवाह बायोडाटा"],
    sampleFallbackType: "resume",
    sortOrder: 2,
  },

  // -----------------------------------------------------------------------
  // 5. GRAPHIC & CREATIVE DESIGN (`design`)
  // -----------------------------------------------------------------------
  {
    id: "business-logo-design",
    slug: "business-logo-design",
    categoryId: "design",
    subcategoryId: "brand-identity",
    name: { en: "Business Logo & Brand Design", hi: "व्यावसायिक लोगो डिज़ाइन" },
    shortDescription: {
      en: "Unique vector brand logo designs for shops, schools, organizations, and startups.",
      hi: "दुकानों, स्कूलों, संस्थाओं और नए व्यवसायों के लिए आकर्षक वेक्टर लोगो निर्माण।",
    },
    description: {
      en: "Get a memorable, scalable vector logo designed by experienced designers. Delivered with all source formats (AI, CDR, PNG, JPG, PDF) ready for boards, stamps, and stationery.",
      hi: "अपनी दुकान, स्कूल या कंपनी की पहचान के लिए आकर्षक और अनोखा लोगो तैयार करवाएं।",
    },
    icon: "Sparkles",
    image: "/images/palak-logo-ram-hanuman.jpeg",
    ctaType: "design",
    featured: false,
    aliases: ["logo", "logo design", "brand logo", "लोगो", "लोगो डिज़ाइन"],
    sampleFallbackType: "logo-design",
    sortOrder: 1,
  },
  {
    id: "visiting-card-design",
    slug: "visiting-card-design",
    categoryId: "design",
    subcategoryId: "brand-identity",
    name: { en: "Visiting Card Graphic Layout Design", hi: "विजिटिंग कार्ड ग्राफिक लेआउट डिज़ाइन" },
    shortDescription: {
      en: "Modern and creative business card layouts tailored with your brand identity.",
      hi: "आपकी व्यावसायिक पहचान के अनुरूप आधुनिक और रचनात्मक विजिटिंग कार्ड लेआउट।",
    },
    description: {
      en: "Custom creative typography, QR code embedding, and color matching for visiting cards tailored to your profession.",
      hi: "आपके पेशे और व्यापार के अनुसार आकर्षक विजिटिंग कार्ड डिज़ाइन व लेआउट तैयार करना।",
    },
    icon: "CreditCard",
    image: "/images/palak-visiting-card.jpeg",
    ctaType: "design",
    featured: false,
    relatedServiceIds: ["visiting-cards", "business-logo-design"],
    aliases: ["card design", "visiting card layout", "कार्ड डिज़ाइन"],
    sampleFallbackType: "visiting-card",
    sortOrder: 2,
  },
  {
    id: "poster-banner-design",
    slug: "poster-banner-design",
    categoryId: "design",
    subcategoryId: "marketing-creatives",
    name: { en: "Poster & Flex Banner Graphic Design", hi: "पोस्टर व फ्लेक्स बैनर ग्राफिक डिज़ाइन" },
    shortDescription: {
      en: "Striking flex banner, hoarding, event poster, and advertising graphic designs.",
      hi: "दुकान के होर्डिंग, फ्लेक्स बैनर और विज्ञापन पोस्टरों के लिए आकर्षक ग्राफिक डिज़ाइन।",
    },
    description: {
      en: "High-impact visual designs for shopfront hoardings, political rally backdrops, educational admission banners, and exhibition stalls.",
      hi: "दुकान के बोर्ड, चुनाव प्रचार और कोचिंग विज्ञापनों के लिए उच्च गुणवत्ता वाले ग्राफिक्स और लेआउट।",
    },
    icon: "Layers",
    image: "/images/palak-independence-day-banner.jpeg",
    ctaType: "design",
    featured: false,
    relatedServiceIds: ["flex-banners", "posters-printing"],
    aliases: ["banner design", "flex design", "बैनर डिज़ाइन", "पोस्टर डिज़ाइन"],
    sampleFallbackType: "banner",
    sortOrder: 3,
  },
  {
    id: "social-media-graphics",
    slug: "social-media-graphics",
    categoryId: "design",
    subcategoryId: "marketing-creatives",
    name: { en: "Social Media Graphics & Festival Posts", hi: "सोशल मीडिया ग्राफिक्स व त्योहार पोस्ट" },
    shortDescription: {
      en: "Custom festival greetings, business promotional flyers, and WhatsApp status creatives.",
      hi: "त्योहारों की शुभकामनाओं और व्यावसायिक प्रचार के लिए डिजिटल सोशल मीडिया पोस्ट।",
    },
    description: {
      en: "Promote your brand on WhatsApp, Facebook, and Instagram with customized festival banners featuring your photo, firm name, and contact information.",
      hi: "दीपावली, होली, छठ, स्वतंत्रता दिवस आदि पर्वों पर अपने नाम और फोटो के साथ डिजिटल बधाई संदेश।",
    },
    icon: "Share2",
    image: "/gallery/logo-design-sample.svg",
    ctaType: "design",
    featured: false,
    aliases: ["festival post", "whatsapp flyer", "social media banner", "त्योहार पोस्टर", "सोशल मीडिया डिज़ाइन"],
    sampleFallbackType: "logo-design",
    sortOrder: 4,
  },
  {
    id: "resume-cv-design",
    slug: "resume-cv-design",
    categoryId: "design",
    subcategoryId: "personal-business-design",
    name: { en: "Professional Resume & CV Formatting", hi: "प्रोफेशनल रिज्यूमे व सीवी निर्माण" },
    shortDescription: {
      en: "ATS-friendly job resumes, academic CVs, and professional profile design.",
      hi: "नौकरी और साक्षात्कार के लिए आधुनिक और व्यवस्थित रिज्यूमे व सीवी तैयार करना।",
    },
    description: {
      en: "Stand out to employers with clean, modern resumes tailored for freshers, teachers, corporate executives, and technical roles. Delivered in PDF and editable Word format.",
      hi: "अनुभव और योग्यता को सही तरीके से दर्शाने वाले पेशेवर रिज्यूमे का निर्माण व प्रिंट।",
    },
    icon: "FileText",
    image: "/gallery/resume-cv-print-sample.svg",
    ctaType: "design",
    featured: false,
    aliases: ["resume", "cv", "curriculum vitae", "biodata", "रिज्यूमे", "सीवी"],
    sampleFallbackType: "resume",
    sortOrder: 5,
  },

  // -----------------------------------------------------------------------
  // 6. GOVERNMENT & CERTIFICATE SERVICES (`government`)
  // -----------------------------------------------------------------------
  {
    id: "caste-income-residence-assistance",
    slug: "caste-income-residence-assistance",
    categoryId: "government",
    subcategoryId: "rtps-certificates",
    name: { en: "Caste, Income & Residence Certificate Assistance", hi: "जाति, आय व निवास प्रमाण पत्र सहायता" },
    shortDescription: {
      en: "Online portal filing assistance for RTPS Bihar Caste (Jati), Income (Aay), and Residence (Niwas).",
      hi: "आरटीपीएस बिहार पोर्टल पर जाति, आय और निवास प्रमाण पत्र के ऑनलाइन आवेदन में सहायता।",
    },
    description: {
      en: "Assistance with filling online RTPS forms, uploading supporting affidavits and land receipts, tracking application status, and printing digitally signed certificates once issued.",
      hi: "बिहार आरटीपीएस पोर्टल पर जाति प्रमाण पत्र, आय प्रमाण पत्र और निवास प्रमाण पत्र का सही फॉर्म भरना, डॉक्यूमेंट अपलोड करना और जारी होने पर डाउनलोड व प्रिंट करना।",
    },
    icon: "FileCheck",
    image: "/gallery/rtps-certificate-sample.svg",
    ctaType: "assistance",
    featured: true,
    popularRank: 6,
    disclaimer: {
      en: "Palak Enterprises is an independent facilitation service center. Application filing and printing assistance is provided. Final approval and issuance are governed strictly by the respective Revenue/Administrative authority.",
      hi: "पालक एंटरप्राइजेज एक स्वतंत्र सुविधा केंद्र है। यह केवल ऑनलाइन आवेदन व प्रिंटिंग में सहायता प्रदान करता है। प्रमाण पत्र जारी करने का अंतिम अधिकार संबंधित सरकारी विभाग के पास है।",
    },
    suitableFor: [
      { en: "Students for Scholarships & Admissions", hi: "छात्रवृत्ति व एडमिशन के लिए छात्र" },
      { en: "Job Applicants for Reservations", hi: "सरकारी नौकरी आरक्षण के अभ्यर्थी" },
    ],
    relatedServiceIds: ["pan-card-assistance", "aadhaar-pvc-government", "job-forms-assistance"],
    aliases: [
      "caste certificate",
      "income certificate",
      "residence certificate",
      "rtps bihar",
      "jati praman patra",
      "aay praman patra",
      "niwas praman patra",
      "जाति प्रमाण पत्र",
      "आय प्रमाण पत्र",
      "निवास प्रमाण पत्र",
    ],
    sampleFallbackType: "rtps-certificate",
    sortOrder: 1,
  },
  {
    id: "pan-card-assistance",
    slug: "pan-card-application-correction",
    categoryId: "government",
    subcategoryId: "identity-government",
    name: { en: "PAN Card Application & Correction Assistance", hi: "पैन कार्ड आवेदन व सुधार सहायता" },
    shortDescription: {
      en: "New PAN applications, minor-to-major updates, photo/name corrections, and instant e-PAN.",
      hi: "नया पैन कार्ड आवेदन, नाम/जन्मतिथि सुधार और तत्काल ई-पैन डाउनलोड सहायता।",
    },
    description: {
      en: "Guidance with NSDL / UTIITSL PAN card applications for individuals, minors, businesses, and corrections of mismatched father's name or date of birth.",
      hi: "नया पैन कार्ड बनवाने, पुराने पैन में फोटो/नाम सुधारने और आधार लिंक करवाने में ऑनलाइन सहायता।",
    },
    icon: "CreditCard",
    image: "/gallery/pan-card-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Palak Enterprises facilitates application filing on official authorized portals. PAN allotment is subject to Income Tax Department verification.",
      hi: "पालक एंटरप्राइजेज अधिकृत पोर्टल पर फॉर्म भरने में सहायता करता है। पैन कार्ड आयकर विभाग द्वारा जारी किया जाता है।",
    },
    aliases: ["pan card", "pan correction", "new pan", "nsdl pan", "पैन कार्ड", "पैन सुधार"],
    sampleFallbackType: "pan-card",
    sortOrder: 2,
  },
  {
    id: "aadhaar-pvc-government",
    slug: "aadhaar-download-pvc-print",
    categoryId: "government",
    subcategoryId: "identity-government",
    name: { en: "Aadhaar Card Download & PVC Printing Assistance", hi: "आधार कार्ड डाउनलोड व पीवीसी प्रिंट सहायता" },
    shortDescription: {
      en: "Official Aadhaar card retrieval via OTP, biometric verification assistance, and crisp PVC card printing.",
      hi: "आधार कार्ड डाउनलोड, ओटीपी सत्यापन और मजबूत वाटरप्रूफ पीवीसी कार्ड प्रिंटिंग।",
    },
    description: {
      en: "Assistance with downloading official UIDAI e-Aadhaar letters using OTP and converting them into durable, pocket-friendly waterproof PVC cards with crisp QR codes.",
      hi: "ओटीपी के माध्यम से आधार कार्ड डाउनलोड करने और उसे मजबूत लैमिनेटेड या पीवीसी कार्ड में प्रिंट करने की सुविधा।",
    },
    icon: "IdCard",
    image: "/gallery/aadhaar-print-sample.svg",
    ctaType: "assistance",
    featured: true,
    popularRank: 3,
    disclaimer: {
      en: "We assist in downloading and printing e-Aadhaar with valid consent and OTP verification. UIDAI is the sole authority governing Aadhaar data.",
      hi: "हम ग्राहक की सहमति और ओटीपी सत्यापन के साथ ई-आधार डाउनलोड व प्रिंट सहायता प्रदान करते हैं।",
    },
    relatedServiceIds: ["caste-income-residence-assistance", "pan-card-assistance"],
    aliases: ["aadhaar", "aadhaar print", "aadhaar pvc", "aadhar card", "आधार", "आधार कार्ड", "आधार प्रिंट"],
    sampleFallbackType: "aadhaar-card",
    sortOrder: 3,
  },
  {
    id: "ayushman-card-assistance",
    slug: "ayushman-bharat-card-assistance",
    categoryId: "government",
    subcategoryId: "identity-government",
    name: { en: "Ayushman Bharat Health Card Assistance", hi: "आयुष्मान भारत हेल्थ कार्ड सहायता" },
    shortDescription: {
      en: "Eligibility checking, e-KYC guidance, and PVC printing for PM-JAY Ayushman cards.",
      hi: "पात्रता जाँच, ई-केवाईसी और आयुष्मान गोल्डन कार्ड डाउनलोड व प्रिंट सहायता।",
    },
    description: {
      en: "Assistance checking your family name in the PM-JAY health insurance database, completing Aadhaar biometric/OTP e-KYC, and printing issued cards.",
      hi: "आयुष्मान भारत योजना सूची में नाम देखना, ई-केवाईसी पूर्ण करना और 5 लाख तक के मुफ्त इलाज वाले आयुष्मान कार्ड का प्रिंट निकालना।",
    },
    icon: "HeartPulse",
    image: "/gallery/ayushman-card-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Eligibility and coverage are governed by National Health Authority (NHA) criteria.",
      hi: "आयुष्मान भारत की पात्रता स्वास्थ्य प्राधिकरण के नियमों के अधीन है।",
    },
    aliases: ["ayushman card", "pmjay", "health card", "आयुष्मान कार्ड", "आयुष्मान भारत"],
    sampleFallbackType: "ayushman-card",
    sortOrder: 4,
  },
  {
    id: "admit-card-scorecard",
    slug: "admit-card-result-printing",
    categoryId: "government",
    subcategoryId: "admit-scorecard",
    name: { en: "Admit Card Download & Scorecard Printing", hi: "एडमिट कार्ड डाउनलोड व रिजल्ट प्रिंट" },
    shortDescription: {
      en: "Fast retrieval and color printing of competitive exam admit cards and board marksheets.",
      hi: "प्रतियोगी परीक्षाओं के प्रवेश पत्र डाउनलोड व परीक्षा परिणाम/मार्कशीट प्रिंट।",
    },
    description: {
      en: "Instant downloading of exam admit cards (BPSC, SSC, Railway, Police, NTA, Board) with exam guidelines and colored photo verification printouts.",
      hi: "सभी प्रतियोगी परीक्षाओं के एडमिट कार्ड समय पर डाउनलोड करने और कलर प्रिंटिंग की सुविधा।",
    },
    icon: "GraduationCap",
    image: "/gallery/online-form-filling-sample.svg",
    ctaType: "help",
    featured: false,
    aliases: ["admit card", "hall ticket", "result", "scorecard", "एडमिट कार्ड", "रिजल्ट"],
    sampleFallbackType: "form",
    sortOrder: 5,
  },

  // -----------------------------------------------------------------------
  // 7. ONLINE FORMS & APPLICATIONS (`online-services`)
  // -----------------------------------------------------------------------
  {
    id: "job-forms-assistance",
    slug: "job-forms-application-filling",
    categoryId: "online-services",
    subcategoryId: "job-forms",
    name: { en: "Government Job Application Form Filling", hi: "सरकारी नौकरी फॉर्म आवेदन सहायता" },
    shortDescription: {
      en: "Accurate online application form submission for SSC, Railway, BPSC, Police, Defense & Teaching.",
      hi: "एसएससी, रेलवे, बीपीएससी, पुलिस, शिक्षक भर्ती आदि के ऑनलाइन फॉर्म भरने में सहायता।",
    },
    description: {
      en: "Error-free online form submission with precise document scanning, photo/signature resizing according to portal specifications, fee payment, and final acknowledgment printout.",
      hi: "सरकारी नौकरियों के ऑनलाइन फॉर्म बिना किसी गलती के भरना, फोटो-हस्ताक्षर सही साइज में लगाना और फाइनल रसीद देना।",
    },
    icon: "ClipboardList",
    image: "/gallery/online-form-filling-sample.svg",
    ctaType: "help",
    featured: true,
    popularRank: 6,
    disclaimer: {
      en: "Candidate is responsible for providing accurate personal details. Form submission is subject to recruiting commission guidelines.",
      hi: "अभ्यर्थी द्वारा दी गई जानकारी के आधार पर फॉर्म भरा जाता है। नियम व शर्तें भर्ती आयोग के अधीन हैं।",
    },
    suitableFor: [
      { en: "Job Aspirants & Students", hi: "नौकरी की तैयारी कर रहे युवा" },
    ],
    relatedServiceIds: ["education-admission-forms", "admit-card-scorecard", "resume-cv-design"],
    aliases: [
      "sarkari form",
      "job form",
      "ssc form",
      "railway form",
      "bpsc form",
      "police form",
      "सरकारी फॉर्म",
      "ऑनलाइन फॉर्म",
    ],
    sampleFallbackType: "form",
    sortOrder: 1,
  },
  {
    id: "education-admission-forms",
    slug: "school-college-admission-scholarship",
    categoryId: "online-services",
    subcategoryId: "education-forms",
    name: { en: "School/College Admissions & Scholarship Forms", hi: "स्कूल/कॉलेज एडमिशन व छात्रवृत्ति फॉर्म" },
    shortDescription: {
      en: "OFSS Bihar 11th/Degree admission form filing, NSP scholarships, and exam registration.",
      hi: "ओएफएसएस इंटर/ग्रेजुएशन एडमिशन, नेशनल स्कॉलरशिप और बोर्ड परीक्षा फॉर्म सहायता।",
    },
    description: {
      en: "Assistance with OFSS Bihar intermediate/graduation choice filling, college registration, National Scholarship Portal (NSP), and Post-Matric scholarship forms.",
      hi: "11वीं, बीए/बीएससी/बीकॉम एडमिशन फॉर्म, पोस्ट मैट्रिक छात्रवृत्ति और परीक्षा फॉर्म ऑनलाइन भरना।",
    },
    icon: "GraduationCap",
    image: "/gallery/online-form-filling-sample.svg",
    ctaType: "help",
    featured: false,
    aliases: ["admission form", "ofss bihar", "scholarship form", "एडमिशन फॉर्म", "छात्रवृत्ति"],
    sampleFallbackType: "form",
    sortOrder: 2,
  },
  {
    id: "document-resizing-assistance",
    slug: "photo-signature-document-resizing",
    categoryId: "online-services",
    subcategoryId: "document-upload-assistance",
    name: { en: "Photo & Signature Resizing & Upload Assistance", hi: "फोटो व हस्ताक्षर रीसाइज़िंग सहायता" },
    shortDescription: {
      en: "Precise pixel and KB resizing of photographs, signatures, and certificates for portals.",
      hi: "सरकारी पोर्टल के अनुसार फोटो, हस्ताक्षर और कागजात को सही साइज (KB) में सेट करना।",
    },
    description: {
      en: "We format digital images to exact dimensions (e.g. 20-50 KB, 300 DPI, specific pixel ratios) required by UPSC, SSC, NTA, and State portals.",
      hi: "विभिन्न फॉर्म्स में लगने वाले फोटो और हस्ताक्षर को निर्धारित केबी व पिक्सेल में क्रॉप व सेट करना।",
    },
    icon: "Scan",
    image: "/gallery/scanned-pdf-document-sample.svg",
    ctaType: "help",
    featured: false,
    aliases: ["photo resize", "signature resize", "kb resize", "फोटो रीसाइज़"],
    sampleFallbackType: "document-scan",
    sortOrder: 3,
  },

  // -----------------------------------------------------------------------
  // 8. PENSION & SOCIAL SECURITY (`pension`)
  // -----------------------------------------------------------------------
  {
    id: "pension-applications-kyc",
    slug: "old-age-disability-pension-kyc",
    categoryId: "pension",
    subcategoryId: "social-pension",
    name: { en: "Old Age, Widow & Disability Pension Assistance", hi: "वृद्धा, विधवा व दिव्यांग पेंशन सहायता" },
    shortDescription: {
      en: "Application filing and biometric life certificate (Jeevan Pramaan) submission for social security pensions.",
      hi: "वृद्धा पेंशन, विधवा पेंशन और दिव्यांग पेंशन के ऑनलाइन आवेदन व जीवन प्रमाण पत्र ई-केवाईसी।",
    },
    description: {
      en: "Assistance with applying for Mukhyamantri Vridha Pension, Indira Gandhi National Pension, Widow Pension, Divyang Pension, and annual biometric Jeevan Pramaan life certification.",
      hi: "समाज कल्याण विभाग की पेंशन योजनाओं के नए फॉर्म भरना, बैंक खाता लिंक करना और वार्षिक बायोमेट्रिक जीवन प्रमाण पत्र सत्यापन।",
    },
    icon: "HeartHandshake",
    image: "/gallery/rtps-certificate-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Palak Enterprises is a facilitation center. Pension sanction and disbursement are governed by the Department of Social Welfare.",
      hi: "पेंशन स्वीकृति व राशि का भुगतान समाज कल्याण विभाग द्वारा नियंत्रित होता है।",
    },
    aliases: [
      "vridha pension",
      "widow pension",
      "disability pension",
      "jeevan pramaan",
      "life certificate",
      "वृद्धा पेंशन",
      "पेंशन",
      "जीवन प्रमाण",
    ],
    sampleFallbackType: "rtps-certificate",
    sortOrder: 1,
  },
  {
    id: "eshram-ration-card-assistance",
    slug: "eshram-ration-card-services",
    categoryId: "pension",
    subcategoryId: "welfare-cards",
    name: { en: "e-Shram & Ration Card Services Assistance", hi: "ई-श्रम व राशन कार्ड सेवा सहायता" },
    shortDescription: {
      en: "e-Shram registration, updates, new ration card application assistance, and member additions.",
      hi: "ई-श्रम कार्ड निर्माण व सुधार, नए राशन कार्ड आवेदन और परिवार सदस्य जोड़ने में सहायता।",
    },
    description: {
      en: "Assistance with unorganized worker e-Shram registration, address updates, and filing online applications for Bihar Food & Consumer Protection ration cards.",
      hi: "श्रमिकों के लिए ई-श्रम कार्ड बनवाना और नए राशन कार्ड के ऑनलाइन आवेदन में मार्गदर्शन।",
    },
    icon: "FileText",
    image: "/gallery/aadhaar-print-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Ration card issuance is subject to Food & Civil Supplies department verification.",
      hi: "राशन कार्ड खाद्य एवं आपूर्ति विभाग के सत्यापन के बाद जारी होता है।",
    },
    aliases: ["eshram card", "ration card", "rashan card", "ई श्रम", "राशन कार्ड"],
    sampleFallbackType: "aadhaar-card",
    sortOrder: 2,
  },

  // -----------------------------------------------------------------------
  // 9. AGRICULTURE & FARMER SERVICES (`agriculture`)
  // -----------------------------------------------------------------------
  {
    id: "pm-kisan-farmer-registration",
    slug: "pm-kisan-farmer-registration-dbt",
    categoryId: "agriculture",
    subcategoryId: "pm-kisan-dbt",
    name: { en: "PM-Kisan & DBT Farmer Registration Assistance", hi: "पीएम-किसान व डीबीटी किसान पंजीकरण सहायता" },
    shortDescription: {
      en: "PM Kisan Samman Nidhi registration, e-KYC, status tracking, and DBT Bihar farmer registration.",
      hi: "डीबीटी किसान पंजीकरण, पीएम किसान सम्मान निधि ई-केवाईसी और स्टेटस जाँच में सहायता।",
    },
    description: {
      en: "Assistance for farmers in Bihar Agriculture DBT registration, PM-Kisan Samman Nidhi new beneficiary registration, OTP/biometric e-KYC, land record seeding verification, and installment status checking.",
      hi: "किसानों के लिए डीबीटी पंजीकरण, पीएम किसान 6000 वार्षिक सहायता फॉर्म, बायोमेट्रिक ई-केवाईसी और किस्त की स्थिति देखना।",
    },
    icon: "Sprout",
    image: "/gallery/pm-kisan-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Palak Enterprises facilitates online submission on government portals. Benefit approval is governed by Department of Agriculture.",
      hi: "पालक एंटरप्राइजेज पोर्टल सहायता केंद्र है। योजना का लाभ कृषि विभाग के नियमों के अधीन है।",
    },
    suitableFor: [
      { en: "Farmers & Landowners", hi: "किसान व भू-स्वामी" },
    ],
    aliases: [
      "pm kisan",
      "dbt bihar",
      "farmer registration",
      "kisan kyc",
      "पीएम किसान",
      "किसान रजिस्ट्रेशन",
      "डीबीटी किसान",
    ],
    sampleFallbackType: "pm-kisan",
    sortOrder: 1,
  },
  {
    id: "crop-insurance-assistance",
    slug: "crop-insurance-fasal-bima",
    categoryId: "agriculture",
    subcategoryId: "crop-insurance",
    name: { en: "Crop Insurance & Scheme Assistance", hi: "फसल बीमा व कृषि योजना सहायता" },
    shortDescription: {
      en: "Bihar Rajya Fasal Sahayata Yojana and PM Fasal Bima online filing facilitation.",
      hi: "बिहार राज्य फसल सहायता योजना और फसल बीमा ऑनलाइन आवेदन सहायता।",
    },
    description: {
      en: "Helping farmers submit land possession certificates (LPC), sowing declarations, and bank details for seasonal crop compensation and subsidized agricultural equipment schemes.",
      hi: "बाढ़ या सूखे से फसल नुकसान पर सरकारी फसल सहायता योजना का फॉर्म ऑनलाइन भरने में सहायता।",
    },
    icon: "ShieldCheck",
    image: "/gallery/pm-kisan-sample.svg",
    ctaType: "assistance",
    featured: false,
    aliases: ["fasal bima", "fasal sahayata", "crop insurance", "फसल बीमा", "फसल सहायता"],
    sampleFallbackType: "pm-kisan",
    sortOrder: 2,
  },

  // -----------------------------------------------------------------------
  // 10. LAND & REVENUE SERVICES (`land`)
  // -----------------------------------------------------------------------
  {
    id: "dakhil-kharij-mutation",
    slug: "dakhil-kharij-mutation-assistance",
    categoryId: "land",
    subcategoryId: "mutation-dakhil-kharij",
    name: { en: "Dakhil-Kharij (Mutation) Portal Assistance", hi: "दाखिल-खारिज (म्यूटेशन) पोर्टल सहायता" },
    shortDescription: {
      en: "Online portal filing assistance for Bihar Bhumi Land Mutation and case tracking.",
      hi: "बिहार भूमि पोर्टल पर ऑनलाइन दाखिल-खारिज आवेदन व स्टेटस ट्रैकिंग सहायता।",
    },
    description: {
      en: "Assisting citizens in uploading sale deeds, succession affidavits, and property details on the Bihar Bhumi portal for mutation, tracking rejection/objection reports, and hearing updates.",
      hi: "जमीन खरीद के बाद ऑनलाइन दाखिल-खारिज के लिए दस्तावेज अपलोड करने, केस नंबर ट्रैक करने और सुधार की प्रक्रिया में पोर्टल सहायता।",
    },
    icon: "Landmark",
    image: "/gallery/land-revenue-lagan-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Palak Enterprises is a private facilitation center helping with portal data entry and document scanning. Official mutation orders are adjudicated exclusively by the Circle Officer (CO) / Revenue Department.",
      hi: "पालक एंटरप्राइजेज केवल ऑनलाइन फॉर्म भरने व स्कैनिंग में मदद करता है। दाखिल-खारिज का कानूनी निर्णय अंचलाधिकारी/राजस्व विभाग द्वारा लिया जाता है।",
    },
    aliases: [
      "dakhil kharij",
      "mutation",
      "bihar bhumi",
      "khatiyan",
      "दाखिल खारिज",
      "म्यूटेशन",
      "जमीन दाखिल खारिज",
    ],
    sampleFallbackType: "land-record",
    sortOrder: 1,
  },
  {
    id: "lagan-jamabandi-assistance",
    slug: "land-tax-lagan-jamabandi-receipt",
    categoryId: "land",
    subcategoryId: "lagan-jamabandi",
    name: { en: "Land Tax (Lagan) Payment & Jamabandi Viewing", hi: "भू-लगान भुगतान व जमाबंदी रसीद" },
    shortDescription: {
      en: "Online land tax (Lagan) receipt payment, Khatiyan/Jamabandi viewing, and receipt download.",
      hi: "ऑनलाइन जमीन रसीद (भू-लगान) भुगतान, जमाबंदी नकल और ई-रसीद डाउनलोड।",
    },
    description: {
      en: "Assistance checking updated Jamabandi records, verifying pending land revenue tax, making secure online lagan payments, and printing government e-receipts.",
      hi: "अपनी जमीन का खाता-खेसरा व जमाबंदी देखना, बकाया लगान का ऑनलाइन भुगतान करना और पक्की सरकारी रसीद प्रिंट करना।",
    },
    icon: "Receipt",
    image: "/gallery/land-revenue-lagan-sample.svg",
    ctaType: "assistance",
    featured: false,
    disclaimer: {
      en: "Receipts are generated through the official Bihar Bhumi portal.",
      hi: "रसीद आधिकारिक बिहार भूमि पोर्टल से प्राप्त होती है।",
    },
    aliases: ["lagan", "jamin rasid", "jamabandi", "भू लगान", "जमीन रसीद", "जमाबंदी"],
    sampleFallbackType: "land-record",
    sortOrder: 2,
  },

  // -----------------------------------------------------------------------
  // 11. BANKING, RECHARGE & UTILITY SERVICES (`banking`)
  // -----------------------------------------------------------------------
  {
    id: "domestic-money-transfer",
    slug: "domestic-money-transfer-services",
    categoryId: "banking",
    subcategoryId: "money-transfer",
    name: { en: "Domestic Money Transfer (DMT) Assistance", hi: "घरेलू मनी ट्रांसफर सेवा" },
    shortDescription: {
      en: "Secure instant money transfer to any bank account across India with transaction receipts.",
      hi: "भारत के किसी भी बैंक खाते में तुरंत और सुरक्षित मनी ट्रांसफर व रसीद।",
    },
    description: {
      en: "Instant IMPS / NEFT bank remittances for workers, students, and businesses with authentic SMS confirmation and computerized receipts.",
      hi: "एसबीआई, पीएनबी, बैंक ऑफ बड़ौदा आदि सभी बैंकों में तुरंत पैसे भेजने की सुरक्षित डिजिटल सेवा।",
    },
    icon: "Banknote",
    image: "/gallery/money-transfer-sample.svg",
    ctaType: "service",
    featured: false,
    disclaimer: {
      en: "Facilitated through licensed Banking Correspondent / PPI partners under RBI guidelines.",
      hi: "यह सेवा आरबीआई नियमों के अनुसार अधिकृत बैंकिंग पार्टनर नेटवर्क द्वारा संचालित है।",
    },
    aliases: ["money transfer", "bank transfer", "dmt", "मनी ट्रांसफर", "पैसे भेजना"],
    sampleFallbackType: "money-transfer",
    sortOrder: 1,
  },
  {
    id: "mobile-dth-recharge-bills",
    slug: "mobile-recharge-electricity-bill-payment",
    categoryId: "banking",
    subcategoryId: "recharge-bills",
    name: { en: "Mobile, DTH & Electricity Bill Payments", hi: "मोबाइल/डीटीएच रिचार्ज व बिजली बिल भुगतान" },
    shortDescription: {
      en: "All-network mobile prepaid/postpaid, DTH top-ups, NBPDCL/SBPDCL electricity bill payments.",
      hi: "सभी मोबाइल नेटवर्क, डीटीएच रिचार्ज और नॉर्थ/साउथ बिहार बिजली बिल का तत्काल भुगतान।",
    },
    description: {
      en: "Quick prepaid recharges (Jio, Airtel, Vi, BSNL), DTH renewals (Tata Play, Dish TV, Airtel DTH), and instant electricity bill payments with printed receipts.",
      hi: "बिजली बिल भुगतान करने और सभी ऑपरेटर के मोबाइल-डीटीएच रिचार्ज की विश्वसनीय सेवा।",
    },
    icon: "CreditCard",
    image: "/gallery/money-transfer-sample.svg",
    ctaType: "service",
    featured: false,
    aliases: ["recharge", "bill payment", "bijli bill", "dth recharge", "रिचार्ज", "बिजली बिल"],
    sampleFallbackType: "money-transfer",
    sortOrder: 2,
  },

  // -----------------------------------------------------------------------
  // 12. WEBSITE & DIGITAL BUSINESS SERVICES (`website-development`)
  // -----------------------------------------------------------------------
  {
    id: "website-design-development",
    slug: "custom-website-development",
    categoryId: "website-development",
    subcategoryId: "web-development-sub",
    name: { en: "Business Website Design & Development", hi: "व्यावसायिक वेबसाइट डिज़ाइन व डेवलपमेंट" },
    shortDescription: {
      en: "Fast, mobile-responsive websites for schools, coaching institutes, shops, and businesses.",
      hi: "स्कूल, कोचिंग संस्थान, दुकान और व्यवसायों के लिए आधुनिक मोबाइल-फ्रेंडली वेबसाइट।",
    },
    description: {
      en: "Full-service web design and development tailored for local businesses: SEO-optimized, bilingual (English + Hindi), fast loading, WhatsApp chat integration, contact forms, Google Maps embedding, and domain setup.",
      hi: "अपने व्यापार, स्कूल या संस्थान के लिए आधुनिक वेबसाइट बनवाएं। मोबाइल पर तेजी से खुलने वाली, गूगल सर्च पर आने वाली और व्हाट्सएप कनेक्टेड वेबसाइट्स।",
    },
    icon: "MonitorSmartphone",
    image: "/gallery/website-development-sample.svg",
    ctaType: "discuss",
    featured: true,
    popularRank: 10,
    options: [
      {
        label: { en: "Website Type", hi: "वेबसाइट का प्रकार" },
        values: [
          { en: "School & College Portal", hi: "स्कूल व कॉलेज वेबसाइट" },
          { en: "Coaching Center & Batch Portal", hi: "कोचिंग संस्थान वेबसाइट" },
          { en: "Retail Store & Showroom Catalog", hi: "दुकान व शोरूम वेबसाइट" },
          { en: "Doctor / Clinic Appointment Site", hi: "क्लीनिक व डॉक्टर वेबसाइट" },
          { en: "Personal Professional Portfolio", hi: "व्यक्तिगत पोर्टफोलियो" },
        ],
      },
      {
        label: { en: "Key Inclusions", hi: "प्रमुख सुविधाएं" },
        values: [
          { en: "Bilingual English + Hindi", hi: "द्विभाषी (हिंदी + अंग्रेजी)" },
          { en: "WhatsApp Quick Chat & Call CTA", hi: "व्हाट्सएप व कॉल बटन" },
          { en: "Google Business & SEO Setup", hi: "गूगल सर्च व मैप्स सेटअप" },
          { en: "Free SSL & Fast Cloud Hosting", hi: "सुरक्षित एसएसएल व फास्ट होस्टिंग" },
        ],
      },
    ],
    process: [
      {
        step: 1,
        title: { en: "Project Discussion", hi: "प्रोजेक्ट पर चर्चा" },
        description: {
          en: "We understand your business goals, target audience, pages needed, and design taste.",
          hi: "हम आपकी संस्था, जरूरत और आवश्यक पेजों के बारे में विस्तार से समझते हैं।",
        },
      },
      {
        step: 2,
        title: { en: "Content & Structure Plan", hi: "कंटेंट व संरचना तैयार करना" },
        description: {
          en: "We organize your photos, services, address, and write bilingual descriptions.",
          hi: "हम आपकी फोटो, विवरण और सेवाओं को सही क्रम में व्यवस्थित करते हैं।",
        },
      },
      {
        step: 3,
        title: { en: "Design & Development", hi: "डिज़ाइन व कोडिंग" },
        description: {
          en: "We build modern, fast-loading, mobile-perfect pages using Next.js and Tailwind.",
          hi: "मोबाइल और कंप्यूटर दोनों पर सुंदर दिखने वाली आधुनिक वेबसाइट तैयार की जाती है।",
        },
      },
      {
        step: 4,
        title: { en: "Review & Testing", hi: "रिव्यू व टेस्टिंग" },
        description: {
          en: "You review the live preview on your phone and we make final refinements.",
          hi: "आप अपने फोन पर लाइव डेमो देखते हैं और आवश्यक सुधार किए जाते हैं।",
        },
      },
      {
        step: 5,
        title: { en: "Launch & Google Map Linking", hi: "लाइव व गूगल लिस्टिंग" },
        description: {
          en: "Your website goes live on your domain with Google Search Console setup.",
          hi: "वेबसाइट आपके डोमेन पर लाइव होती है और गूगल सर्च में दर्ज की जाती है।",
        },
      },
    ],
    suitableFor: [
      { en: "Schools & Educational Academies", hi: "स्कूल, कॉलेज व शिक्षण संस्थान" },
      { en: "Coaching Institutes & Teachers", hi: "कोचिंग संस्थान व शिक्षक" },
      { en: "Local Businesses & Shops", hi: "स्थानीय दुकानें व व्यापारी" },
      { en: "Doctors, Hospitals & Diagnostic Centers", hi: "डॉक्टर, अस्पताल व लैब" },
    ],
    faqs: [
      {
        question: {
          en: "How long does it take to create a business website?",
          hi: "वेबसाइट बनाने में कितना समय लगता है?",
        },
        answer: {
          en: "A standard 5-to-10 page business website is typically delivered within 4 to 7 business days once content is shared.",
          hi: "सामग्री और विवरण मिलने के बाद 4 से 7 दिनों में पूरी वेबसाइट तैयार हो जाती है।",
        },
      },
      {
        question: {
          en: "Will my website work well on mobile phones?",
          hi: "क्या वेबसाइट मोबाइल फोन पर ठीक से चलेगी?",
        },
        answer: {
          en: "Yes! 100% of our websites are designed mobile-first with high touch responsiveness, fast loading, and direct tap-to-WhatsApp actions.",
          hi: "हाँ, हमारी बनाई सभी वेबसाइट्स मोबाइल-फ्रेंडली होती हैं और फोन पर बेहद तेजी से खुलती हैं।",
        },
      },
      {
        question: {
          en: "Can you help set up domain and Google Maps listing too?",
          hi: "क्या आप डोमेन और गूगल मैप्स लिस्टिंग भी करते हैं?",
        },
        answer: {
          en: "Yes, we handle .com/.in domain registration, DNS configuration, and Google Business profile verification.",
          hi: "हाँ, हम डोमेन रजिस्ट्रेशन और गूगल मैप्स पर आपकी दुकान/संस्थान जोड़ने में पूरी मदद करते हैं।",
        },
      },
    ],
    relatedServiceIds: [
      "google-business-setup",
      "business-logo-design",
      "visiting-cards",
      "social-media-graphics",
    ],
    aliases: [
      "website",
      "website design",
      "web development",
      "school website",
      "coaching website",
      "business website",
      "वेबसाइट",
      "वेबसाइट निर्माण",
    ],
    sampleFallbackType: "website-dev",
    sortOrder: 1,
  },
  {
    id: "google-business-setup",
    slug: "google-business-profile-setup",
    categoryId: "website-development",
    subcategoryId: "digital-business-setup",
    name: { en: "Google Business Profile & Maps Setup", hi: "गूगल बिजनेस प्रोफाइल व मैप्स सेटअप" },
    shortDescription: {
      en: "Add your shop or school to Google Maps, set opening hours, photos, and receive local customer calls.",
      hi: "अपनी दुकान या संस्थान को गूगल मैप्स पर जोड़ें, फोटो डालें और ग्राहकों के कॉल प्राप्त करें।",
    },
    description: {
      en: "Optimize your local presence on Google Search and Maps so nearby customers in Chakia and surrounding areas find your phone number, directions, reviews, and timings instantly.",
      hi: "गूगल सर्च और गूगल मैप्स पर आपकी दुकान, स्कूल या क्लीनिक का पता, फोन नंबर और फोटो जोड़ना।",
    },
    icon: "Globe",
    image: "/gallery/website-development-sample.svg",
    ctaType: "discuss",
    featured: false,
    aliases: ["google map", "google business", "gmb setup", "गूगल मैप्स", "गूगल लिस्टिंग"],
    sampleFallbackType: "website-dev",
    sortOrder: 2,
  },
];

// =========================================================================
// HELPER LOOKUP FUNCTIONS
// =========================================================================

export function getCategoryBySlug(slug: string): ServiceCategory | undefined {
  return categories.find((c) => c.slug === slug || c.id === slug);
}

export function getServicesByCategory(categoryId: ServiceCategoryId): Service[] {
  return services.filter((s) => s.categoryId === categoryId);
}

export function getServiceBySlug(
  categorySlug: string,
  serviceSlug: string
): Service | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  return services.find(
    (s) => s.categoryId === category.id && (s.slug === serviceSlug || s.id === serviceSlug)
  );
}

export function getServiceById(id: string): Service | undefined {
  return services.find((s) => s.id === id || s.slug === id);
}

export function getPopularServices(): Service[] {
  return services
    .filter((s) => s.featured && s.popularRank !== undefined)
    .sort((a, b) => (a.popularRank ?? 99) - (b.popularRank ?? 99));
}

export function searchServices(
  query: string,
  lang: "en" | "hi" = "en",
  categoryId?: ServiceCategoryId | "all"
): Service[] {
  const q = query.trim().toLowerCase();
  return services.filter((s) => {
    if (categoryId && categoryId !== "all" && s.categoryId !== categoryId) {
      return false;
    }
    if (!q) return true;

    const cat = categories.find((c) => c.id === s.categoryId);
    const subcat = cat?.subcategories.find((sub) => sub.id === s.subcategoryId);

    const haystacks = [
      s.name.en.toLowerCase(),
      s.name.hi.toLowerCase(),
      s.shortDescription.en.toLowerCase(),
      s.shortDescription.hi.toLowerCase(),
      s.description.en.toLowerCase(),
      s.description.hi.toLowerCase(),
      s.slug.toLowerCase(),
      cat?.name.en.toLowerCase() ?? "",
      cat?.name.hi.toLowerCase() ?? "",
      cat?.shortName.en.toLowerCase() ?? "",
      cat?.shortName.hi.toLowerCase() ?? "",
      subcat?.name.en.toLowerCase() ?? "",
      subcat?.name.hi.toLowerCase() ?? "",
      ...(s.aliases?.map((a) => a.toLowerCase()) ?? []),
    ];

    if (lang === "hi") {
      haystacks.push(s.name.hi.toLowerCase());
    }

    return haystacks.some((h) => h.includes(q));
  });
}

// Backward-compatibility aliases
export type ServiceItem = Service;
export const servicesData: Service[] = services;
export const serviceCategories: ServiceCategory[] = categories;

