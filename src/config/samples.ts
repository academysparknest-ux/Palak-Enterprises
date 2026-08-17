export type SampleCategory =
  | "all"
  | "printing"
  | "stationery"
  | "wedding"
  | "business"
  | "digital"
  | "design";

export type SampleBadge = "Sample / Reference" | "Design Concept" | "Sample Design" | "Official Press" | "Actual Photo";

export type SampleFallbackType =
  | "visiting-card"
  | "wedding-card"
  | "birthday-invitation"
  | "letterhead"
  | "brochure"
  | "flyer"
  | "banner"
  | "certificate"
  | "id-card"
  | "bill-book"
  | "passport-photo"
  | "photo"
  | "lamination"
  | "spiral-binding"
  | "hardcover-binding"
  | "resume"
  | "document-scan"
  | "form"
  | "document"
  | "invitation"
  | "pan-card"
  | "aadhaar-card"
  | "ayushman-card"
  | "rtps-certificate"
  | "pm-kisan"
  | "land-record"
  | "money-transfer"
  | "website-dev"
  | "logo-design"
  | "condolence-card"
  | "photocopy";

export interface SampleItem {
  id: string;
  category: SampleCategory;
  serviceId?: string;
  title: { en: string; hi: string };
  description: { en: string; hi: string };
  badge: { en: SampleBadge; hi: string };
  image: string;
  fallbackType: SampleFallbackType;
  source: {
    name: string;
    url: string;
    license: string;
  };
  featured?: boolean;
}

export const sampleCategories: { id: SampleCategory; name: { en: string; hi: string } }[] = [
  { id: "all", name: { en: "All", hi: "सभी" } },
  { id: "printing", name: { en: "Printing", hi: "प्रिंटिंग" } },
  { id: "stationery", name: { en: "Stationery", hi: "स्टेशनरी" } },
  { id: "wedding", name: { en: "Wedding", hi: "शादी व कार्ड्स" } },
  { id: "business", name: { en: "Business", hi: "व्यावसायिक" } },
  { id: "digital", name: { en: "Digital", hi: "डिजिटल" } },
  { id: "design", name: { en: "Design", hi: "डिज़ाइन" } },
];

export const sampleItems: SampleItem[] = [
  // --- REAL BUSINESS PHOTOS & MASTER BANNERS ---
  {
    id: "sample-master-printing-banner",
    category: "printing",
    serviceId: "commercial-printing",
    title: { en: "Palak Printing Press Master Board", hi: "पलक प्रिंटिंग प्रेस मास्टर बोर्ड" },
    description: {
      en: "Official master press board showcasing our complete range of offset, digital, flex printing, and document services.",
      hi: "ऑफसेट, डिजिटल छपाई, शादी कार्ड, पोस्टर और ऑनलाइन सेवाओं की संपूर्ण श्रृंखला दर्शाने वाला मुख्य बोर्ड।",
    },
    badge: { en: "Official Press", hi: "ऑफिशियल बोर्ड" },
    image: "/images/palak-printing-press-banner.jpeg",
    fallbackType: "banner",
    source: { name: "Palak Enterprises", url: "#", license: "Verified Original" },
    featured: true,
  },
  {
    id: "sample-online-service-standee",
    category: "digital",
    serviceId: "online-services",
    title: { en: "Online Service Center Standee Banner", hi: "ऑनलाइन सेवा केंद्र स्टैंडी बैनर" },
    description: {
      en: "Complete listing of Aadhaar, PAN, RTPS, DBT agriculture, scholarship forms, banking, and government e-services.",
      hi: "आधार, पैन, जाति-आय-निवास, किसान सम्मान निधि, दाखिल-खारिज और सरकारी सेवाओं का संपूर्ण विवरण।",
    },
    badge: { en: "Official Press", hi: "ऑफिशियल बैनर" },
    image: "/images/palak-online-service-banner.jpeg",
    fallbackType: "banner",
    source: { name: "Palak Enterprises", url: "#", license: "Verified Original" },
    featured: true,
  },
  {
    id: "sample-palak-visiting-card-real",
    category: "printing",
    serviceId: "visiting-cards",
    title: { en: "Palak Press Visiting Card & Signboard", hi: "पलक प्रिंटिंग प्रेस विजिटिंग कार्ड" },
    description: {
      en: "Original business card and contact signboard design for proprietor Pankaj Kumar, Chakia.",
      hi: "प्रो. पंकज कुमार, वार्ड नं. 7, रानीगंज मोहल्ला, बारा चकिया का आधिकारिक विजिटिंग कार्ड व बोर्ड।",
    },
    badge: { en: "Actual Photo", hi: "वास्तविक कार्ड" },
    image: "/images/palak-visiting-card.jpeg",
    fallbackType: "visiting-card",
    source: { name: "Palak Enterprises", url: "#", license: "Verified Original" },
    featured: true,
  },
  {
    id: "sample-official-logo",
    category: "design",
    serviceId: "business-logo-design",
    title: { en: "Palak Enterprises Official Logo", hi: "पलक एंटरप्राइजेज आधिकारिक लोगो" },
    description: {
      en: "Signature circular emblem and brand identity of Palak Enterprises Chakia featuring Shri Ram & Hanuman Ji.",
      hi: "श्री राम व श्री हनुमान जी के पावन स्वरूप से सुसज्जित पलक एंटरप्राइजेज चकिया का आधिकारिक गोलाकार लोगो।",
    },
    badge: { en: "Official Press", hi: "आधिकारिक लोगो" },
    image: "/images/palak-logo-ram-hanuman.jpeg",
    fallbackType: "logo-design",
    source: { name: "Palak Enterprises", url: "#", license: "Verified Original" },
    featured: true,
  },
  {
    id: "sample-independence-day-banner",
    category: "design",
    serviceId: "marketing-creatives",
    title: { en: "15th August Independence Day Banner", hi: "15 अगस्त स्वतंत्रता दिवस शुभकामना बैनर" },
    description: {
      en: "Vibrant national festival greeting banner designed with high-resolution patriotic elements for local businesses.",
      hi: "स्वतंत्रता दिवस एवं राष्ट्रीय पर्वों के लिए तैयार किया गया उच्च-गुणवत्ता देशभक्ति व व्यावसायिक पोस्टर।",
    },
    badge: { en: "Sample Design", hi: "ग्राफिक सैंपल" },
    image: "/images/palak-independence-day-banner.jpeg",
    fallbackType: "banner",
    source: { name: "Palak Enterprises", url: "#", license: "Verified Original" },
    featured: true,
  },
  {
    id: "sample-csc-msme-verification",
    category: "business",
    serviceId: "pan-card-assistance",
    title: { en: "CSC & MSME Government Verification", hi: "सीएससी व एमएसएमई सरकारी प्रमाणन" },
    description: {
      en: "Official Government CSC Center ID (634165120013) & MSME Udyam Registration (UDYAM-BR-11-0061705).",
      hi: "भारत सरकार द्वारा मान्यता प्राप्त कॉमन सर्विस सेंटर (CSC) व सूक्ष्म, लघु एवं मध्यम उद्यम (MSME) पंजीयन।",
    },
    badge: { en: "Official Press", hi: "सरकारी प्रमाणन" },
    image: "/images/palak-csc-msme-verification.jpeg",
    fallbackType: "document",
    source: { name: "Palak Enterprises", url: "#", license: "Government Portal" },
    featured: false,
  },

  // --- 1. VISITING CARDS ---
  {
    id: "sample-visiting-cards",
    category: "printing",
    serviceId: "visiting-cards",
    title: { en: "Matte & Glossy Visiting Cards", hi: "प्रीमियम विजिटिंग कार्ड्स" },
    description: {
      en: "Multi-finish business cards printed with high-resolution typography, spot UV gloss, and clean branding.",
      hi: "दुकानदारों व पेशेवरों के लिए मैट, ग्लॉसी और स्पॉट यूवी फिनिश वाले प्रिंटेड विजिटिंग कार्ड।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/visiting-cards-sample.svg",
    fallbackType: "visiting-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: true,
  },

  // --- 2. WEDDING INVITATIONS ---
  {
    id: "sample-wedding-invitation",
    category: "wedding",
    serviceId: "wedding-cards",
    title: { en: "Traditional Indian Wedding Cards", hi: "पारंपरिक भारतीय शादी कार्ड" },
    description: {
      en: "Rich red and gold foil embossed printed wedding cards with matching printed envelopes and traditional motifs.",
      hi: "लाल, महरून और गोल्डन फॉयल प्रिंट वाले सुंदर पारंपरिक शादी के कार्ड व लिफाफे।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/wedding-invitation-sample.svg",
    fallbackType: "wedding-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: true,
  },

  // --- 3. FLEX BANNERS ---
  {
    id: "sample-flex-banner",
    category: "printing",
    serviceId: "banners-flex",
    title: { en: "Shopfront Flex Banners & Hoardings", hi: "दुकान व प्रचार फ्लेक्स बैनर" },
    description: {
      en: "Heavy-duty outdoor printed flex vinyl banner with vibrant waterproof colors, corner eyelets, and clear typography.",
      hi: "दुकान के नाम और विज्ञापनों के लिए टिकाऊ वाटरप्रूफ फ्लेक्स बैनर व होर्डिंग प्रिंट।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/flex-banner-sample.svg",
    fallbackType: "banner",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: true,
  },

  // --- 4. PAN CARD SERVICE ---
  {
    id: "sample-pan-card",
    category: "digital",
    serviceId: "pan-card-assistance",
    title: { en: "PAN Card Application & Instant Print", hi: "पैन कार्ड आवेदन व तत्काल प्रिंट" },
    description: {
      en: "Fast new PAN card application, name/DOB correction, minor-to-major update, and instant reprint on plastic card.",
      hi: "नया पैन कार्ड आवेदन, नाम/जन्मतिथि सुधार और प्लास्टिक पीवीसी कार्ड पर तत्काल लेमिनेटेड प्रिंट।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/pan-card-sample.svg",
    fallbackType: "pan-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: true,
  },

  // --- 5. AADHAAR PVC PRINT ---
  {
    id: "sample-aadhaar-print",
    category: "digital",
    serviceId: "aadhaar-pvc-government",
    title: { en: "Aadhaar Card Download & PVC Smart Print", hi: "आधार कार्ड डाउनलोड व पीवीसी स्मार्ट प्रिंट" },
    description: {
      en: "High-resolution color Aadhaar print, official UIDAI PVC card ordering, and durable thermal lamination.",
      hi: "ओटीपी व बायोमेट्रिक से आधार डाउनलोड, वॉटरप्रूफ प्लास्टिक स्मार्ट कार्ड प्रिंट और लैमिनेशन।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/aadhaar-print-sample.svg",
    fallbackType: "aadhaar-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: true,
  },

  // --- 6. AYUSHMAN GOLDEN CARD ---
  {
    id: "sample-ayushman-card",
    category: "digital",
    serviceId: "ayushman-card-assistance",
    title: { en: "Ayushman Bharat Golden Card (PM-JAY)", hi: "आयुष्मान भारत गोल्डन कार्ड (PM-JAY)" },
    description: {
      en: "Assistance with ABHA ID generation, PM-JAY eligibility verification, and high-quality waterproof card printing.",
      hi: "5 लाख तक के मुफ़्त इलाज हेतु आभा आईडी और आयुष्मान गोल्डन कार्ड निर्माण व प्रिंटिंग।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/ayushman-card-sample.svg",
    fallbackType: "ayushman-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: true,
  },

  // --- 7. RTPS CERTIFICATES (JATI, AAY, NIWAS) ---
  {
    id: "sample-rtps-certificate",
    category: "digital",
    serviceId: "rtps-certificates",
    title: { en: "Bihar RTPS Caste, Income & Residence Certificate", hi: "बिहार RTPS जाति, आय, निवास प्रमाण पत्र" },
    description: {
      en: "Online application, status tracking, and digitally signed certificate download for Caste, Income, and Domicile.",
      hi: "बिहार RTPS पोर्टल से जाति, आय, निवास व ईडब्ल्यूएस प्रमाण पत्र का ऑनलाइन आवेदन व सत्यापन।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/rtps-certificate-sample.svg",
    fallbackType: "rtps-certificate",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 8. PM-KISAN & DBT AGRICULTURE ---
  {
    id: "sample-pm-kisan",
    category: "digital",
    serviceId: "pm-kisan-farmer-registration",
    title: { en: "PM-Kisan Samman Nidhi & DBT Agriculture", hi: "पीएम-किसान सम्मान निधि व किसान पंजीकरण" },
    description: {
      en: "DBT Bihar farmer registration, PM-Kisan Samman Nidhi e-KYC, land seeding status, and crop insurance application.",
      hi: "कृषि विभाग बिहार किसान रजिस्ट्रेशन, पीएम-किसान ई-केवाईसी, खाता सत्यापन और फसल बीमा सहायता।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/pm-kisan-sample.svg",
    fallbackType: "pm-kisan",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 9. LAND REVENUE & LAGAN ---
  {
    id: "sample-land-revenue",
    category: "digital",
    serviceId: "lagan-jamabandi-assistance",
    title: { en: "Bihar Bhumi Online Lagan & Dakhil Kharij", hi: "बिहार भूमि ऑनलाइन लगान व दाखिल-खारिज" },
    description: {
      en: "Online land tax payment, official Bihar Bhumi Lagan receipt download, Jamabandi copy, and mutation tracking.",
      hi: "जमीन की ऑनलाइन लगान रसीद काटना, खाता-खेसरा जमाबंदी नकल और दाखिल-खारिज स्टेटस चेक।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/land-revenue-lagan-sample.svg",
    fallbackType: "land-record",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 10. MONEY TRANSFER & BILLS ---
  {
    id: "sample-money-transfer",
    category: "digital",
    serviceId: "domestic-money-transfer",
    title: { en: "Domestic Money Transfer & Bill Payment", hi: "घरेलू मनी ट्रांसफर व बिजली बिल भुगतान" },
    description: {
      en: "Instant all-India bank transfers via IMPS/NEFT, NBPDCL electricity bill payment, and all mobile/DTH recharges.",
      hi: "सभी बैंकों में तत्काल मनी ट्रांसफर, उत्तर बिहार बिजली बिल भुगतान और सभी मोबाइल/डीटीएच रिचार्ज।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/money-transfer-sample.svg",
    fallbackType: "money-transfer",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 11. WEBSITE DEVELOPMENT ---
  {
    id: "sample-website-dev",
    category: "business",
    serviceId: "website-design-development",
    title: { en: "School, Coaching & Business Website Setup", hi: "स्कूल, कोचिंग व दुकान वेबसाइट निर्माण" },
    description: {
      en: "Fast, mobile-ready websites for local schools, coaching institutes, shops, plus Google Maps & Business verification.",
      hi: "स्कूलों, कोचिंग संस्थानों व दुकानों के लिए आधुनिक मोबाइल-फ्रेंडली वेबसाइट व गूगल मैप्स लिस्टिंग।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/website-development-sample.svg",
    fallbackType: "website-dev",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 12. LOGO & BRAND DESIGN ---
  {
    id: "sample-logo-design",
    category: "design",
    serviceId: "business-logo-design",
    title: { en: "Brand Logo & Graphic Design", hi: "बिजनेस लोगो व ग्राफिक डिज़ाइन" },
    description: {
      en: "Custom vector brand logo, social media promo creatives, marketing flyers, and personalized banners.",
      hi: "दुकान व कंपनी के लिए आकर्षक वेक्टर लोगो, सोशल मीडिया पोस्ट और प्रमोशनल ग्राफ़िक्स निर्माण।",
    },
    badge: { en: "Design Concept", hi: "डिज़ाइन कॉन्सेप्ट" },
    image: "/gallery/logo-design-sample.svg",
    fallbackType: "logo-design",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 13. SHOK SANDESH / CONDOLENCE CARDS ---
  {
    id: "sample-condolence-card",
    category: "wedding",
    serviceId: "condolence-cards-printing",
    title: { en: "Condolence & Shok Sandesh Cards", hi: "शोक-संदेश व श्रद्धांजलि कार्ड" },
    description: {
      en: "Traditional respectful condolence invitation cards for Dashgatra, Ekadashah, and Brahmabhoj ceremonies.",
      hi: "दशगात्र, एकादशाह और ब्रह्मभोज शांति पाठ के लिए गरिमामय पारंपरिक शोक संदेश निमंत्रण पत्र।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/condolence-card-sample.svg",
    fallbackType: "condolence-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 14. PHOTOCOPY & COLOR PRINT ---
  {
    id: "sample-photocopy",
    category: "printing",
    serviceId: "photocopy-service",
    title: { en: "High-Speed Laser Photocopy & Print", hi: "हाई-स्पीड लेजर फोटोकॉपी व कलर प्रिंट" },
    description: {
      en: "Crisp black & white Xerox, vibrant color document prints, single/double sided in high volume.",
      hi: "दस्तावेज़ों और किताबों की साफ-सुथरी ब्लैक एंड व्हाइट व रंगीन फोटोकॉपी और लेजर प्रिंटिंग।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/photocopy-color-print-sample.svg",
    fallbackType: "photocopy",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 15. LETTERHEADS & ENVELOPES ---
  {
    id: "sample-letterhead-envelope",
    category: "stationery",
    serviceId: "letterheads",
    title: { en: "Company Letterheads & Envelopes", hi: "कंपनी लेटरहेड व लिफाफे" },
    description: {
      en: "Official letter pads with branded headers, matching printed envelopes and clean margins.",
      hi: "ब्रांडेड हेडर, फूटर और मैचिंग लिफाफे के साथ आधिकारिक लेटर पैड।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/letterhead-envelope-sample.svg",
    fallbackType: "letterhead",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 16. BROCHURES ---
  {
    id: "sample-trifold-brochure",
    category: "business",
    serviceId: "brochures",
    title: { en: "Printed Tri-Fold Brochures & Leaflets", hi: "थ्री-फोल्ड बिजनेस ब्रोशर" },
    description: {
      en: "Full-color printed tri-fold brochure displaying business panels, service breakdown, and contact details.",
      hi: "कंपनी और संस्थान की जानकारी प्रदर्शित करने वाले तीन-तह मुड़े हुए रंगीन ब्रोशर।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/trifold-brochure-sample.svg",
    fallbackType: "brochure",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 17. PROMOTIONAL POSTERS & FLYERS ---
  {
    id: "sample-promotional-poster",
    category: "printing",
    serviceId: "pamphlets-flyers",
    title: { en: "Promotional Posters & Event Flyers", hi: "प्रचार पोस्टर व फ्लायर्स" },
    description: {
      en: "High-volume single and double-sided glossy flyers and promotional posters for business and event campaigns.",
      hi: "स्थानीय प्रचार और विज्ञापनों के लिए मुद्रित आकर्षक सिंगल व डबल साइड पम्पलेट व पोस्टर।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/promotional-poster-sample.svg",
    fallbackType: "flyer",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 18. PASSPORT PHOTOS ---
  {
    id: "sample-passport-photos",
    category: "digital",
    serviceId: "passport-photo-service",
    title: { en: "Printed Passport-Size Photo Sheet", hi: "पासपोर्ट साइज़ फोटो शीट" },
    description: {
      en: "Printed 8/16/32 passport photo sheet on high-gloss photographic paper with crisp borders and clean background.",
      hi: "सफेद या नीले बैकग्राउंड के साथ 8/16/32 प्रतियों वाली ग्लॉसी पासपोर्ट फोटो शीट।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/passport-photo-sheet-sample.svg",
    fallbackType: "passport-photo",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 19. PVC ID CARDS ---
  {
    id: "sample-pvc-id-card",
    category: "stationery",
    serviceId: "id-cards",
    title: { en: "Printed PVC Smart Photo ID Cards", hi: "पीवीसी फोटो आईडी कार्ड्स" },
    description: {
      en: "Durable plastic PVC identity cards with crisp photo printing, barcode, QR code, and clip lanyard.",
      hi: "डोरी, होल्डर और बारकोड के साथ मजबूत प्लास्टिक फोटो आईडी कार्ड का नमूना।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/pvc-id-card-sample.svg",
    fallbackType: "id-card",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 20. BILL BOOKS / RECEIPT BOOKS ---
  {
    id: "sample-bill-book",
    category: "stationery",
    serviceId: "bill-books",
    title: { en: "Custom Duplicate Bill & Receipt Books", hi: "कस्टम बिल बुक व रसीद पैड" },
    description: {
      en: "Numbered duplicate and carbon-copy bill books with custom shop header, GST details, and perforated sheets.",
      hi: "दुकान के नाम, जीएसटी और नंबरिंग के साथ डुप्लिकेट व ट्रिप्लिकेट बिल बुक्स।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/bill-book-sample.svg",
    fallbackType: "bill-book",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 21. PHOTO PRINTING & ENLARGEMENT ---
  {
    id: "sample-glossy-photo-prints",
    category: "digital",
    serviceId: "photo-printing-studio",
    title: { en: "Glossy Photo Prints & Enlargements", hi: "स्टूडियो फोटो प्रिंट व एनलार्जमेंट" },
    description: {
      en: "High-resolution color photograph prints on premium waterproof photo paper in 4x6, 8x10, 12x18.",
      hi: "प्रीमियम ग्लॉसी फोटो शीट पर बड़े आकार में हाई-डेफिनिशन फोटो प्रिंट।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/glossy-photo-prints-sample.svg",
    fallbackType: "photo",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 22. LAMINATION ---
  {
    id: "sample-laminated-document",
    category: "digital",
    serviceId: "lamination-service",
    title: { en: "Thermal Pouch Document Lamination", hi: "दस्तावेज़ व कार्ड लैमिनेशन" },
    description: {
      en: "Heavy-duty 125-micron thermal pouch lamination for marksheets, certificates, Aadhaar, and ID cards.",
      hi: "प्रमाण पत्र और आईडी कार्ड को पानी व धूल से बचाने के लिए 125-माइक्रोन वॉटरप्रूफ लैमिनेशन।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/laminated-document-sample.svg",
    fallbackType: "lamination",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 23. SPIRAL BINDING ---
  {
    id: "sample-spiral-binding",
    category: "digital",
    serviceId: "spiral-binding-service",
    title: { en: "Spiral Bound Project Reports & Thesis", hi: "स्पाइरल बाउंड प्रोजेक्ट रिपोर्ट" },
    description: {
      en: "Neatly bound project reports and study manuals with transparent front sheets and plastic spiral spine.",
      hi: "प्रोजेक्ट्स व बुक्स के लिए मजबूत प्लास्टिक स्पाइरल और ट्रांसपेरेंट कवर बाइंडिंग।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/spiral-binding-sample.svg",
    fallbackType: "spiral-binding",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 24. BIRTHDAY INVITATIONS ---
  {
    id: "sample-birthday-invitation",
    category: "wedding",
    serviceId: "invitation-cards",
    title: { en: "Printed Birthday & Event Invitations", hi: "बर्थडे इनविटेशन कार्ड" },
    description: {
      en: "Colorful custom printed birthday party invitation cards on sturdy cardstock with custom themes.",
      hi: "बच्चों और पारिवारिक जन्मदिन समारोह के लिए रंगीन कस्टम प्रिंटेड निमंत्रण पत्र।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/birthday-invitation-sample.svg",
    fallbackType: "birthday-invitation",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 25. CERTIFICATES ---
  {
    id: "sample-achievement-certificate",
    category: "printing",
    serviceId: "certificates-printing",
    title: { en: "Certificate of Achievement & Awards", hi: "प्रशस्ति पत्र व प्रमाण पत्र प्रिंटिंग" },
    description: {
      en: "Gold-bordered academic and corporate achievement certificates with gold seal styling on heavy cardstock.",
      hi: "स्कूल, कॉलेज और संस्थागत सम्मान के लिए गोल्डन बॉर्डर वाले प्रशस्ति पत्र व प्रमाण पत्र।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/achievement-certificate-sample.svg",
    fallbackType: "certificate",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 26. RESUME & CV ---
  {
    id: "sample-resume-cv",
    category: "digital",
    serviceId: "resume-typing-printing",
    title: { en: "Professional Resume & CV Printing", hi: "प्रोफेशनल रिज्यूमे व सीवी प्रिंटिंग" },
    description: {
      en: "Clean formatting and laser printing for professional job resumes, bio-data, and curriculum vitae.",
      hi: "नौकरी व साक्षात्कार के लिए साफ-सुथरा फॉर्मेटेड व लेजर प्रिंटेड बायोडाटा।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/resume-cv-print-sample.svg",
    fallbackType: "resume",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 27. MARRIAGE BIODATA ---
  {
    id: "sample-marriage-biodata",
    category: "wedding",
    serviceId: "marriage-biodata",
    title: { en: "Marriage Bio-Data & Matrimonial Formats", hi: "विवाह बायोडाटा व मांगलिक प्रारूप" },
    description: {
      en: "Elegant traditional and modern matrimonial bio-data designs with Hindi & English formatting and religious motifs.",
      hi: "पारंपरिक शुभ प्रतीकों और सुंदर फॉन्ट के साथ विवाह हेतु वैवाहिक बायोडाटा निर्माण।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/marriage-biodata-sample.svg",
    fallbackType: "resume",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 28. DOCUMENT SCANNING ---
  {
    id: "sample-scanned-pdf",
    category: "digital",
    serviceId: "scanning-digitization",
    title: { en: "High-Resolution Document Scan to PDF", hi: "हाई-रेजोल्यूशन डॉक्यूमेंट स्कैनिंग व पीडीएफ" },
    description: {
      en: "600 DPI crisp document digitisation, multi-page PDF compilation, and file compression for online portals.",
      hi: "ऑनलाइन फॉर्म और अभिलेखों के लिए स्पष्ट 600 डीपीआई डिजिटल स्कैनिंग व पीडीएफ।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/scanned-pdf-document-sample.svg",
    fallbackType: "document-scan",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },

  // --- 29. ONLINE FORM FILLING ---
  {
    id: "sample-online-form-filling",
    category: "digital",
    serviceId: "online-form-filling",
    title: { en: "Online Application & Form Filling Flow", hi: "ऑनलाइन परीक्षा व सरकारी फॉर्म आवेदन" },
    description: {
      en: "Accurate online form submission, admit card downloads, fee payments, and verified acknowledgement receipts.",
      hi: "सरकारी नौकरी, छात्रवृत्ति और प्रवेश परीक्षाओं के लिए त्रुटिहीन ऑनलाइन फॉर्म व रसीद।",
    },
    badge: { en: "Sample / Reference", hi: "सैंपल / संदर्भ" },
    image: "/gallery/online-form-filling-sample.svg",
    fallbackType: "form",
    source: { name: "Palak Enterprises", url: "#", license: "Sample Reference" },
    featured: false,
  },
];

export function getSamplesByServiceId(serviceId: string): SampleItem[] {
  return sampleItems.filter((item) => item.serviceId === serviceId);
}

export function getFeaturedSamples(): SampleItem[] {
  return sampleItems.filter((item) => item.featured);
}
