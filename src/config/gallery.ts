export interface GalleryItem {
  id: string;
  category: "printing" | "digital-printing" | "online-services" | "invitations";
  title: {
    en: string;
    hi: string;
  };
  subtitle: {
    en: string;
    hi: string;
  };
  badge: {
    en: string;
    hi: string;
  };
  imageUrl: string;
  imageAlt: {
    en: string;
    hi: string;
  };
  source: string;
  colorTheme: string;
  relatedServiceIds?: string[];
  featuredOnHome?: boolean;
}

export const galleryCategories = [
  { id: "all", en: "All Samples", hi: "सभी नमूने" },
  { id: "printing", en: "Printing Services", hi: "प्रिंटिंग सेवाएँ" },
  { id: "digital-printing", en: "Digital Printing & Photos", hi: "डिजिटल व फोटो प्रिंटिंग" },
  { id: "online-services", en: "Online & Digital Assistance", hi: "ऑनलाइन व डिजिटल सेवाएँ" },
  { id: "invitations", en: "Cards & Invitations", hi: "कार्ड व निमंत्रण पत्र" },
];

export const galleryData: GalleryItem[] = [
  {
    id: "g1",
    category: "printing",
    title: {
      en: "Premium Matte Visiting Card",
      hi: "प्रीमियम मैट विजिटिंग कार्ड",
    },
    subtitle: {
      en: "Velvet touch with spot UV metallic gold branding for local enterprises.",
      hi: "वेलवेट टच और स्पॉट यूवी गोल्ड ब्रांडिंग के साथ आकर्षक कार्ड।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/visiting-cards-sample.svg",
    imageAlt: {
      en: "Printed stack of premium matte visiting cards with gold spot UV detail",
      hi: "प्रीमियम मैट व स्पॉट यूवी प्रिंटेड विजिटिंग कार्ड स्टैक का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-blue-900 to-indigo-950",
    relatedServiceIds: ["visiting-cards"],
    featuredOnHome: true,
  },
  {
    id: "g2",
    category: "invitations",
    title: {
      en: "Traditional Wedding Invitation Card",
      hi: "पारंपरिक विवाह निमंत्रण पत्र",
    },
    subtitle: {
      en: "Elegant red & gold foil embossed ceremonial wedding invitation.",
      hi: "सुंदर लाल व सुनहरे फॉयल डिज़ाइन वाला मांगलिक विवाह कार्ड।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/wedding-invitation-sample.svg",
    imageAlt: {
      en: "Printed traditional Indian wedding invitation card with envelope and gold foil embossing",
      hi: "गोल्ड फॉयल और लिफाफे के साथ पारंपरिक भारतीय विवाह कार्ड का प्रिंटेड नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-red-800 to-rose-950",
    relatedServiceIds: ["invitation-cards"],
    featuredOnHome: true,
  },
  {
    id: "g3",
    category: "printing",
    title: {
      en: "Outdoor Star Flex Shop Banner",
      hi: "दुकान का आउटडोर स्टार फ्लेक्स बैनर",
    },
    subtitle: {
      en: "High-resolution weather-resistant outdoor frontlit flex banner for business promotion.",
      hi: "उच्च रेजोल्यूशन और मौसम से सुरक्षित दुकान का प्रचार बैनर।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/flex-banner-sample.svg",
    imageAlt: {
      en: "Printed heavy-duty outdoor Star Flex shop promotional banner with brass eyelets",
      hi: "दुकान के लिए स्टार फ्लेक्स आउटडोर प्रिंटेड बैनर का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-amber-600 to-orange-900",
    relatedServiceIds: ["banners-posters"],
    featuredOnHome: true,
  },
  {
    id: "g4",
    category: "digital-printing",
    title: {
      en: "School PVC Plastic Student ID Card",
      hi: "स्कूल पीवीसी प्लास्टिक स्टूडेंट कार्ड",
    },
    subtitle: {
      en: "Durable barcode integrated student & staff identification card with lanyard.",
      hi: "बारकोड और डोरी के साथ मजबूत प्लास्टिक छात्र पहचान पत्र।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/pvc-id-card-sample.svg",
    imageAlt: {
      en: "Printed PVC plastic student identity card with barcode and lanyard hole",
      hi: "बारकोड के साथ पीवीसी प्लास्टिक छात्र पहचान पत्र का प्रिंटेड नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-emerald-700 to-teal-950",
    relatedServiceIds: ["id-card-print"],
    featuredOnHome: true,
  },
  {
    id: "g5",
    category: "printing",
    title: {
      en: "Numbered Duplicate Receipt & Bill Book",
      hi: "नंबरिंग वाली रसीद व बिल बुक",
    },
    subtitle: {
      en: "Custom carbonless duplicate copy book for commercial accounting and retail shops.",
      hi: "व्यापारिक हिसाब-किताब के लिए कस्टम डुप्लीकेट बिल बुक।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/bill-book-sample.svg",
    imageAlt: {
      en: "Printed duplicate bill book with red numbering and carbonless copy sheet",
      hi: "नंबरिंग वाली कार्बनलेस डुप्लीकेट बिल बुक का प्रिंटेड नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-sky-800 to-slate-900",
    relatedServiceIds: ["bill-books"],
    featuredOnHome: true,
  },
  {
    id: "g6",
    category: "digital-printing",
    title: {
      en: "Studio Quality Passport Photo Sheet",
      hi: "स्टूडियो क्वालिटी पासपोर्ट फोटो शीट",
    },
    subtitle: {
      en: "Crisp 5-minute instant photo print sheet with clean white or blue background.",
      hi: "साफ़ सफेद या नीले बैकग्राउंड के साथ 5 मिनट फोटो प्रिंट शीट।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/passport-photo-sheet-sample.svg",
    imageAlt: {
      en: "Printed 4x6 passport photo sheet containing grid of passport-size photographs",
      hi: "पासपोर्ट साइज़ फोटो ग्रिड प्रिंटेड फोटो शीट का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-blue-700 to-blue-900",
    relatedServiceIds: ["passport-photo"],
    featuredOnHome: true,
  },
  {
    id: "g7",
    category: "printing",
    title: {
      en: "Corporate Letterhead & Printed Envelope",
      hi: "कॉर्पोरेट लेटरहेड व लिफाफा सेट",
    },
    subtitle: {
      en: "Professional executive letterheads on bond paper with matching printed envelopes.",
      hi: "बॉन्ड पेपर पर एग्जीक्यूटिव लेटरहेड और कंपनी के प्रिंटेड लिफाफे।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/letterhead-envelope-sample.svg",
    imageAlt: {
      en: "Printed corporate letterhead paper sheet with matching printed DL envelope",
      hi: "कंपनी के लेटरहेड पेपर और प्रिंटेड लिफाफे का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-slate-800 to-indigo-950",
    relatedServiceIds: ["letterhead-envelope", "letter-pad"],
    featuredOnHome: true,
  },
  {
    id: "g8",
    category: "printing",
    title: {
      en: "Tri-fold Color Pamphlet & Flyer",
      hi: "त्रि-फोल्ड कलर पम्पलेट व ब्रॉशर",
    },
    subtitle: {
      en: "Vibrant promotional brochures for coaching centers, shops, clinics, and events.",
      hi: "कोचिंग सेंटर, दुकानों और क्लिनिक के प्रचार के लिए रंगीन ब्रॉशर।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/trifold-brochure-sample.svg",
    imageAlt: {
      en: "Printed open tri-fold promotional brochure showing 3 inside panels",
      hi: "3-पेज वाले प्रिंटेड त्रि-फोल्ड प्रचार ब्रॉशर का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-purple-800 to-indigo-900",
    relatedServiceIds: ["pamphlets"],
    featuredOnHome: true,
  },
  {
    id: "g9",
    category: "digital-printing",
    title: {
      en: "HD Glossy Photo Enlargement Print",
      hi: "एचडी ग्लोसी फोटो प्रिंट (4x6, 8x10)",
    },
    subtitle: {
      en: "High-definition photo enlargements with rich color depth and glossy lamination.",
      hi: "गहरे रंगों और चमक के साथ उच्च गुणवत्ता वाली बड़ी फोटो प्रिंटिंग।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/glossy-photo-prints-sample.svg",
    imageAlt: {
      en: "Stack of printed high-definition glossy lab photographs",
      hi: "एचडी ग्लोसी फोटो पेपर्स के प्रिंटेड स्टैक का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-rose-800 to-pink-950",
    relatedServiceIds: ["photo-print"],
  },
  {
    id: "g10",
    category: "digital-printing",
    title: {
      en: "Sealed Heavy Duty Heat Lamination",
      hi: "मजबूत हीट लैमिनेशन सुरक्षा",
    },
    subtitle: {
      en: "Waterproof, tear-resistant protective pouch lamination for marksheets and certificates.",
      hi: "मार्कशीट और प्रमाणपत्रों के लिए वाटरप्रूफ और मजबूत लैमिनेशन सुरक्षा।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/laminated-document-sample.svg",
    imageAlt: {
      en: "Finished laminated document sealed in protective clear heat pouch margin",
      hi: "हीट लैमिनेशन पाउच में सीलबंद दस्तावेज का प्रिंटेड नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-cyan-800 to-slate-900",
    relatedServiceIds: ["lamination"],
  },
  {
    id: "g11",
    category: "digital-printing",
    title: {
      en: "Spiral & Hardcover Project Binding",
      hi: "स्पाइरल एवं हार्डकवर प्रोजेक्ट बाइंडिंग",
    },
    subtitle: {
      en: "Neat plastic spiral coil and hardbound covers for school projects, reports, and manuals.",
      hi: "स्कूल प्रोजेक्ट्स और रिपोर्ट के लिए सुंदर स्पाइरल व हार्ड बाइंडिंग।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/spiral-binding-sample.svg",
    imageAlt: {
      en: "Finished plastic spiral bound project report booklet with clear cover",
      hi: "क्लियर कवर और स्पाइरल बाइंडिंग वाली प्रोजेक्ट रिपोर्ट बुकलेट का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-amber-700 to-stone-900",
    relatedServiceIds: ["bw-printing", "color-printing", "digital-printing"],
  },
  {
    id: "g12",
    category: "online-services",
    title: {
      en: "Professional Resume & CV Design",
      hi: "प्रोफेशनल रिज्यूमे व बायोडेटा डिज़ाइन",
    },
    subtitle: {
      en: "Modern structured curriculum vitae formatting and instant printing for job interviews.",
      hi: "नौकरी इंटरव्यू के लिए आधुनिक प्रारूप में रिज्यूमे और तुरंत प्रिंट।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/resume-cv-print-sample.svg",
    imageAlt: {
      en: "Printed professional two-column job resume document layout",
      hi: "पेज पर प्रिंटेड प्रोफेशनल रिज्यूमे और बायोडेटा लेआउट का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-teal-800 to-emerald-950",
    relatedServiceIds: ["biodata-design"],
  },
  {
    id: "g13",
    category: "online-services",
    title: {
      en: "High-Speed Document Scan to PDF",
      hi: "डॉक्यूमेंट स्कैनिंग व डिजिटल पीडीएफ",
    },
    subtitle: {
      en: "Clear optical scanning of multi-page documents, certificates, and email formatting.",
      hi: "दस्तावेजों की साफ़ ऑप्टिकल स्कैनिंग और ईमेल के लिए पीडीएफ निर्माण।",
    },
    badge: {
      en: "Sample Service",
      hi: "सैंपल सेवा",
    },
    imageUrl: "/images/gallery/scanned-pdf-document-sample.svg",
    imageAlt: {
      en: "Clean scanned document digital PDF preview with high optical resolution",
      hi: "डिजिटल पीडीएफ डॉक्यूमेंट स्कैनिंग पूर्वावलोकन का नमूना",
    },
    source: "Palak Enterprises Digital Sample",
    colorTheme: "from-blue-800 to-sky-950",
    relatedServiceIds: ["online-form"],
  },
  {
    id: "g14",
    category: "online-services",
    title: {
      en: "Government & Scheme Online Application Assistance",
      hi: "सरकारी योजना एवं फॉर्म आवेदन सहायता",
    },
    subtitle: {
      en: "Prompt digital support for submitting online forms, checking result statuses, and downloads.",
      hi: "ऑनलाइन फॉर्म भरने, परिणाम जांचने और प्रवेश पत्र डाउनलोड में डिजिटल सहयोग।",
    },
    badge: {
      en: "Sample Workflow",
      hi: "सैंपल प्रक्रिया",
    },
    imageUrl: "/images/gallery/online-form-filling-sample.svg",
    imageAlt: {
      en: "Step-by-step online form filling process from paper document to submitted slip",
      hi: "कागजी फॉर्म से डिजिटल ऑनलाइन फॉर्म सबमिशन प्रक्रिया का नमूना",
    },
    source: "Palak Enterprises Digital Assistance",
    colorTheme: "from-indigo-900 to-slate-900",
    relatedServiceIds: ["online-form", "caste-income-residence", "pension-services"],
  },
  {
    id: "g15",
    category: "invitations",
    title: {
      en: "Festive Birthday & Function Invitation",
      hi: "जन्मदिन व समारोह आमंत्रण कार्ड",
    },
    subtitle: {
      en: "Vibrant custom invitation cards for birthdays, anniversaries, and family functions.",
      hi: "जन्मदिन, सालगिरह और पारिवारिक समारोहों के सुंदर रंगीन कार्ड।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/birthday-invitation-sample.svg",
    imageAlt: {
      en: "Printed colorful children's birthday invitation card with matching envelope",
      hi: "रंगीन प्रिंटेड जन्मदिन निमंत्रण कार्ड और लिफाफे का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-fuchsia-800 to-purple-950",
    relatedServiceIds: ["invitation-cards"],
  },
  {
    id: "g16",
    category: "invitations",
    title: {
      en: "Marriage Biodata Format with Photo Frame",
      hi: "फोटो फ्रेम के साथ मैरिज बायोडेटा",
    },
    subtitle: {
      en: "Beautifully styled biodata design with photo framing for matrimonial proposals.",
      hi: "शादी के प्रस्तावों के लिए फोटो फ्रेमिंग के साथ सुव्यवस्थित बायोडेटा।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/marriage-biodata-sample.svg",
    imageAlt: {
      en: "Printed matrimonial marriage biodata sheet with traditional border and photo frame",
      hi: "फोटो फ्रेम और पारंपरिक बॉर्डर के साथ प्रिंटेड विवाह बायोडेटा का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-amber-800 to-red-950",
    relatedServiceIds: ["biodata-design"],
  },
  {
    id: "g17",
    category: "printing",
    title: {
      en: "Achievement & Honor Certificate Printing",
      hi: "उपलब्धि व सम्मान प्रमाणपत्र प्रिंटिंग",
    },
    subtitle: {
      en: "Metallic foil border certificates for schools, competitions, and corporate recognition.",
      hi: "स्कूलों, प्रतियोगिताओं और संस्थाओं के लिए आकर्षक बॉर्डर वाले प्रमाणपत्र।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/achievement-certificate-sample.svg",
    imageAlt: {
      en: "Printed achievement certificate on heavy paper with metallic gold foil border and seal",
      hi: "गोल्डन फॉयल बॉर्डर और सील के साथ प्रिंटेड सम्मान पत्र का नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-yellow-700 to-amber-950",
    relatedServiceIds: ["digital-printing"],
  },
  {
    id: "g18",
    category: "printing",
    title: {
      en: "Retail Shop Promotional Poster Print",
      hi: "दुकान प्रचार एवं ऑफर पोस्टर",
    },
    subtitle: {
      en: "Eye-catching indoor/outdoor promotional posters for sales, discounts, and launches.",
      hi: "सेल, ऑफर और नई दुकान के प्रचार के लिए आकर्षक बड़े पोस्टर प्रिंट।",
    },
    badge: {
      en: "Sample Design",
      hi: "सैंपल डिज़ाइन",
    },
    imageUrl: "/images/gallery/promotional-poster-sample.svg",
    imageAlt: {
      en: "Printed retail promotional sale poster with vibrant graphics and bold offer",
      hi: "दुकान के सेल और ऑफर का बड़ा प्रिंटेड प्रचार पोस्टर नमूना",
    },
    source: "Palak Enterprises Printed Sample",
    colorTheme: "from-red-700 to-orange-950",
    relatedServiceIds: ["banners-posters"],
  },
];
