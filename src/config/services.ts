export interface ServiceCategory {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  description: {
    en: string;
    hi: string;
  };
  iconName: string;
}

export interface ServiceItem {
  id: string;
  categoryId: string;
  name: {
    en: string;
    hi: string;
  };
  description: {
    en: string;
    hi: string;
  };
  iconName: string;
  featured?: boolean;
  popular?: boolean;
  tags: string[]; // Search aliases in EN & HI
  disclaimer?: {
    en: string;
    hi: string;
  };
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: "printing-photocopy",
    name: {
      en: "Printing & Photocopy",
      hi: "प्रिंटिंग और फोटोकॉपी",
    },
    description: {
      en: "Fast, clear, high-volume black & white and vibrant color printing services.",
      hi: "तेज़, साफ़ और गुणवत्तापूर्ण ब्लैक एंड व्हाइट एवं कलर प्रिंटिंग सेवाएँ।",
    },
    iconName: "Printer",
  },
  {
    id: "photo-id",
    name: {
      en: "Photo & ID Services",
      hi: "फोटो और पहचान पत्र सेवाएँ",
    },
    description: {
      en: "Instant passport photos, student ID cards, photo prints, and custom invitation cards.",
      hi: "इंस्टेंट पासपोर्ट फोटो, स्टूडेंट आईडी कार्ड, फोटो प्रिंट एवं आमंत्रण कार्ड।",
    },
    iconName: "Camera",
  },
  {
    id: "certificates-docs",
    name: {
      en: "Certificates & Documents",
      hi: "प्रमाणपत्र और दस्तावेज",
    },
    description: {
      en: "Assistance with official applications, certificates, lamination, and card printing.",
      hi: "आवेदन, प्रमाणपत्र, लैमिनेशन एवं स्मार्ट कार्ड प्रिंटिंग में सहायता।",
    },
    iconName: "FileCheck",
  },
  {
    id: "online-services",
    name: {
      en: "Online Services Assistance",
      hi: "ऑनलाइन सेवाएँ एवं सहायता",
    },
    description: {
      en: "Help with online forms, government scheme applications, pensions, and result checking.",
      hi: "ऑनलाइन फॉर्म भरवाने, सरकारी योजनाओं के आवेदन, पेंशन एवं रिजल्ट चेकिंग में मदद।",
    },
    iconName: "Globe",
  },
  {
    id: "business-printing",
    name: {
      en: "Business Printing",
      hi: "बिजनेस प्रिंटिंग",
    },
    description: {
      en: "Visiting cards, letterheads, bill books, pamphlets, banners, and advertising materials.",
      hi: "विजिटिंग कार्ड, लेटरपैड, बिल बुक, पम्पलेट, बैनर और प्रचार सामग्री।",
    },
    iconName: "Briefcase",
  },
  {
    id: "website-dev",
    name: {
      en: "Website Development",
      hi: "वेबसाइट निर्माण",
    },
    description: {
      en: "Modern, affordable websites for schools, shops, coaching centers, and businesses.",
      hi: "स्कूल, दुकान, कोचिंग सेंटर और बिजनेस के लिए आधुनिक एवं किफायती वेबसाइट।",
    },
    iconName: "Code",
  },
];

export const servicesData: ServiceItem[] = [
  // --- Category 1: Printing & Photocopy ---
  {
    id: "document-printing",
    categoryId: "printing-photocopy",
    name: {
      en: "Document Printing & Photocopy",
      hi: "दस्तावेज़ प्रिंटिंग व फोटोकॉपी",
    },
    description: {
      en: "Fast, clear black & white and vibrant color document printing, high-speed photocopy, and digital prints for notes, contracts, and legal papers.",
      hi: "नोट्स, कानूनी कागजात, प्रोजेक्ट्स और फोटो के लिए तीव्र सादा व रंगीन प्रिंटिंग एवं फोटोकॉपी सुविधा।",
    },
    iconName: "Printer",
    featured: true,
    popular: true,
    tags: ["bw", "color", "black white", "print", "photocopy", "xerox", "digital print", "ब्लैक", "व्हाइट", "कलर", "फोटोकॉपी", "जेरोक्स", "प्रिंट"],
  },
  {
    id: "lamination",
    categoryId: "printing-photocopy",
    name: {
      en: "Lamination Services",
      hi: "लैमिनेशन सुरक्षा",
    },
    description: {
      en: "Durable heat lamination for certificates, marksheets, licenses, and important documents.",
      hi: "प्रमाणपत्रों, मार्कशीट और महत्वपूर्ण दस्तावेजों के लिए मजबूत हीट लैमिनेशन।",
    },
    iconName: "ShieldCheck",
    featured: true,
    popular: true,
    tags: ["lamination", "pouch", "protect", "लैमिनेशन", "कवर"],
  },
  {
    id: "pamphlets",
    categoryId: "printing-photocopy",
    name: {
      en: "Pamphlets & Flyers",
      hi: "पम्पलेट एवं प्रचार पर्चे",
    },
    description: {
      en: "Single & multicolor promotional pamphlets for coaching, shops, events, and local ads.",
      hi: "कोचिंग, दुकान और आयोजनों के प्रचार के लिए रंगीन एवं सिंगल कलर पम्पलेट।",
    },
    iconName: "Newspaper",
    tags: ["pamphlet", "handbill", "flyers", "poster", "पम्पलेट", "पर्चा", "विज्ञापन"],
  },

  // --- Category 2: Photo & ID Services ---
  {
    id: "passport-photo",
    categoryId: "photo-id",
    name: {
      en: "Instant Passport Photo",
      hi: "इंस्टेंट पासपोर्ट फोटो",
    },
    description: {
      en: "Urgent passport photos with background correction, attire edit, and fast 5-minute print.",
      hi: "बैकग्राउंड बदलाव, कपड़े एडिट और 5 मिनट में तुरंत पासपोर्ट फोटो प्रिंट।",
    },
    iconName: "UserCheck",
    featured: true,
    popular: true,
    tags: ["passport photo", "photo", "urgent photo", "पासपोर्ट", "फोटो", "पासपोर्ट फोटो"],
  },
  {
    id: "photo-print",
    categoryId: "photo-id",
    name: {
      en: "Glossy Photo Print",
      hi: "ग्लोसी फोटो प्रिंट",
    },
    description: {
      en: "Studio quality lab photo prints in all standard sizes on HD glossy paper.",
      hi: "एचडी ग्लोसी पेपर पर सभी साइज़ की स्टूडियो क्वालिटी फोटो प्रिंटिंग।",
    },
    iconName: "Image",
    tags: ["photo print", "glossy", "lab print", "फोटो", "प्रिंट"],
  },
  {
    id: "id-card-print",
    categoryId: "photo-id",
    name: {
      en: "Smart ID Card Printing",
      hi: "स्मार्ट आईडी कार्ड प्रिंटिंग",
    },
    description: {
      en: "PVC plastic ID cards for school students, staff, organizations, and emergency cards.",
      hi: "स्कूल के छात्रों, स्टाफ और संस्थाओं के लिए पीवीसी प्लास्टिक आईडी कार्ड प्रिंटिंग।",
    },
    iconName: "CreditCard",
    featured: true,
    tags: ["id card", "pvc card", "student id", "आईडी कार्ड", "प्लास्टिक कार्ड"],
  },
  {
    id: "biodata-design",
    categoryId: "photo-id",
    name: {
      en: "Marriage Biodata & Resume",
      hi: "मैरिज बायोडेटा एवं रिज्यूमे",
    },
    description: {
      en: "Beautiful biodata design for marriage with photo framing and professional job resumes.",
      hi: "शादी के लिए आकर्षक बायोडेटा और फोटो फ्रेमिंग एवं नौकरी हेतु प्रोफेशनल रिज्यूमे।",
    },
    iconName: "FileText",
    tags: ["biodata", "resume", "marriage biodata", "बायोडेटा", "रिज्यूमे"],
  },
  {
    id: "invitation-cards",
    categoryId: "photo-id",
    name: {
      en: "Wedding & Ceremony Cards",
      hi: "शादी, तिलक एवं मुंडन कार्ड",
    },
    description: {
      en: "Custom printed wedding cards, Tilak, Birthday, Mundan, and religious function invitations.",
      hi: "शादी, तिलक, मुंडन, जन्मदिन और मांगलिक कार्यों के सुंदर निमंत्रण कार्ड।",
    },
    iconName: "Gift",
    featured: true,
    tags: ["wedding card", "tilak", "mundan", "invitation", "शादी", "कार्ड", "निमंत्रण", "तिलक", "मुंडन"],
  },

  // --- Category 3: Certificates & Documents ---
  {
    id: "caste-income-residence",
    categoryId: "certificates-docs",
    name: {
      en: "Caste, Income & Residence Certificate",
      hi: "जाति, आय एवं निवास प्रमाणपत्र",
    },
    description: {
      en: "Online submission assistance and status checking for Bihar RTPS certificate services.",
      hi: "बिहार आरटीपीएस पोर्टल पर जाति, आय और आवास प्रमाणपत्र आवेदन एवं स्थिति जांच में सहायता।",
    },
    iconName: "Award",
    featured: true,
    popular: true,
    tags: ["rtps", "caste", "income", "residence", "jati", "aay", "niwas", "जाति", "आय", "निवास", "प्रमाणपत्र"],
    disclaimer: {
      en: "Application assistance center. Final certificate issuance is governed by official authorities.",
      hi: "यह आवेदन सहायता केंद्र है। प्रमाणपत्र निर्गमन का अंतिम अधिकार संबंधित सरकारी विभाग के पास है।",
    },
  },
  {
    id: "aadhaar-print",
    categoryId: "certificates-docs",
    name: {
      en: "Aadhaar e-Print & PVC Print",
      hi: "आधार ई-प्रिंट एवं पीवीसी आधार",
    },
    description: {
      en: "High-clarity color print and PVC hard plastic card printing from official e-Aadhaar portal.",
      hi: "आधिकारिक ई-आधार पोर्टल से साफ़ रंगीन प्रिंट एवं पीवीसी प्लास्टिक आधार कार्ड।",
    },
    iconName: "IdCard",
    featured: true,
    popular: true,
    tags: ["aadhaar", "aadhar", "pvc aadhaar", "आधार", "प्रिंट", "आधार प्रिंट"],
    disclaimer: {
      en: "Services are subject to OTP validation by the cardholder via UIDAI official portal.",
      hi: "यह सेवा कार्डधारक द्वारा यूआईडीएआई पोर्टल पर ओटीपी सत्यापन के अधीन है।",
    },
  },
  {
    id: "ayushman-card",
    categoryId: "certificates-docs",
    name: {
      en: "Ayushman Bharat Card Assistance",
      hi: "आयुष्मान भारत कार्ड सहायता",
    },
    description: {
      en: "Assistance in checking eligibility, downloading, and printing Ayushman Golden Cards.",
      hi: "पात्रता जांचने, आयुष्मान कार्ड डाउनलोड करने और प्लास्टिक कार्ड प्रिंट करने में मदद।",
    },
    iconName: "HeartPulse",
    tags: ["ayushman", "golden card", "health card", "आयुष्मान", "कार्ड"],
  },
  {
    id: "admit-card-result",
    categoryId: "certificates-docs",
    name: {
      en: "Admit Card & Result Print",
      hi: "एडमिट कार्ड एवं परीक्षा रिजल्ट",
    },
    description: {
      en: "Fast printing of school, college, board, SSC, Railway, and Police exam admit cards.",
      hi: "स्कूल, कॉलेज, बोर्ड, एसएससी, रेलवे और पुलिस परीक्षा के एडमिट कार्ड का तुरंत प्रिंट।",
    },
    iconName: "GraduationCap",
    tags: ["admit card", "result", "hall ticket", "एडमिट कार्ड", "रिजल्ट", "परीक्षा"],
  },

  // --- Category 4: Online Services ---
  {
    id: "online-form",
    categoryId: "online-services",
    name: {
      en: "Government & Job Form Assistance",
      hi: "सरकारी एवं प्रतियोगी परीक्षा फॉर्म",
    },
    description: {
      en: "Expert help in filling out application forms for SSC, Railway, Banking, Defense, Bihar Police, and Teachers.",
      hi: "एसएससी, रेलवे, बैंकिंग, बिहार पुलिस, शिक्षक एवं विभिन्न प्रतियोगी परीक्षाओं के फॉर्म भरने में विशेषज्ञ सहायता।",
    },
    iconName: "FilePlus",
    featured: true,
    popular: true,
    tags: ["online form", "sarkari result", "job form", "form fill", "ऑनलाइन फॉर्म", "सरकारी फॉर्म", "आवेदन"],
  },
  {
    id: "pension-services",
    categoryId: "online-services",
    name: {
      en: "Pension Schemes Assistance",
      hi: "पेंशन योजनाएं सहायता (वृद्धा, दिव्यांग, विधवा)",
    },
    description: {
      en: "Guidance for Old Age Pension, Disability Pension, Widow Pension applications, and KYC verification.",
      hi: "वृद्धावस्था पेंशन, दिव्यांग पेंशन, विधवा पेंशन आवेदन और ई-केवाईसी में विशेष मार्गदर्शन।",
    },
    iconName: "Users",
    featured: true,
    tags: ["pension", "old age", "disability", "vridha", "पेंशन", "वृद्धा पेंशन", "दिव्यांग"],
  },
  {
    id: "eshram-ration-card",
    categoryId: "online-services",
    name: {
      en: "e-Shram & Ration Card Services",
      hi: "ई-श्रम कार्ड एवं राशन कार्ड सेवा",
    },
    description: {
      en: "Registration and printout assistance for e-Shram card, Bihar Ration card status and updates.",
      hi: "ई-श्रम कार्ड रजिस्ट्रेशन, प्रिंट एवं राशन कार्ड में नाम जोड़ने/स्थिति जांचने में मदद।",
    },
    iconName: "FolderCheck",
    tags: ["eshram", "ration card", "shramik", "ई-श्रम", "राशन कार्ड"],
  },
  {
    id: "farmer-registration",
    categoryId: "online-services",
    name: {
      en: "Farmer Registration & PM-Kisan",
      hi: "किसान पंजीकरण एवं पीएम-किसान ई-केवाईसी",
    },
    description: {
      en: "DBT Agriculture Bihar registration, PM Kisan Samman Nidhi e-KYC, and land record assistance.",
      hi: "डीबीटी एग्रीकल्चर बिहार पंजीकरण, पीएम किसान सम्मान निधि ई-केवाईसी और रसीद कार्य।",
    },
    iconName: "Tractor",
    tags: ["farmer", "pm kisan", "dbt agriculture", "kisan", "किसान", "पीएम किसान"],
  },
  {
    id: "dakhil-kharij",
    categoryId: "online-services",
    name: {
      en: "Land Mutation & Lagan Receipt",
      hi: "दाखिल-खारिज एवं भूमि लगान रसीद",
    },
    description: {
      en: "Online payment of land revenue (Lagan), mutation portal navigation support.",
      hi: "भूमि लगान का ऑनलाइन भुगतान और दाखिला-खारिज (म्यूटेशन) आवेदन पोर्टल में सहायता।",
    },
    iconName: "MapPin",
    tags: ["dakhil kharij", "lagan", "land record", "bhumi", "दाखिल खारिज", "लगान", "जमीन"],
  },
  {
    id: "money-transfer-banking",
    categoryId: "online-services",
    name: {
      en: "Money Transfer & Recharge",
      hi: "मनी ट्रांसफर एवं रीचार्ज सेवा",
    },
    description: {
      en: "Quick domestic money transfer, mobile recharge, DTH recharge, and bill payments.",
      hi: "सुरक्षित मनी ट्रांसफर, मोबाइल रीचार्ज, डीटीएच रीचार्ज और बिजली बिल भुगतान।",
    },
    iconName: "IndianRupee",
    tags: ["money transfer", "recharge", "dth", "electricity bill", "मनी ट्रांसफर", "रीचार्ज"],
  },

  // --- Category 5: Business Printing ---
  {
    id: "visiting-cards",
    categoryId: "business-printing",
    name: {
      en: "Visiting Cards",
      hi: "विजिटिंग कार्ड",
    },
    description: {
      en: "Matte, Gloss, Velvet finish, metallic & UV spot custom business cards with creative layout.",
      hi: "मैट, ग्लोसी, वेलवेट फिनिश और यूवी स्पॉट आकर्षक विजिटिंग कार्ड डिज़ाइन एवं प्रिंट।",
    },
    iconName: "Contact",
    featured: true,
    popular: true,
    tags: ["visiting card", "business card", "card print", "विजिटिंग कार्ड", "बिजनेस कार्ड"],
  },
  {
    id: "banners-posters",
    categoryId: "business-printing",
    name: {
      en: "Flex Banners & Posters",
      hi: "फ्लेक्स बैनर एवं पोस्टर",
    },
    description: {
      en: "Heavy-duty outdoor flex banners, shop signboards, star flex, and vinyl posters for promotions.",
      hi: "दुकान के साइनबोर्ड, कोचिंग और राजनीतिक प्रचार के लिए मजबूत फ्लेक्स बैनर व पोस्टर।",
    },
    iconName: "Image",
    featured: true,
    tags: ["flex", "banner", "poster", "signboard", "बैनर", "पोस्टर", "फ्लेक्स"],
  },
  {
    id: "bill-books",
    categoryId: "business-printing",
    name: {
      en: "Bill Books & Invoice Pads",
      hi: "बिल बुक एवं इनवॉइस पैड",
    },
    description: {
      en: "Numbered duplicate/triplicate carbonless copy bill books for shops, clinics, and businesses.",
      hi: "दुकानों, क्लिनिक और संस्थानों के लिए नंबरिंग वाली कार्बनलेस बिल बुक।",
    },
    iconName: "Receipt",
    tags: ["bill book", "invoice", "receipt pad", "बिल बुक", "रसीद"],
  },
  {
    id: "letterhead-envelope",
    categoryId: "business-printing",
    name: {
      en: "Letterheads, Pads & Envelopes",
      hi: "ऑफिशियल लेटरहेड, पैड एवं लिफाफे",
    },
    description: {
      en: "Standard executive letterheads on bond paper, customized doctor prescription & office writing pads, and company envelopes.",
      hi: "बॉन्ड पेपर पर एग्जीक्यूटिव लेटरहेड, डॉक्टर पर्चा पैड, ऑफिस राइटिंग पैड और प्रिंटेड लिफाफे।",
    },
    iconName: "Mail",
    tags: ["letterhead", "envelope", "letterpad", "pad", "office stationery", "लेटरहेड", "लिफाफा", "पैड"],
  },

  // --- Category 6: Website Development ---
  {
    id: "website-development",
    categoryId: "website-dev",
    name: {
      en: "Custom Website Development",
      hi: "कस्टम वेबसाइट निर्माण",
    },
    description: {
      en: "Modern, fast, mobile-friendly websites for schools, shops, coaching centers, doctors, and businesses.",
      hi: "स्कूल, कोचिंग, दुकान, डॉक्टर और स्थानीय व्यवसाय के लिए आधुनिक, तेज़ व मोबाइल-फ्रेंडली वेबसाइट।",
    },
    iconName: "Globe2",
    featured: true,
    popular: true,
    tags: ["website", "web design", "developer", "school website", "वेबसाइट", "वेब डिज़ाइन"],
  },
];
