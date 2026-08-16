export interface LocalCategory {
  id: string;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  iconName: string;
  categoryType: "printing" | "digital" | "business" | "wedding" | "design";
  badge?: { en: string; hi: string };
  count: number;
}

export interface OptionValue {
  key: string;
  label: { en: string; hi: string };
  priceModifier?: number; // fixed add-on e.g. +50 Rs
  multiplier?: number; // multiplier e.g. 1.2x
  isDefault?: boolean;
}

export interface ProductOption {
  key: "quantity" | "paper_gsm" | "sides" | "finish" | "corners" | "size" | "binding" | "custom";
  name: { en: string; hi: string };
  values: OptionValue[];
}

export interface LocalProduct {
  id: string;
  slug: string;
  categoryId: string;
  categoryType: "printing" | "business" | "wedding";
  name: { en: string; hi: string };
  shortDesc: { en: string; hi: string };
  description: { en: string; hi: string };
  startingPrice: number;
  baseQuantity: number;
  unit: string;
  imageUrl: string;
  galleryUrls: string[];
  isFeatured?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  turnaroundTime: { en: string; hi: string };
  tags: string[];
  options: ProductOption[];
  specifications: {
    dimensions?: string;
    paperType?: string;
    printingTech?: string;
    minimumOrder?: string;
  };
}

export interface LocalService {
  id: string;
  slug: string;
  categoryId: string;
  name: { en: string; hi: string };
  shortDesc: { en: string; hi: string };
  description: { en: string; hi: string };
  estimatedFee: number;
  processingTime: { en: string; hi: string };
  requiredDocuments: { en: string; hi: string }[];
  whoNeedsIt: { en: string; hi: string }[];
  importantInstructions: { en: string; hi: string }[];
  officialPortalName?: string;
  disclaimer: { en: string; hi: string };
  iconName: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  tags: string[];
}

export const CATEGORIES: LocalCategory[] = [
  {
    id: "printing-products",
    name: { en: "Printing & Press", hi: "प्रिंटिंग एवं प्रेस" },
    description: {
      en: "Visiting cards, letterheads, flex banners, pamphlets, photo prints & packaging.",
      hi: "विजिटिंग कार्ड, लेटरहेड, फ्लेक्स बैनर, पम्पलेट, फोटो प्रिंट व पैकेजिंग।",
    },
    iconName: "Printer",
    categoryType: "printing",
    badge: { en: "Popular", hi: "लोकप्रिय" },
    count: 14,
  },
  {
    id: "digital-services",
    name: { en: "Online & Digital Services", hi: "डिजिटल एवं ऑनलाइन सेवाएँ" },
    description: {
      en: "PAN cards, RTPS certificates, exam forms, pensions, Aadhaar print & CSC assistance.",
      hi: "पैन कार्ड, आरटीपीएस प्रमाणपत्र, परीक्षा फॉर्म, पेंशन, आधार प्रिंट व सीएससी सहायता।",
    },
    iconName: "Globe",
    categoryType: "digital",
    badge: { en: "Govt & CSC", hi: "सरकारी व सीएससी" },
    count: 12,
  },
  {
    id: "business-solutions",
    name: { en: "Business Solutions", hi: "व्यावसायिक समाधान" },
    description: {
      en: "Complete office stationery, shop branding, bill books, school kits & custom web dev.",
      hi: "ऑफिस स्टेशनरी, दुकान ब्रांडिंग, बिल बुक, स्कूल किट एवं कस्टम वेब डेवलपमेंट।",
    },
    iconName: "Briefcase",
    categoryType: "business",
    badge: { en: "B2B / Bulk", hi: "थोक प्रिंटिंग" },
    count: 8,
  },
  {
    id: "wedding-events",
    name: { en: "Wedding & Ceremonies", hi: "शादी एवं मांगलिक कार्ड" },
    description: {
      en: "Custom invitation cards for weddings, Tilak, Mundan, birthdays & special occasions.",
      hi: "शादी, तिलक, मुंडन, जन्मदिन व मांगलिक आयोजनों के सुंदर निमंत्रण कार्ड।",
    },
    iconName: "Sparkles",
    categoryType: "wedding",
    badge: { en: "Celebrations", hi: "मांगलिक कार्य" },
    count: 6,
  },
];

export const PRODUCTS: LocalProduct[] = [
  {
    id: "visiting-cards",
    slug: "visiting-cards",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "Premium Visiting Cards", hi: "प्रीमियम विजिटिंग कार्ड" },
    shortDesc: {
      en: "High-grade 300-350 GSM business cards with Matte, Gloss or Velvet Spot-UV finish.",
      hi: "मैट, ग्लॉस या वेलवेट स्पॉट-यूवी फिनिश में 300-350 जीएसएम हाई-ग्रेड बिजनेस कार्ड।",
    },
    description: {
      en: "Make an unforgettable first impression with our professional business visiting cards. Precision cut with ultra-crisp offset and digital printing on sturdy cardstock. Choose from standard rectangular or rounded corners, single or dual-sided full color prints.",
      hi: "हमारे पेशेवर विजिटिंग कार्ड के साथ एक शानदार प्रभाव बनाएं। मजबूत कार्डस्टॉक पर अल्ट्रा-क्रिस्प डिजिटल प्रिंटिंग। सिंगल या डबल साइड, गोल या सामान्य कोनों के विकल्प उपलब्ध हैं।",
    },
    startingPrice: 199,
    baseQuantity: 100,
    unit: "Cards",
    imageUrl: "/images/gallery/visiting-cards-sample.svg",
    galleryUrls: [
      "/images/gallery/visiting-cards-sample.svg",
      "/images/gallery/letterhead-envelope-sample.svg",
    ],
    isFeatured: true,
    isPopular: true,
    turnaroundTime: { en: "Same Day / 24 Hours", hi: "उसी दिन / 24 घंटे" },
    tags: ["visiting card", "business card", "card", "विजिटिंग कार्ड", "बिजनेस कार्ड"],
    options: [
      {
        key: "quantity",
        name: { en: "Quantity", hi: "मात्रा (संख्या)" },
        values: [
          { key: "100", label: { en: "100 Cards", hi: "100 कार्ड" }, priceModifier: 0, multiplier: 1.0, isDefault: true },
          { key: "200", label: { en: "200 Cards", hi: "200 कार्ड" }, priceModifier: 0, multiplier: 1.75 },
          { key: "500", label: { en: "500 Cards (Best Value)", hi: "500 कार्ड (सर्वोत्तम मूल्य)" }, priceModifier: 0, multiplier: 3.2 },
          { key: "1000", label: { en: "1000 Cards (Bulk)", hi: "1000 कार्ड (थोक)" }, priceModifier: 0, multiplier: 5.5 },
        ],
      },
      {
        key: "paper_gsm",
        name: { en: "Paper Quality", hi: "पेपर क्वालिटी" },
        values: [
          { key: "250gsm", label: { en: "250 GSM Standard Art Board", hi: "250 GSM स्टैंडर्ड आर्ट बोर्ड" }, multiplier: 1.0, isDefault: true },
          { key: "300gsm", label: { en: "300 GSM Premium Card", hi: "300 GSM प्रीमियम कार्ड" }, multiplier: 1.2 },
          { key: "350gsm", label: { en: "350 GSM Heavy Luxury Board", hi: "350 GSM हैवी लग्जरी बोर्ड" }, multiplier: 1.45 },
        ],
      },
      {
        key: "sides",
        name: { en: "Printing Sides", hi: "प्रिंटिंग साइड" },
        values: [
          { key: "single", label: { en: "Single Sided", hi: "एक तरफ प्रिंट" }, multiplier: 1.0, isDefault: true },
          { key: "double", label: { en: "Double Sided (Back & Front)", hi: "दोनों तरफ प्रिंट" }, multiplier: 1.5 },
        ],
      },
      {
        key: "finish",
        name: { en: "Lamination / Coating", hi: "लैमिनेशन / फिनिश" },
        values: [
          { key: "matte", label: { en: "Premium Matte", hi: "मैट फिनिश" }, multiplier: 1.0, isDefault: true },
          { key: "gloss", label: { en: "Gloss Lamination", hi: "ग्लोसी लैमिनेशन" }, multiplier: 1.1 },
          { key: "spot_uv", label: { en: "Velvet Soft-Touch + Spot UV", hi: "वेलवेट + स्पॉट यूवी" }, multiplier: 1.6 },
        ],
      },
      {
        key: "corners",
        name: { en: "Corner Style", hi: "कोने का स्टाइल" },
        values: [
          { key: "standard", label: { en: "Standard Sharp Corners", hi: "सामान्य चौकोर कोने" }, priceModifier: 0, isDefault: true },
          { key: "rounded", label: { en: "Smooth Rounded Corners (+₹60)", hi: "स्मूथ गोल कोने (+₹60)" }, priceModifier: 60 },
        ],
      },
    ],
    specifications: {
      dimensions: "3.5 x 2.0 inches (89 x 51 mm)",
      paperType: "Imported High-Bulk Art Card",
      printingTech: "Digital / Offset Multi-color",
      minimumOrder: "100 Pcs",
    },
  },
  {
    id: "flex-banners",
    slug: "flex-banners",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "Heavy-Duty Flex Banners & Hoardings", hi: "मजबूत फ्लेक्स बैनर एवं होर्डिंग्स" },
    shortDesc: {
      en: "Weatherproof 320-440 GSM flex printing with metal eyelets for shop boards & promotions.",
      hi: "दुकान बोर्ड और प्रचार के लिए मेटल रिंग युक्त वेदरप्रूफ 320-440 जीएसएम फ्लेक्स प्रिंटिंग।",
    },
    description: {
      en: "Durable, high-visibility all-weather flex banners for shopfronts, coaching institutes, events, elections, and public announcements. Printed with UV-resistant vibrant inks and reinforced welded borders with brass eyelets.",
      hi: "दुकानों, कोचिंग संस्थानों, आयोजनों और विज्ञापनों के लिए टिकाऊ और स्पष्ट फ्लेक्स बैनर। मौसम प्रतिरोधी स्याही और मजबूत आईलेट्स के साथ तैयार किया जाता है।",
    },
    startingPrice: 240,
    baseQuantity: 1,
    unit: "Banner",
    imageUrl: "/images/gallery/flex-banner-sample.svg",
    galleryUrls: [
      "/images/gallery/flex-banner-sample.svg",
      "/images/gallery/promotional-poster-sample.svg",
    ],
    isFeatured: true,
    isPopular: true,
    turnaroundTime: { en: "4-8 Hours", hi: "4-8 घंटे" },
    tags: ["flex", "banner", "hoarding", "signboard", "फ्लेक्स", "बैनर", "होर्डिंग"],
    options: [
      {
        key: "size",
        name: { en: "Banner Size (Feet)", hi: "बैनर साइज (फीट)" },
        values: [
          { key: "4x2", label: { en: "4 x 2 Feet (8 sq.ft)", hi: "4 x 2 फीट (8 वर्ग फीट)" }, multiplier: 1.0, isDefault: true },
          { key: "6x3", label: { en: "6 x 3 Feet (18 sq.ft)", hi: "6 x 3 फीट (18 वर्ग फीट)" }, multiplier: 2.1 },
          { key: "8x4", label: { en: "8 x 4 Feet (32 sq.ft)", hi: "8 x 4 फीट (32 वर्ग फीट)" }, multiplier: 3.6 },
          { key: "10x5", label: { en: "10 x 5 Feet (50 sq.ft)", hi: "10 x 5 फीट (50 वर्ग फीट)" }, multiplier: 5.5 },
          { key: "12x6", label: { en: "12 x 6 Feet (72 sq.ft)", hi: "12 x 6 फीट (72 वर्ग फीट)" }, multiplier: 7.8 },
        ],
      },
      {
        key: "paper_gsm",
        name: { en: "Flex Media Grade", hi: "फ्लेक्स मीडिया ग्रेड" },
        values: [
          { key: "normal_flex", label: { en: "Normal Flex (320 GSM)", hi: "सामान्य फ्लेक्स (320 GSM)" }, multiplier: 1.0, isDefault: true },
          { key: "star_flex", label: { en: "Star Flex - High Gloss & Heavy (440 GSM)", hi: "स्टार फ्लेक्स - हाई ग्लॉस (440 GSM)" }, multiplier: 1.4 },
          { key: "blackout", label: { en: "Blackout / Backlit Flex", hi: "ब्लैकआउट / बैकलिट फ्लेक्स" }, multiplier: 1.7 },
        ],
      },
    ],
    specifications: {
      dimensions: "Customizable up to 100 feet",
      paperType: "Reinforced PVC Vinyl Fabric",
      printingTech: "Solvent & Eco-Solvent Large Format",
      minimumOrder: "1 Banner",
    },
  },
  {
    id: "pamphlets-flyers",
    slug: "pamphlets-flyers",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "Promotional Pamphlets & Handbills", hi: "प्रचार पम्पलेट एवं हैंडबिल" },
    shortDesc: {
      en: "Single & multi-color advertising flyers for coaching, shops, sales & distribution.",
      hi: "कोचिंग, दुकान के प्रचार और घर-घर वितरण के लिए रंगीन व सिंगल कलर पम्पलेट।",
    },
    description: {
      en: "Reach every household in your neighborhood with fast, economical printed pamphlets. Ideal for coaching admissions, festive shop sales, hospital openings, and local events. Available in standard 1/8, 1/4 (A4) and A5 sizes.",
      hi: "अपने स्थानीय क्षेत्र में प्रचार के लिए सबसे किफायती पम्पलेट प्रिंटिंग। कोचिंग प्रवेश, दुकान उद्घाटन और त्योहारों के विज्ञापनों के लिए उपयुक्त।",
    },
    startingPrice: 350,
    baseQuantity: 1000,
    unit: "Leaflets",
    imageUrl: "/images/gallery/promotional-poster-sample.svg",
    galleryUrls: [
      "/images/gallery/promotional-poster-sample.svg",
      "/images/gallery/trifold-brochure-sample.svg",
    ],
    isFeatured: true,
    turnaroundTime: { en: "24-48 Hours", hi: "24-48 घंटे" },
    tags: ["pamphlet", "flyer", "handbill", "पम्पलेट", "हैंडबिल", "पर्चा"],
    options: [
      {
        key: "quantity",
        name: { en: "Quantity", hi: "मात्रा (संख्या)" },
        values: [
          { key: "1000", label: { en: "1,000 Leaflets", hi: "1,000 पर्चे" }, multiplier: 1.0, isDefault: true },
          { key: "2000", label: { en: "2,000 Leaflets", hi: "2,000 पर्चे" }, multiplier: 1.8 },
          { key: "5000", label: { en: "5,000 Leaflets (Popular)", hi: "5,000 पर्चे" }, multiplier: 3.9 },
          { key: "10000", label: { en: "10,000 Leaflets (Best Rate)", hi: "10,000 पर्चे" }, multiplier: 7.2 },
        ],
      },
      {
        key: "size",
        name: { en: "Paper Size", hi: "कागज का आकार" },
        values: [
          { key: "a5", label: { en: "1/8 Demmy / A5 Size (approx 5.5 x 8.5 in)", hi: "1/8 डेमी / A5 साइज" }, multiplier: 1.0, isDefault: true },
          { key: "a4", label: { en: "1/4 Demmy / A4 Full Sheet (approx 8.5 x 11.5 in)", hi: "1/4 डेमी / A4 साइज" }, multiplier: 1.85 },
        ],
      },
      {
        key: "paper_gsm",
        name: { en: "Color & Paper Type", hi: "कलर एवं पेपर प्रकार" },
        values: [
          { key: "pink_yellow_mono", label: { en: "Single Color Ink on Colored Paper (60 GSM)", hi: "कलर पेपर पर सिंगल कलर इंक (60 GSM)" }, multiplier: 1.0, isDefault: true },
          { key: "white_multicolor", label: { en: "Full Multi-Color on Gloss Art Paper (80 GSM)", hi: "ग्लोस आर्ट पेपर पर फुल मल्टीकलर (80 GSM)" }, multiplier: 1.9 },
          { key: "premium_130gsm", label: { en: "Heavy Gloss Art Paper (130 GSM)", hi: "हैवी ग्लोस आर्ट पेपर (130 GSM)" }, multiplier: 2.6 },
        ],
      },
    ],
    specifications: {
      dimensions: "A5 (148 x 210 mm) or A4 (210 x 297 mm)",
      paperType: "Super Print 60 GSM / Gloss Art 80-130 GSM",
      printingTech: "Offset Sheetfed / Multi-cylinder",
      minimumOrder: "1000 Pcs",
    },
  },
  {
    id: "letterheads-envelopes",
    slug: "letterheads-envelopes",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "Executive Letterheads & Doctor Pads", hi: "ऑफिशियल लेटरहेड एवं डॉक्टर पर्चा पैड" },
    shortDesc: {
      en: "Crisp letterheads on 85-100 GSM Bond/Alabaster paper and customized envelopes.",
      hi: "85-100 जीएसएम बॉन्ड पेपर पर स्पष्ट लेटरहेड और कस्टम प्रिंटेड लिफाफे।",
    },
    description: {
      en: "Establish brand credibility with official company letterheads and doctor prescription writing pads. Printed on executive high-smoothness bond paper compatible with all laser and inkjet office printers.",
      hi: "कंपनी और क्लीनिक के लिए ऑफिशियल लेटरहेड व डॉक्टर प्रिस्क्रिप्शन पैड। लेजर और इंकजेट प्रिंटर में आसानी से उपयोग योग्य।",
    },
    startingPrice: 350,
    baseQuantity: 100,
    unit: "Sheets",
    imageUrl: "/images/gallery/letterhead-envelope-sample.svg",
    galleryUrls: ["/images/gallery/letterhead-envelope-sample.svg"],
    turnaroundTime: { en: "24-48 Hours", hi: "24-48 घंटे" },
    tags: ["letterhead", "prescription pad", "envelope", "लेटरहेड", "डॉक्टर पैड", "लिफाफा"],
    options: [
      {
        key: "quantity",
        name: { en: "Quantity", hi: "मात्रा" },
        values: [
          { key: "100", label: { en: "100 Sheets / 1 Pad", hi: "100 पेज / 1 पैड" }, multiplier: 1.0, isDefault: true },
          { key: "500", label: { en: "500 Sheets / 5 Pads", hi: "500 पेज / 5 पैड" }, multiplier: 3.4 },
          { key: "1000", label: { en: "1,000 Sheets / 10 Pads", hi: "1,000 पेज / 10 पैड" }, multiplier: 5.8 },
        ],
      },
      {
        key: "paper_gsm",
        name: { en: "Paper Type", hi: "पेपर प्रकार" },
        values: [
          { key: "85gsm_bond", label: { en: "85 GSM Standard Bond Paper", hi: "85 GSM स्टैंडर्ड बॉन्ड पेपर" }, multiplier: 1.0, isDefault: true },
          { key: "100gsm_executive", label: { en: "100 GSM Executive Alabaster Paper", hi: "100 GSM एग्जीक्यूटिव अलाबास्टर" }, multiplier: 1.35 },
          { key: "100gsm_texture", label: { en: "100 GSM Imported Textured Laid", hi: "100 GSM टेक्सचर्ड लेड पेपर" }, multiplier: 1.7 },
        ],
      },
    ],
    specifications: {
      dimensions: "A4 Size (210 x 297 mm)",
      paperType: "Executive Watermarked / Super Smooth Bond",
      printingTech: "Digital High-Def Offset",
      minimumOrder: "100 Sheets",
    },
  },
  {
    id: "bill-books",
    slug: "bill-books",
    categoryId: "business-solutions",
    categoryType: "business",
    name: { en: "Custom Carbonless Bill Books & Invoices", hi: "कस्टम कार्बनलेस बिल बुक व इनवॉइस" },
    shortDesc: {
      en: "Numbered duplicate & triplicate NCR carbonless bill books with sturdy binding.",
      hi: "नंबरिंग युक्त डुप्लिकेट व ट्रिप्लिकेट कार्बनलेस बिल बुक मजबूत बाइंडिंग के साथ।",
    },
    description: {
      en: "Keep your business accounting flawless with custom printed GST bill books, cash receipts, and order pads. Features automatic carbonless copying (no carbon paper needed), sequential serial numbering, and perforated tear-off sheets.",
      hi: "दुकान, फर्म और संस्थाओं के लिए क्रमबद्ध सीरियल नंबर वाली जीएसटी बिल बुक और रसीद पैड। बिना कार्बन पेपर के ऑटोमैटिक कॉपी।",
    },
    startingPrice: 380,
    baseQuantity: 5,
    unit: "Books",
    imageUrl: "/images/gallery/bill-book-sample.svg",
    galleryUrls: ["/images/gallery/bill-book-sample.svg"],
    isPopular: true,
    turnaroundTime: { en: "2-3 Days", hi: "2-3 दिन" },
    tags: ["bill book", "invoice", "receipt", "gst bill", "बिल बुक", "रसीद"],
    options: [
      {
        key: "quantity",
        name: { en: "Number of Books", hi: "पुस्तकों की संख्या" },
        values: [
          { key: "5", label: { en: "5 Bill Books (50 sets each)", hi: "5 बिल बुक (50 सेट प्रत्येक)" }, multiplier: 1.0, isDefault: true },
          { key: "10", label: { en: "10 Bill Books", hi: "10 बिल बुक" }, multiplier: 1.8 },
          { key: "20", label: { en: "20 Bill Books (Bulk)", hi: "20 बिल बुक" }, multiplier: 3.2 },
        ],
      },
      {
        key: "binding",
        name: { en: "Copy Type", hi: "कॉपी प्रकार" },
        values: [
          { key: "duplicate", label: { en: "Duplicate (1 Original + 1 Copy)", hi: "डुप्लिकेट (1 ओरिजिनल + 1 कॉपी)" }, multiplier: 1.0, isDefault: true },
          { key: "triplicate", label: { en: "Triplicate (1 Original + 2 Copies)", hi: "ट्रिप्लिकेट (1 ओरिजिनल + 2 कॉपी)" }, multiplier: 1.45 },
        ],
      },
    ],
    specifications: {
      dimensions: "1/8 Demmy or 1/4 Demmy (A4)",
      paperType: "55 GSM Imported NCR Carbonless Paper",
      printingTech: "Offset with numbering & perforation",
      minimumOrder: "5 Books",
    },
  },
  {
    id: "pvc-id-cards",
    slug: "pvc-id-cards",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "PVC Plastic Smart ID Cards", hi: "पीवीसी प्लास्टिक स्मार्ट आईडी कार्ड" },
    shortDesc: {
      en: "Waterproof ATM-grade PVC ID cards with lanyards & badge holders for schools & staff.",
      hi: "स्कूल के छात्रों, शिक्षकों व स्टाफ के लिए वॉटरप्रूफ एटीएम-ग्रेड पीवीसी आईडी कार्ड।",
    },
    description: {
      en: "Long-lasting, waterproof, scratch-resistant CR80 standard PVC identity cards for school students, teachers, office employees, and event volunteers. Includes printed satin lanyard ribbons and transparent card cases.",
      hi: "स्कूल, कॉलेज, कोचिंग और संस्थानों के लिए वॉटरप्रूफ प्लास्टिक आईडी कार्ड। प्रिंटेड डोरी (Lanyard) और होल्डर कवर के साथ।",
    },
    startingPrice: 40,
    baseQuantity: 1,
    unit: "Card",
    imageUrl: "/images/gallery/pvc-id-card-sample.svg",
    galleryUrls: ["/images/gallery/pvc-id-card-sample.svg"],
    isFeatured: true,
    isPopular: true,
    turnaroundTime: { en: "Same Day / 24 Hours", hi: "उसी दिन / 24 घंटे" },
    tags: ["id card", "pvc card", "smart card", "student id", "आईडी कार्ड", "पहचान पत्र"],
    options: [
      {
        key: "quantity",
        name: { en: "Quantity", hi: "संख्या" },
        values: [
          { key: "1", label: { en: "1 Single ID Card", hi: "1 आईडी कार्ड" }, multiplier: 1.0, isDefault: true },
          { key: "10", label: { en: "10 Cards (Batch)", hi: "10 कार्ड" }, multiplier: 8.5 },
          { key: "50", label: { en: "50 Cards (School Class)", hi: "50 कार्ड" }, multiplier: 38.0 },
          { key: "100", label: { en: "100+ Cards (Institutional Bulk)", hi: "100+ कार्ड" }, multiplier: 70.0 },
        ],
      },
      {
        key: "custom",
        name: { en: "Accessories Included", hi: "सहायक सामग्री" },
        values: [
          { key: "card_only", label: { en: "Card Only", hi: "केवल कार्ड" }, multiplier: 1.0, isDefault: true },
          { key: "card_lanyard_holder", label: { en: "Card + Printed Lanyard + Clear Holder (+₹25/pc)", hi: "कार्ड + प्रिंटेड डोरी + होल्डर (+₹25)" }, priceModifier: 25 },
        ],
      },
    ],
    specifications: {
      dimensions: "CR80 Standard (85.6 x 53.98 mm, 30 mil thickness)",
      paperType: "Fused Solid PVC Plastic",
      printingTech: "Retransfer High Definition Thermal Dye-Sublimation",
      minimumOrder: "1 Pc",
    },
  },
  {
    id: "wedding-invitations",
    slug: "wedding-invitations",
    categoryId: "wedding-events",
    categoryType: "wedding",
    name: { en: "Royal Wedding & Ceremony Invitation Cards", hi: "शाही शादी एवं शुभ विवाह निमंत्रण पत्र" },
    shortDesc: {
      en: "Rich embossed, gold-foil, metallic & velvet designer wedding cards with printed inserts.",
      hi: "गोल्ड फॉयल, एम्बॉसिंग, वेलवेट और पारंपरिक मांगलिक डिजाइनों में आकर्षक शादी कार्ड।",
    },
    description: {
      en: "Celebrate your family’s most sacred and joyous moments with Palak Enterprises’ exquisite wedding card collections. We offer traditional Sanskrit shlokas, custom Hindi/English calligraphy, Tilak, Mundan, and reception invitation sets with matching envelopes.",
      hi: "शुभ विवाह, तिलक, मुंडन और मांगलिक आयोजनों के लिए सुंदर हिंदी/संस्कृत श्लोक, सुनहरे अक्षरों और आकर्षक आवरण युक्त शादी कार्ड।",
    },
    startingPrice: 1200,
    baseQuantity: 100,
    unit: "Cards",
    imageUrl: "/images/gallery/wedding-invitation-sample.svg",
    galleryUrls: [
      "/images/gallery/wedding-invitation-sample.svg",
      "/images/gallery/birthday-invitation-sample.svg",
    ],
    isFeatured: true,
    isPopular: true,
    turnaroundTime: { en: "2-4 Days", hi: "2-4 दिन" },
    tags: ["wedding card", "invitation", "shaadi card", "tilak", "शादी कार्ड", "निमंत्रण पत्र", "तिलक"],
    options: [
      {
        key: "quantity",
        name: { en: "Quantity of Cards", hi: "कार्ड संख्या" },
        values: [
          { key: "100", label: { en: "100 Cards Set", hi: "100 कार्ड सेट" }, multiplier: 1.0, isDefault: true },
          { key: "200", label: { en: "200 Cards Set", hi: "200 कार्ड सेट" }, multiplier: 1.85 },
          { key: "300", label: { en: "300 Cards Set", hi: "300 कार्ड सेट" }, multiplier: 2.65 },
          { key: "500", label: { en: "500 Cards Set (Popular)", hi: "500 कार्ड सेट" }, multiplier: 4.2 },
        ],
      },
      {
        key: "paper_gsm",
        name: { en: "Design & Material Tier", hi: "कार्ड क्वालिटी व श्रेणी" },
        values: [
          { key: "classic_metallic", label: { en: "Classic Metallic & Gold Screen Print", hi: "क्लासिक मेटैलिक व गोल्ड स्क्रीन प्रिंट" }, multiplier: 1.0, isDefault: true },
          { key: "royal_laser_cut", label: { en: "Royal Laser Cut + Golden Leaf Foil", hi: "रॉयल लेज़र कट + गोल्डन फॉयल" }, multiplier: 1.5 },
          { key: "luxury_velvet_box", label: { en: "Luxury Velvet Pouch / Hardboard Box Card", hi: "लग्जरी वेलवेट / हार्डबोर्ड बॉक्स कार्ड" }, multiplier: 2.2 },
        ],
      },
    ],
    specifications: {
      dimensions: "Various sizes from 5x7 in to 8x10 in",
      paperType: "Metallic Handmade / Board / Velvet",
      printingTech: "Gold Foil Stamping & Screen/Offset Print",
      minimumOrder: "100 Cards",
    },
  },
  {
    id: "photo-prints",
    slug: "photo-prints",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "Studio HD Glossy Photo Prints", hi: "स्टूडियो एचडी ग्लोसी फोटो प्रिंट" },
    shortDesc: {
      en: "Lab-quality instant prints from 4x6 inch to 12x18 inch on 260 GSM Fuji/Kodak paper.",
      hi: "4x6 इंच से 12x18 इंच तक 260 जीएसएम लैब क्वालिटी एचडी फोटो प्रिंटिंग।",
    },
    description: {
      en: "Preserve your memorable family moments, portrait shoots, and ceremonies in vibrant, non-fading HD colors. Printed on original thick glossy lab paper with waterproofing.",
      hi: "पारिवारिक फोटो, यादगार पलों और समारोहों की सुंदर, चमकदार और न मिटने वाली फोटो प्रिंटिंग।",
    },
    startingPrice: 15,
    baseQuantity: 1,
    unit: "Photo",
    imageUrl: "/images/gallery/glossy-photo-prints-sample.svg",
    galleryUrls: [
      "/images/gallery/glossy-photo-prints-sample.svg",
      "/images/gallery/passport-photo-sheet-sample.svg",
    ],
    turnaroundTime: { en: "15 Minutes", hi: "15 मिनट" },
    tags: ["photo print", "glossy photo", "lab print", "फोटो प्रिंट", "ग्लोसी फोटो"],
    options: [
      {
        key: "size",
        name: { en: "Photo Size", hi: "फोटो साइज़" },
        values: [
          { key: "4x6", label: { en: "4 x 6 inches (Standard Postcard)", hi: "4 x 6 इंच (स्टैंडर्ड)" }, multiplier: 1.0, isDefault: true },
          { key: "5x7", label: { en: "5 x 7 inches (Medium)", hi: "5 x 7 इंच (मीडियम)" }, multiplier: 2.0 },
          { key: "8x12", label: { en: "8 x 12 inches (A4 Size)", hi: "8 x 12 इंच (A4 साइज)" }, multiplier: 4.0 },
          { key: "12x18", label: { en: "12 x 18 inches (Jumbo Poster)", hi: "12 x 18 इंच (जम्बो)" }, multiplier: 9.0 },
        ],
      },
    ],
    specifications: {
      dimensions: "4x6 to 12x18 inches",
      paperType: "260 GSM Resin Coated True Glossy Photo Paper",
      printingTech: "6-Color Micro-Piezo Dye/Pigment HD Print",
      minimumOrder: "1 Photo",
    },
  },
  {
    id: "document-lamination",
    slug: "document-lamination",
    categoryId: "printing-products",
    categoryType: "printing",
    name: { en: "Heavy-Duty Heat Document Lamination", hi: "मजबूत हीट डॉक्यूमेंट लैमिनेशन" },
    shortDesc: {
      en: "Crystal-clear waterproof protection for marksheets, land papers & certificates.",
      hi: "मार्कशीट, जमीन के कागजात और प्रमाणपत्रों के लिए वॉटरप्रूफ मजबूत लैमिनेशन।",
    },
    description: {
      en: "Protect your lifelong certificates, birth records, land deeds, and marksheets from moisture, termites, dust, and tears with 125-250 micron heavy heat lamination pouches.",
      hi: "अपने जरूरी कागजात, डिग्री, जमीन के दस्तावेज और प्रमाणपत्रों को नमी, कीड़ों और फटने से बचाने के लिए टिकाऊ लैमिनेशन।",
    },
    startingPrice: 20,
    baseQuantity: 1,
    unit: "Sheet",
    imageUrl: "/images/gallery/laminated-document-sample.svg",
    galleryUrls: ["/images/gallery/laminated-document-sample.svg"],
    turnaroundTime: { en: "5 Minutes", hi: "5 मिनट" },
    tags: ["lamination", "pouch", "protect", "लैमिनेशन", "सुरक्षा"],
    options: [
      {
        key: "size",
        name: { en: "Document Size", hi: "दस्तावेज का साइज़" },
        values: [
          { key: "id_size", label: { en: "ID / Aadhaar Size", hi: "आईडी / आधार साइज" }, multiplier: 1.0, isDefault: true },
          { key: "a4_size", label: { en: "A4 Size (Marksheet / Certificate)", hi: "A4 साइज (मार्कशीट / प्रमाणपत्र)" }, multiplier: 1.5 },
          { key: "legal_size", label: { en: "Legal / Fullscap (Land Deeds)", hi: "लीगल / जमीन के कागजात" }, multiplier: 2.0 },
          { key: "a3_size", label: { en: "A3 Large Size (Charts / Maps)", hi: "A3 बड़ा साइज (नक्शा)" }, multiplier: 3.5 },
        ],
      },
    ],
    specifications: {
      dimensions: "A4, Legal, A3, ID",
      paperType: "125 to 250 Micron Thermal PET Film",
      printingTech: "Heated Roller Thermal Seal",
      minimumOrder: "1 Document",
    },
  },
];

export const DIGITAL_SERVICES: LocalService[] = [
  {
    id: "pan-card-services",
    slug: "pan",
    categoryId: "digital-services",
    name: { en: "New PAN Card & Correction Assistance", hi: "नया पैन कार्ड एवं सुधार सहायता" },
    shortDesc: {
      en: "Apply for fresh NSDL/UTI PAN card, photo/signature update, address or name correction.",
      hi: "नया पैन कार्ड बनवाने, नाम/फोटो/हस्ताक्षर सुधारने और खोया हुआ पैन दोबारा प्राप्त करने में मदद।",
    },
    description: {
      en: "Complete assisted workflow for applying for a new Indian Permanent Account Number (PAN Card) or correcting details on an existing PAN. We handle biometric/OTP verification, document upload, and postal tracking.",
      hi: "नया पैन कार्ड बनवाने अथवा पुराने पैन में जन्मतिथि, नाम, पिता का नाम और फोटो सुधारने की पूरी ऑनलाइन सहायता। ई-पैन 3 दिनों में और फिजिकल कार्ड डाक द्वारा घर पहुंचता है।",
    },
    estimatedFee: 150,
    processingTime: { en: "3-5 Days (e-PAN), 10-15 Days (Physical Card)", hi: "3-5 दिन (ई-पैन), 10-15 दिन (डाक द्वारा कार्ड)" },
    requiredDocuments: [
      { en: "Aadhaar Card (Linked with active Mobile Number)", hi: "आधार कार्ड (मोबाइल नंबर लिंक होना आवश्यक)" },
      { en: "Passport Size Color Photograph (2 copies)", hi: "2 पासपोर्ट साइज फोटो" },
      { en: "Signature on white paper / Biometric verification", hi: "सफेद कागज पर हस्ताक्षर" },
      { en: "Existing PAN Copy (Only for correction/update)", hi: "पुराने पैन कार्ड की कॉपी (केवल सुधार के लिए)" },
    ],
    whoNeedsIt: [
      { en: "Anyone opening a bank account, filing IT returns, or buying property.", hi: "बैंक खाता खुलवाने, आईटीआर भरने या जमीन खरीदने वाले सभी नागरिक।" },
      { en: "Individuals needing correction in name, father's name or date of birth.", hi: "जिनके पैन कार्ड में नाम, जन्मतिथि या फोटो गलत है।" },
    ],
    importantInstructions: [
      { en: "Ensure your Aadhaar mobile number is active to receive the UIDAI OTP.", hi: "सुनिश्चित करें कि आपके आधार में जुड़ा मोबाइल नंबर चालू है ताकि ओटीपी मिल सके।" },
      { en: "Palak Enterprises provides application assistance. Official issuance is managed by Income Tax Department / NSDL.", hi: "पालक इंटरप्राइजेज आवेदन सहायता केंद्र है। आधिकारिक निर्गमन आयकर विभाग द्वारा किया जाता है।" },
    ],
    officialPortalName: "Protean NSDL / UTIITSL Portal",
    disclaimer: {
      en: "Assisted service center. Final PAN issuance governed by Income Tax Department of India.",
      hi: "यह आवेदन सहायता केंद्र है। पैन कार्ड जारी करने का अंतिम अधिकार भारत सरकार के आयकर विभाग के पास है।",
    },
    iconName: "CreditCard",
    isFeatured: true,
    isPopular: true,
    tags: ["pan card", "nsdl", "uti", "pan", "पैन कार्ड", "नया पैन"],
  },
  {
    id: "rtps-certificates",
    slug: "rtps-certificates",
    categoryId: "digital-services",
    name: { en: "Caste, Income & Residence (RTPS Bihar)", hi: "जाति, आय एवं निवास प्रमाणपत्र (RTPS बिहार)" },
    shortDesc: {
      en: "Assisted online application on ServicePlus Bihar RTPS portal with SMS tracking.",
      hi: "बिहार आरटीपीएस सर्विसप्लस पोर्टल पर जाति, आय और निवास प्रमाणपत्र का ऑनलाइन आवेदन।",
    },
    description: {
      en: "Get your official Bihar Government RTPS certificates prepared smoothly without hassle. We submit your application, track Circle Officer (CO) / Revenue Officer (RO) approvals, and print digitally signed, QR-verified certificates.",
      hi: "बिहार सरकार के आरटीपीएस पोर्टल पर अंचल स्तर (RO/CO) और अनुमंडल स्तर के जाति, आय, निवास और नॉन-क्रीमी लेयर (NCL) प्रमाणपत्रों के आवेदन में पूरी सहायता।",
    },
    estimatedFee: 60,
    processingTime: { en: "10-14 Working Days (as per Govt Service Guarantee)", hi: "10-14 कार्य दिवस (बिहार लोक सेवा अधिकार)" },
    requiredDocuments: [
      { en: "Aadhaar Card", hi: "आधार कार्ड" },
      { en: "Passport Size Photograph", hi: "पासपोर्ट साइज फोटो" },
      { en: "Self-declaration / Previous family caste proof (Khatiyan/Land papers if applicable)", hi: "स्व-घोषणा पत्र / पूर्व खतियान या जमीन रसीद" },
      { en: "Active Mobile Number for receiving Application ID SMS", hi: "सक्रिय मोबाइल नंबर" },
    ],
    whoNeedsIt: [
      { en: "Students applying for school, college, exams, or scholarships.", hi: "छात्र-छात्राएं जो स्कूल, कॉलेज प्रवेश या छात्रवृत्ति के लिए आवेदन कर रहे हैं।" },
      { en: "Candidates appearing for Bihar SSC, Police, Teacher & Railway jobs.", hi: "सरकारी नौकरी और प्रतियोगी परीक्षाओं में आरक्षण लाभ हेतु।" },
    ],
    importantInstructions: [
      { en: "Keep the generated Application Reference Number safe for downloading your certificate.", hi: "आवेदन संख्या को संभाल कर रखें, इसी से प्रमाणपत्र डाउनलोड होगा।" },
    ],
    officialPortalName: "ServicePlus RTPS Bihar (serviceonline.bihar.gov.in)",
    disclaimer: {
      en: "ServicePlus RTPS assistance center. Approval is solely determined by Revenue Authorities.",
      hi: "यह आरटीपीएस सहायता केंद्र है। प्रमाणपत्र निर्गमन का निर्णय संबंधित अंचल अधिकारी के पास है।",
    },
    iconName: "FileCheck",
    isFeatured: true,
    isPopular: true,
    tags: ["rtps", "caste", "income", "residence", "jati", "aay", "niwas", "जाति", "आय", "निवास"],
  },
  {
    id: "ayushman-card",
    slug: "ayushman-card",
    categoryId: "digital-services",
    name: { en: "Ayushman Bharat Golden Health Card", hi: "आयुष्मान भारत गोल्डन हेल्थ कार्ड" },
    shortDesc: {
      en: "Check beneficiary list eligibility, complete e-KYC and download PVC plastic card.",
      hi: "पात्रता सूची में नाम जांच, ई-केवाईसी और ₹5 लाख तक मुफ्त इलाज का आयुष्मान कार्ड डाउनलोड।",
    },
    description: {
      en: "Assistance with PMJAY Ayushman Bharat card generation for eligible families under NFSA Ration Card and SECC database. We verify beneficiary records, capture facial/biometric e-KYC, and print the official PVC health card.",
      hi: "राशन कार्ड धारकों के लिए प्रति वर्ष ₹5 लाख तक के मुफ्त इलाज वाले आयुष्मान कार्ड की ई-केवाईसी और प्लास्टिक कार्ड प्रिंटिंग में सहायता।",
    },
    estimatedFee: 50,
    processingTime: { en: "Instant to 24 Hours", hi: "तुरंत से 24 घंटे" },
    requiredDocuments: [
      { en: "Ration Card (Name must be listed)", hi: "राशन कार्ड" },
      { en: "Aadhaar Card of all family members to be registered", hi: "परिवार के सभी सदस्यों का आधार कार्ड" },
      { en: "Aadhaar Linked Mobile for OTP / Biometric Fingerprint", hi: "ओटीपी हेतु आधार से जुड़ा मोबाइल" },
    ],
    whoNeedsIt: [
      { en: "Families eligible for cashless hospitalization up to ₹5 Lakh/year.", hi: "मुफ्त अस्पताल चिकित्सा सुरक्षा प्राप्त करने वाले सभी पात्र परिवार।" },
    ],
    importantInstructions: [
      { en: "All family members listed in ration card must complete individual Aadhaar e-KYC.", hi: "राशन कार्ड में दर्ज सभी सदस्यों का अलग-अलग ई-केवाईसी आवश्यक है।" },
    ],
    officialPortalName: "National Health Authority (beneficiary.nha.gov.in)",
    disclaimer: {
      en: "Eligibility is strictly determined by Government PMJAY & NFSA database.",
      hi: "पात्रता का निर्धारण केंद्र एवं राज्य सरकार की आधिकारिक डेटाबेस द्वारा होता है।",
    },
    iconName: "HeartPulse",
    isFeatured: true,
    tags: ["ayushman", "pmjay", "health card", "golden card", "आयुष्मान", "हेल्थ कार्ड"],
  },
  {
    id: "govt-exam-forms",
    slug: "govt-exam-forms",
    categoryId: "digital-services",
    name: { en: "Govt & Competitive Exam Online Form Filling", hi: "सरकारी नौकरी एवं प्रतियोगी परीक्षा फॉर्म" },
    shortDesc: {
      en: "Error-free form filling for SSC, Railway, BPSC, Bihar Police, Defense & Banking.",
      hi: "एसएससी, रेलवे, बीपीएससी, बिहार पुलिस, शिक्षक और सेना भर्ती फॉर्म बिना किसी गलती के भरवाएं।",
    },
    description: {
      en: "Avoid application rejections due to wrong photo dimensions, blurry signatures, or qualification mismatches. Our trained operators fill out forms meticulously with proper document resizing, fee payment confirmation, and final printed acknowledgment.",
      hi: "फोटो-साइन के सही साइज, सटीक डॉक्यूमेंट अपलोड और सुरक्षित फीस भुगतान के साथ सभी सरकारी नौकरियों के ऑनलाइन आवेदन की सुविधा।",
    },
    estimatedFee: 100,
    processingTime: { en: "Instant (During Office Hours)", hi: "तुरंत (कार्यालय समय में)" },
    requiredDocuments: [
      { en: "10th, 12th & Graduation Marksheets / Certificates", hi: "10वीं, 12वीं एवं स्नातक के अंकपत्र" },
      { en: "Aadhaar Card", hi: "आधार कार्ड" },
      { en: "Recent Color Photograph & Signature on white sheet", hi: "हाल की रंगीन फोटो और हस्ताक्षर" },
      { en: "Caste / EWS / Domicile Certificate (if claiming reservation)", hi: "जाति / ईडब्ल्यूएस / निवास प्रमाणपत्र" },
    ],
    whoNeedsIt: [
      { en: "Aspirants targeting SSC GD/CGL, Railway, BPSC, Teaching, Defense & Police jobs.", hi: "प्रतियोगी परीक्षाओं की तैयारी कर रहे छात्र-छात्राएं।" },
    ],
    importantInstructions: [
      { en: "Please verify your personal details in the preview page before final submission.", hi: "अंतिम सबमिट से पहले अपनी सभी जानकारी का भली-भांति मिलान अवश्य करें।" },
    ],
    officialPortalName: "SSC / BPSC / BSSC / Railway Recruitment Portals",
    disclaimer: {
      en: "Form filling assistance center. Exam schedules and selection are solely governed by recruitment commissions.",
      hi: "यह केवल ऑनलाइन आवेदन सहायता केंद्र है। परीक्षा का संचालन संबंधित भर्ती आयोग द्वारा किया जाता है।",
    },
    iconName: "GraduationCap",
    isFeatured: true,
    isPopular: true,
    tags: ["sarkari exam", "ssc", "railway", "police", "bpsc", "नौकरी फॉर्म", "ऑनलाइन फॉर्म"],
  },
  {
    id: "pension-schemes",
    slug: "pension-schemes",
    categoryId: "digital-services",
    name: { en: "Social Security Pension Schemes (Old Age, Widow, Disability)", hi: "सामाजिक सुरक्षा पेंशन (वृद्धा, विधवा, दिव्यांग)" },
    shortDesc: {
      en: "Bihar Mukhyamantri Vridhjan Pension, Indira Gandhi Pension & annual Life e-KYC.",
      hi: "मुख्यमंत्री वृद्धजन पेंशन, विधवा व दिव्यांग पेंशन आवेदन और वार्षिक जीवन प्रमाणीकरण (e-KYC)।",
    },
    description: {
      en: "Dedicated support for senior citizens and differently-abled individuals in Chakia to apply for monthly pensions and complete their mandatory annual biometric e-KYC (e-Labharthi) so payments continue without stoppage.",
      hi: "वरिष्ठ नागरिकों और दिव्यांगजनों के लिए मासिक पेंशन योजना का आवेदन एवं हर वर्ष आवश्यक ई-लाभार्थी बायोमेट्रिक जीवन प्रमाणीकरण।",
    },
    estimatedFee: 50,
    processingTime: { en: "3-4 Weeks for sanction / Instant for annual e-KYC", hi: "स्वीकृति हेतु 3-4 सप्ताह / e-KYC तुरंत" },
    requiredDocuments: [
      { en: "Aadhaar Card (Applicant must be 60+ for Vridhjan pension)", hi: "आधार कार्ड (वृद्धावस्था हेतु उम्र 60 वर्ष से अधिक)" },
      { en: "Bank Passbook with active IFSC & Account Number", hi: "बैंक पासबुक की साफ़ कॉपी" },
      { en: "Voter ID Card", hi: "मतदाता पहचान पत्र (वोटर कार्ड)" },
      { en: "Disability Certificate (Only for Divyang pension)", hi: "दिव्यांगता प्रमाणपत्र (केवल दिव्यांग पेंशन हेतु)" },
    ],
    whoNeedsIt: [
      { en: "Senior citizens aged 60+, widows, and persons with disabilities.", hi: "60 वर्ष से अधिक उम्र के बुजुर्ग, विधवा माताएं और दिव्यांगजन।" },
    ],
    importantInstructions: [
      { en: "Senior citizens can visit our ground-floor office or call for doorstep assistance.", hi: "बुजुर्ग ग्राहक हमारी दुकान पर आसानी से आ सकते हैं या सहायता हेतु संपर्क कर सकते हैं।" },
    ],
    officialPortalName: "e-Labharthi Bihar (elabharthi.bihar.gov.in)",
    disclaimer: {
      en: "Assistance center. Sanctioning authority is Social Welfare Department, Govt. of Bihar.",
      hi: "पेंशन स्वीकृति का अधिकार समाज कल्याण विभाग, बिहार सरकार के अधीन है।",
    },
    iconName: "Users",
    isFeatured: true,
    tags: ["pension", "vridha pension", "elabharthi", "पेंशन", "वृद्धा पेंशन", "ई-लाभार्थी"],
  },
  {
    id: "farmer-services",
    slug: "farmer-services",
    categoryId: "digital-services",
    name: { en: "PM Kisan Samman Nidhi & Farmer Registration (DBT)", hi: "पीएम किसान सम्मान निधि एवं किसान पंजीकरण" },
    shortDesc: {
      en: "DBT Bihar Agriculture registration, PM-Kisan e-KYC, land seeding & installment status.",
      hi: "कृषि विभाग बिहार में किसान पंजीकरण, पीएम किसान ई-केवाईसी, लैंड सीडिंग व किस्त जांच।",
    },
    description: {
      en: "Comprehensive digital assistance for local farmers: apply for PM Kisan ₹6000 annual assistance, resolve NPCI bank account mapping issues, update land ownership records, and complete mandatory biometric e-KYC.",
      hi: "किसानों के लिए डीबीटी एग्रीकल्चर रजिस्ट्रेशन, पीएम किसान की रुकी हुई किस्त चालू कराने, बैंक आधार लिंकिंग और जमीन रसीद अपलोड की सुविधा।",
    },
    estimatedFee: 40,
    processingTime: { en: "Instant e-KYC / Status Check", hi: "तुरंत ई-केवाईसी एवं स्टेटस जांच" },
    requiredDocuments: [
      { en: "Aadhaar Card", hi: "आधार कार्ड" },
      { en: "Land Lagan Receipt (LPC / Khatiyan / Jamabandi)", hi: "जमीन की अद्यतन रसीद / एलपीसी" },
      { en: "Aadhaar-seeded Bank Account Passbook", hi: "आधार से जुड़ा बैंक खाता" },
      { en: "Mobile number for OTP", hi: "मोबाइल नंबर" },
    ],
    whoNeedsIt: [
      { en: "Farmers seeking agricultural subsidies, seeds, diesel subsidy, or PM Kisan installments.", hi: "कृषि अनुदान और पीएम किसान का लाभ लेने वाले किसान भाई।" },
    ],
    importantInstructions: [
      { en: "Make sure your bank account is NPCI / DBT enabled to receive government funds directly.", hi: "सुनिश्चित करें कि आपके बैंक खाते में एनपीसीआई डीबीटी सक्रिय है।" },
    ],
    officialPortalName: "DBT Agriculture Bihar / PM Kisan Portal",
    disclaimer: {
      en: "Assistance center. Subsidies directly credited by Agriculture Department to farmer accounts.",
      hi: "सभी अनुदान सीधे कृषि विभाग द्वारा किसान के खाते में भेजे जाते हैं।",
    },
    iconName: "Tractor",
    isFeatured: true,
    tags: ["pm kisan", "farmer", "dbt biya", "kisan registration", "किसान", "पीएम किसान", "डीबीटी"],
  },
];
