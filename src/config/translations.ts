export type Language = "en" | "hi";

export interface Translations {
  nav: {
    home: string;
    services: string;
    printing: string;
    onlineServices: string;
    businessPrinting: string;
    websiteDev: string;
    about: string;
    gallery: string;
    faq: string;
    contact: string;
    callNow: string;
    whatsapp: string;
    getDirections: string;
  };
  hero: {
    badge: string;
    brandNames: string[];
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ctaDirections: string;
    trustPoint1: string;
    trustPoint2: string;
    trustPoint3: string;
  };
  search: {
    title: string;
    placeholder: string;
    allCategories: string;
    noResultsTitle: string;
    noResultsText: string;
    resetSearch: string;
  };
  featured: {
    title: string;
    subtitle: string;
    viewAllServices: string;
  };
  categories: {
    title: string;
    subtitle: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  requestForm: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    serviceLabel: string;
    selectService: string;
    fileLabel: string;
    fileHelpText: string;
    quantityLabel: string;
    printTypeLabel: string;
    bwOption: string;
    colorOption: string;
    notApplicable: string;
    instructionsLabel: string;
    instructionsPlaceholder: string;
    preferredContactLabel: string;
    contactWhatsApp: string;
    contactCall: string;
    submitButton: string;
    submitWhatsAppButton: string;
    validationName: string;
    validationPhone: string;
    validationService: string;
    validationFile: string;
    successMessage: string;
  };
  businessSpotlight: {
    title: string;
    subtitle: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    bullet4: string;
    cta: string;
  };
  webDevSpotlight: {
    title: string;
    subtitle: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    bullet4: string;
    cta: string;
  };
  trust: {
    title: string;
    subtitle: string;
    b1Title: string;
    b1Desc: string;
    b2Title: string;
    b2Desc: string;
    b3Title: string;
    b3Desc: string;
    b4Title: string;
    b4Desc: string;
    b5Title: string;
    b5Desc: string;
    b6Title: string;
    b6Desc: string;
  };
  about: {
    title: string;
    subtitle: string;
    p1: string;
    p2: string;
    p3: string;
    badge1: string;
    badge2: string;
    badge3: string;
  };
  gallery: {
    title: string;
    subtitle: string;
    all: string;
    sampleDisclaimer: string;
    viewAllSamples: string;
  };
  faq: {
    title: string;
    subtitle: string;
  };
  location: {
    title: string;
    subtitle: string;
    addressLabel: string;
    landmarkLabel: string;
    hoursLabel: string;
    phoneLabel: string;
    copyAddress: string;
    addressCopied: string;
    getDirections: string;
  };
  footer: {
    aboutTitle: string;
    servicesTitle: string;
    quickLinksTitle: string;
    contactTitle: string;
    proprietor: string;
    rightsReserved: string;
    seniorMode: string;
    normalMode: string;
  };
  instantOnlineServices: {
    title: string;
    tagline: string;
    promise: string;
    subtext: string;
    startNow: string;
    requestQuote: string;
    comingSoon: string;
    services: {
      document: { name: string; desc: string };
      passportPhoto: { name: string; desc: string };
      visitingCard: { name: string; desc: string };
      invitationCard: { name: string; desc: string };
      idCard: { name: string; desc: string };
      posterBanner: { name: string; desc: string };
      customPrint: { name: string; desc: string };
    };
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      home: "Home",
      services: "All Services",
      printing: "Printing",
      onlineServices: "Online Services",
      businessPrinting: "Business Printing",
      websiteDev: "Website Dev",
      about: "About Us",
      gallery: "Our Work",
      faq: "FAQ",
      contact: "Contact",
      callNow: "Call Now",
      whatsapp: "WhatsApp Us",
      getDirections: "Get Directions",
    },
    hero: {
      badge: "Trusted Local Business in Chakia, East Champaran",
      brandNames: ["Palak Enterprises", "Palak Printing Press"],
      headline: "Printing & Digital Services, All in One Place",
      subheadline: "Professional printing, document services, online applications, and website development — simple, fast, and reliable.",
      ctaPrimary: "Get a Service",
      ctaSecondary: "Call Now",
      ctaDirections: "Get Directions",
      trustPoint1: "5-Min Instant Photos",
      trustPoint2: "Fast Photocopy & Print",
      trustPoint3: "Form & Application Help",
    },
    search: {
      title: "What service do you need today?",
      placeholder: "Search service (e.g. Passport Photo, Aadhaar, Lamination, Online Form)...",
      allCategories: "All Categories",
      noResultsTitle: "No matching services found",
      noResultsText: "Try searching with a different keyword or browse our main categories.",
      resetSearch: "Clear Search Filters",
    },
    featured: {
      title: "Most Requested Services",
      subtitle: "Quick access to our most popular printing and digital assistance services.",
      viewAllServices: "View All Services",
    },
    categories: {
      title: "Explore Our Full Range of Services",
      subtitle: "Organized categories so you can quickly find the exact assistance you need.",
    },
    howItWorks: {
      title: "How It Works — Simple 3 Steps",
      subtitle: "Designed for everyone regardless of age or digital experience.",
      step1Title: "1. Choose a Service",
      step1Desc: "Select the printing, document, or online form service you require.",
      step2Title: "2. Contact or Visit Us",
      step2Desc: "Call, send details on WhatsApp, or visit our center near Block Gate, Chakia.",
      step3Title: "3. Get Your Work Done",
      step3Desc: "Receive your high-quality prints, photos, or completed applications quickly.",
    },
    requestForm: {
      title: "Need Something Printed or Applied For?",
      subtitle: "Send your details or upload your document. We will contact you immediately.",
      nameLabel: "Your Full Name *",
      namePlaceholder: "e.g. Ramesh Kumar",
      phoneLabel: "Mobile Number *",
      phonePlaceholder: "e.g. 9905238015",
      serviceLabel: "Select Service Required *",
      selectService: "-- Choose a Service --",
      fileLabel: "Upload Document / Photo (Optional)",
      fileHelpText: "Supported formats: PDF, JPG, PNG (Max size: 10MB)",
      quantityLabel: "Quantity / Copies",
      printTypeLabel: "Printing Color Mode",
      bwOption: "Black & White (B/W)",
      colorOption: "Vibrant Color",
      notApplicable: "Not Applicable (Form / Online)",
      instructionsLabel: "Additional Instructions / Details",
      instructionsPlaceholder: "Mention paper type, size, urgency, or specific form details...",
      preferredContactLabel: "How should we respond?",
      contactWhatsApp: "WhatsApp Message",
      contactCall: "Phone Call",
      submitButton: "Submit Request",
      submitWhatsAppButton: "Submit & Chat on WhatsApp",
      validationName: "Please enter your full name.",
      validationPhone: "Please enter a valid 10-digit mobile number.",
      validationService: "Please select a service.",
      validationFile: "File size exceeds 10MB. Please choose a smaller file.",
      successMessage: "Thank you! Your request has been recorded. We will connect with you shortly.",
    },
    businessSpotlight: {
      title: "Grow Your Local Business with Premium Printing",
      subtitle: "Professional branding materials designed for shopkeepers, schools, clinics, and enterprises.",
      bullet1: "Eye-catching Visiting Cards with Matte/UV Finish",
      bullet2: "High-Durability Outdoor Flex Banners & Signboards",
      bullet3: "Custom Numbered Bill Books & Invoice Pads",
      bullet4: "Official Letterheads, Envelopes & Pamphlets",
      cta: "Discuss Business Printing",
    },
    webDevSpotlight: {
      title: "Get a Professional Website for Your Business",
      subtitle: "Showcase your shop, school, coaching center, or services on Google.",
      bullet1: "Modern, Fast & Fully Mobile-Friendly Design",
      bullet2: "Bilingual (English + Hindi) Support Included",
      bullet3: "Google Maps & WhatsApp Integration",
      bullet4: "Affordable Pricing for Local Businesses in Bihar",
      cta: "Discuss Your Website",
    },
    trust: {
      title: "Why Choose Palak Enterprises?",
      subtitle: "Your trusted local center delivering quality, speed, and helpful guidance.",
      b1Title: "Easy & Helpful Guidance",
      b1Desc: "Friendly service designed for senior citizens, students, and first-time internet users.",
      b2Title: "Fast Turnaround",
      b2Desc: "Instant 5-minute passport photos and high-speed document printing.",
      b3Title: "Complete Services Hub",
      b3Desc: "From photo prints to government form assistance and website development.",
      b4Title: "Central Location",
      b4Desc: "Conveniently located near Block Gate, Saniganj Mohalla, Chakia.",
      b5Title: "Full Bilingual Support",
      b5Desc: "Complete assistance provided in both Hindi and English.",
      b6Title: "High Print Quality",
      b6Desc: "Sharp text, rich colors, and durable lamination for all your documents.",
    },
    about: {
      title: "Your Local Partner for Printing & Digital Services",
      subtitle: "Serving Chakia, East Champaran with dedication and reliability.",
      p1: "Palak Enterprises (Palak Printing Press) is a premier printing, digital service, and online document assistance hub in Chakia, Bihar. Under the leadership of Pro. Kumar Pankaj, we combine quality printing craftsmanship with modern digital convenience.",
      p2: "Whether you need urgent passport-size photos, high-speed photocopies, school ID cards, caste & income certificate form assistance, pension application guidance, or custom business visiting cards, our center provides prompt, courteous, and accurate support.",
      p3: "We take pride in making technology and printing services easily accessible to people of all ages — from students and business owners to senior citizens across East Champaran.",
      badge1: "Trusted Local Business",
      badge2: "Quality Printing Studio",
      badge3: "Online Service Center",
    },
    gallery: {
      title: "Printing & Design Samples",
      subtitle: "Explore sample designs and reference examples of printing, stationery, and digital services we can help you create.",
      all: "All Samples",
      sampleDisclaimer: "Note: Visuals shown below are reference sample designs demonstrating our printing and digital capabilities.",
      viewAllSamples: "Explore Full Samples Showcase →",
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Clear answers to common questions about our services and process.",
    },
    location: {
      title: "Visit Our Center or Contact Us",
      subtitle: "We are easily accessible near Block Gate, Chakia.",
      addressLabel: "Business Address",
      landmarkLabel: "Landmark",
      hoursLabel: "Working Hours",
      phoneLabel: "Contact Phone",
      copyAddress: "Copy Full Address",
      addressCopied: "Address Copied!",
      getDirections: "Open in Google Maps",
    },
    footer: {
      aboutTitle: "Palak Enterprises",
      servicesTitle: "Popular Services",
      quickLinksTitle: "Quick Navigation",
      contactTitle: "Contact & Address",
      proprietor: "Proprietor: Kumar Pankaj",
      rightsReserved: "© Palak Enterprises / Palak Printing Press. All rights reserved.",
      seniorMode: "Senior / High-Contrast Mode",
      normalMode: "Standard Text Mode",
    },
    instantOnlineServices: {
      title: "⚡ Instant Online Services",
      tagline: "Apna kaam khud karein — bina line mein wait kiye.",
      promise: "Online order submit karein, order ready hone par shop se collect karein.",
      subtext: "File upload karein, printing options select karein, finishing add karein aur order submit karein. Palak Enterprises aapka order ready karega, taaki aap bina line mein wait kiye collect kar saken.",
      startNow: "Start Now →",
      requestQuote: "Request Quote →",
      comingSoon: "Coming Soon",
      services: {
        document: {
          name: "Document Printing",
          desc: "Notes, assignments, forms, reports aur documents print karein — spiral binding, comb binding aur lamination ke sath.",
        },
        passportPhoto: {
          name: "Passport Photo Printing",
          desc: "Apni photo upload karein aur printable photo sheet order karein.",
        },
        visitingCard: {
          name: "Visiting Card Printing",
          desc: "Apna design upload karein ya available template se start karein.",
        },
        invitationCard: {
          name: "Invitation / Wedding Cards",
          desc: "Customized invitation printing — coming soon.",
        },
        idCard: {
          name: "ID Card Printing",
          desc: "Personal aur organization ID cards ke liye print order karein.",
        },
        posterBanner: {
          name: "Poster & Banner Printing",
          desc: "Apna design upload karein aur required size/material select karein.",
        },
        customPrint: {
          name: "Custom Print Order",
          desc: "Agar aapko required printing option nahi mil raha, custom requirement submit karein.",
        },
      },
    },
  },
  hi: {
    nav: {
      home: "मुख्य पृष्ठ",
      services: "सभी सेवाएँ",
      printing: "प्रिंटिंग",
      onlineServices: "ऑनलाइन सेवाएँ",
      businessPrinting: "बिजनेस प्रिंटिंग",
      websiteDev: "वेबसाइट बनवाएँ",
      about: "हमारे बारे में",
      gallery: "हमारा काम",
      faq: "प्रश्न-उत्तर",
      contact: "संपर्क करें",
      callNow: "अभी कॉल करें",
      whatsapp: "व्हाट्सएप करें",
      getDirections: "रास्ता देखें",
    },
    hero: {
      badge: "चकिया, पूर्वी चंपारण का भरोसेमंद स्थानीय केंद्र",
      brandNames: ["पालक इंटरप्राइजेज", "पालक प्रिंटिंग प्रेस"],
      headline: "आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह",
      subheadline: "प्रोफेशनल प्रिंटिंग, डिजिटल सेवाएँ, सरकारी ऑनलाइन आवेदन और वेबसाइट निर्माण — सरल, तेज़ और भरोसेमंद।",
      ctaPrimary: "सेवा प्राप्त करें",
      ctaSecondary: "अभी कॉल करें",
      ctaDirections: "रास्ता देखें",
      trustPoint1: "5 मिनट में इंस्टेंट फोटो",
      trustPoint2: "तेज़ फोटोकॉपी व प्रिंट",
      trustPoint3: "ऑनलाइन फॉर्म में सहायता",
    },
    search: {
      title: "आज आपको किस सेवा की आवश्यकता है?",
      placeholder: "सेवा खोजें (जैसे: पासपोर्ट फोटो, आधार प्रिंट, लैमिनेशन, ऑनलाइन फॉर्म)...",
      allCategories: "सभी श्रेणियां",
      noResultsTitle: "कोई परिणाम नहीं मिला",
      noResultsText: "कृपया अलग शब्द से खोजें या नीचे दी गई श्रेणियों में देखें।",
      resetSearch: "खोज रीसेट करें",
    },
    featured: {
      title: "सर्वाधिक मांगी जाने वाली सेवाएँ",
      subtitle: "हमारे केंद्र की सबसे लोकप्रिय प्रिंटिंग एवं डिजिटल सेवाओं तक त्वरित पहुंच।",
      viewAllServices: "सभी सेवाएँ देखें",
    },
    categories: {
      title: "हमारी सभी सेवाओं की सूची",
      subtitle: "सुव्यवस्थित श्रेणियां ताकि आप आसानी से अपनी आवश्यकता की सेवा चुन सकें।",
    },
    howItWorks: {
      title: "कार्य प्रक्रिया — सरल 3 चरण",
      subtitle: "वरिष्ठ नागरिकों और नए इंटरनेट उपयोगकर्ताओं के लिए विशेष रूप से आसान।",
      step1Title: "1. सेवा चुनें",
      step1Desc: "अपनी आवश्यकता अनुसार प्रिंटिंग, फोटो या ऑनलाइन फॉर्म सेवा का चयन करें।",
      step2Title: "2. संपर्क करें या आएँ",
      step2Desc: "कॉल करें, व्हाट्सएप पर जानकारी भेजें, या ब्लॉक गेट चकिया के पास हमारे केंद्र पर आएँ।",
      step3Title: "3. काम पूरा करवाएँ",
      step3Desc: "उच्च गुणवत्ता वाले प्रिंट, फोटो या ऑनलाइन आवेदन का काम तुरंत प्राप्त करें।",
    },
    requestForm: {
      title: "कोई डॉक्यूमेंट प्रिंट या फॉर्म भरवाना है?",
      subtitle: "अपनी जानकारी भरें या डॉक्यूमेंट अपलोड करें। हम तुरंत आपसे संपर्क करेंगे।",
      nameLabel: "आपका पूरा नाम *",
      namePlaceholder: "जैसे: रमेश कुमार",
      phoneLabel: "मोबाइल नंबर *",
      phonePlaceholder: "जैसे: 9905238015",
      serviceLabel: "आवश्यक सेवा चुनें *",
      selectService: "-- सेवा का चयन करें --",
      fileLabel: "डॉक्यूमेंट या फोटो अपलोड करें (ऐच्छिक)",
      fileHelpText: "स्वीकार्य फाइलें: PDF, JPG, PNG (अधिकतम: 10MB)",
      quantityLabel: "कॉपी की संख्या (Quantity)",
      printTypeLabel: "प्रिंट प्रकार",
      bwOption: "ब्लैक एंड व्हाइट (सादा)",
      colorOption: "कलर (रंगीन)",
      notApplicable: "लागू नहीं (ऑनलाइन फॉर्म/अन्य)",
      instructionsLabel: "अतिरिक्त निर्देश या विवरण",
      instructionsPlaceholder: "पेपर साइज, जरूरी जानकारी या कोई विशेष निर्देश लिखें...",
      preferredContactLabel: "आप संपर्क कैसे चाहते हैं?",
      contactWhatsApp: "व्हाट्सएप मैसेज",
      contactCall: "फोन कॉल",
      submitButton: "अनुरोध भेजें",
      submitWhatsAppButton: "सबमिट करें और व्हाट्सएप पर चैट करें",
      validationName: "कृपया अपना पूरा नाम लिखें।",
      validationPhone: "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।",
      validationService: "कृपया किसी एक सेवा का चयन करें।",
      validationFile: "फाइल साइज़ 10MB से अधिक है। छोटी फाइल चुनें।",
      successMessage: "धन्यवाद! आपका अनुरोध दर्ज कर लिया गया है। हम जल्द ही आपसे संपर्क करेंगे।",
    },
    businessSpotlight: {
      title: "प्रोफेशनल प्रिंटिंग से बढ़ाएं अपना व्यापार",
      subtitle: "दुकानदारों, स्कूलों, कोचिंग और संस्थानों के लिए उच्च-गुणवत्ता प्रचार सामग्री।",
      bullet1: "मैट एवं यूवी फिनिश में आकर्षक विजिटिंग कार्ड",
      bullet2: "दुकान व प्रचार के लिए मजबूत आउटडोर फ्लेक्स बैनर",
      bullet3: "नंबरिंग वाली कस्टम बिल बुक एवं इनवॉइस पैड",
      bullet4: "ऑफिसियल लेटरहेड, लिफाफे और पम्पलेट प्रिंटिंग",
      cta: "बिजनेस प्रिंटिंग की बात करें",
    },
    webDevSpotlight: {
      title: "अपने व्यवसाय, स्कूल या दुकान की वेबसाइट बनवाएँ",
      subtitle: "गूगल पर अपने व्यापार की पहचान बनाएं और नए ग्राहक पाएं।",
      bullet1: "आधुनिक, तेज और मोबाइल-अनुकूल वेबसाइट डिजाइन",
      bullet2: "हिंदी और अंग्रेजी दोनों भाषाओं में सुविधा",
      bullet3: "गूगल मैप्स और डायरेक्ट व्हाट्सएप बटन सुविधा",
      bullet4: "स्थानीय व्यवसायों के लिए किफायती व पारदर्शी शुल्क",
      cta: "वेबसाइट निर्माण पर चर्चा करें",
    },
    trust: {
      title: "पालक इंटरप्राइजेज ही क्यों चुनें?",
      subtitle: "गुणवत्ता, त्वरित सेवा और सही मार्गदर्शन का भरोसेमंद स्थान।",
      b1Title: "सरल एवं मददगार सहयोग",
      b1Desc: "वरिष्ठ नागरिकों, विद्यार्थियों और बुजुर्गों के लिए विशेष रूप से सहज वातावरण।",
      b2Title: "त्वरित कार्य प्रक्रिया",
      b2Desc: "5 मिनट में तुरंत पासपोर्ट फोटो एवं तेज़ स्पीड प्रिंटिंग।",
      b3Title: "एक ही स्थान पर सभी सेवाएँ",
      b3Desc: "फोटो प्रिंट से लेकर सरकारी फॉर्म सहायता और वेबसाइट बनाने तक।",
      b4Title: "आसान एवं प्रमुख स्थान",
      b4Desc: "ब्लॉक गेट के पास, सनिगंज मोहल्ला, चकिया में आसानी से पहुँच योग्य।",
      b5Title: "पूर्ण द्विभाषी सुविधा",
      b5Desc: "हिंदी और अंग्रेजी दोनों भाषाओं में संपूर्ण जानकारी और सहयोग।",
      b6Title: "उच्च प्रिंट गुणवत्ता",
      b6Desc: "साफ़ अक्षर, गहरे रंग और मजबूत लैमिनेशन सुरक्षा।",
    },
    about: {
      title: "प्रिंटिंग और डिजिटल सेवाओं के लिए आपका भरोसेमंद स्थानीय केंद्र",
      subtitle: "चकिया एवं पूर्वी चंपारण की सेवा में सदैव तत्पर।",
      p1: "पालक इंटरप्राइजेज (पालक प्रिंटिंग प्रेस) चकिया, बिहार में प्रिंटिंग, डिजिटल सेवाओं और ऑनलाइन फॉर्म सहायता का प्रमुख केंद्र है। प्रो. कुमार पंकज के नेतृत्व में, हम आधुनिक तकनीक और बेहतरीन प्रिंटिंग का संगम प्रस्तुत करते हैं।",
      p2: "चाहे आपको तुरंत पासपोर्ट फोटो, फोटोकॉपी, स्कूल आईडी कार्ड, जाति-आय-निवास फॉर्म सहायता, पेंशन आवेदन मार्गदर्शन या बिजनेस विजिटिंग कार्ड चाहिए, हमारा केंद्र आपको त्वरित और सटीक सेवा प्रदान करता है।",
      p3: "हम विद्यार्थियों, व्यापारियों से लेकर बुजुर्ग नागरिकों तक — सभी के लिए प्रिंटिंग और ऑनलाइन सेवाओं को आसान और सुलभ बनाने के लिए प्रतिबद्ध हैं।",
      badge1: "भरोसेमंद स्थानीय केंद्र",
      badge2: "प्रीमियम प्रिंटिंग स्टूडियो",
      badge3: "ऑनलाइन सर्विस सेंटर",
    },
    gallery: {
      title: "प्रिंटिंग एवं डिज़ाइन के नमूने",
      subtitle: "हमारी प्रिंटिंग, कार्ड, फोटो एवं ऑनलाइन सेवाओं के सैंपल डिज़ाइन और रेफरेंस देखें।",
      all: "सभी नमूने",
      sampleDisclaimer: "नोट: नीचे दिखाए गए चित्र हमारी प्रिंटिंग और डिज़ाइन क्षमताओं को दर्शाने वाले सैंपल एवं संदर्भ उदाहरण हैं।",
      viewAllSamples: "सभी नमूने देखें →",
    },
    faq: {
      title: "अक्सर पूछे जाने वाले प्रश्न (FAQ)",
      subtitle: "हमारी सेवाओं और कार्य प्रक्रिया से जुड़े आम सवालों के स्पष्ट जवाब।",
    },
    location: {
      title: "हमारे केंद्र पर आएँ या संपर्क करें",
      subtitle: "ब्लॉक गेट के पास, चकिया में हमारा केंद्र स्थित है।",
      addressLabel: "स्थान एवं पता",
      landmarkLabel: "लैंडमार्क (पहचान)",
      hoursLabel: "कार्य समय",
      phoneLabel: "संपर्क फोन",
      copyAddress: "पूरा पता कॉपी करें",
      addressCopied: "पता कॉपी हो गया!",
      getDirections: "गूगल मैप पर रास्ता देखें",
    },
    footer: {
      aboutTitle: "पालक इंटरप्राइजेज",
      servicesTitle: "लोकप्रिय सेवाएँ",
      quickLinksTitle: "त्वरित लिंक",
      contactTitle: "संपर्क एवं पता",
      proprietor: "प्रोपराइटर: कुमार पंकज",
      rightsReserved: "© पालक इंटरप्राइजेज / पालक प्रिंटिंग प्रेस। सर्वाधिकार सुरक्षित।",
      seniorMode: "वरिष्ठ नागरिक / उच्च कन्ट्रास्ट मोड",
      normalMode: "सामान्य टेक्स्ट मोड",
    },
    instantOnlineServices: {
      title: "⚡ इंस्टेंट ऑनलाइन सेवाएँ",
      tagline: "अपना काम खुद करें — बिना लाइन में वेट किए।",
      promise: "ऑनलाइन ऑर्डर सबमिट करें, ऑर्डर रेडी होने पर दुकान से कलेक्ट करें।",
      subtext: "फ़ाइल अपलोड करें, प्रिंटिंग ऑप्शंस चुनें, फ़िनिशिंग जोड़ें और ऑर्डर सबमिट करें। पालक इंटरप्राइजेज आपका ऑर्डर तैयार रखेगा ताकि आप बिना लाइन में प्रतीक्षा किए कलेक्ट कर सकें।",
      startNow: "शुरू करें →",
      requestQuote: "कोटेशन मांगें →",
      comingSoon: "जल्द आ रहा है",
      services: {
        document: {
          name: "दस्तावेज प्रिंटिंग (Document Printing)",
          desc: "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट व दस्तावेज प्रिंट कराएं — स्पाइरल, कॉम्ब बाइंडिंग व लैमिनेशन के साथ।",
        },
        passportPhoto: {
          name: "पासपोर्ट फोटो प्रिंटिंग",
          desc: "अपनी फोटो अपलोड करें और तुरंत प्रिंटेबल फोटो शीट ऑर्डर करें।",
        },
        visitingCard: {
          name: "विजिटिंग कार्ड प्रिंटिंग",
          desc: "अपना डिजाइन अपलोड करें या उपलब्ध टेम्पलेट से कार्ड ऑर्डर करें।",
        },
        invitationCard: {
          name: "शादी व निमंत्रण कार्ड",
          desc: "कस्टमाइज्ड निमंत्रण पत्र प्रिंटिंग — जल्द उपलब्ध होगा।",
        },
        idCard: {
          name: "पहचान पत्र (ID Card) प्रिंटिंग",
          desc: "व्यक्तिगत व संस्थान आईडी कार्ड के लिए प्रिंट ऑर्डर करें।",
        },
        posterBanner: {
          name: "पोस्टर एवं बैनर प्रिंटिंग",
          desc: "अपना डिजाइन अपलोड करें और आवश्यक साइज व मटेरियल चुनें।",
        },
        customPrint: {
          name: "कस्टम प्रिंट ऑर्डर",
          desc: "यदि आपकी आवश्यकता का विकल्प नहीं मिल रहा, तो कस्टम रिक्वायरमेंट सबमिट करें।",
        },
      },
    },
  },
};

// Extend translations with bilingual property objects for direct component consumption (e.g., translations.servicesPage.heading[lang])
export const extendedTranslations = {
  servicesPage: {
    heading: { en: "All Services", hi: "सभी सेवाएँ" },
    subheading: {
      en: "Printing, digital services, government assistance, business solutions and more — all in one place.",
      hi: "प्रिंटिंग, डिजिटल सेवाएँ, सरकारी सहायता, व्यावसायिक समाधान और बहुत कुछ — सब एक ही जगह।",
    },
    searchPlaceholder: {
      en: "Search services... (e.g. Aadhaar, Visiting Card, Passport Photo, PAN, Wedding Card, Bill Book)",
      hi: "सेवाएँ खोजें... (जैसे आधार, विजिटिंग कार्ड, पासपोर्ट फोटो, पैन कार्ड, शादी कार्ड, बिल बुक)",
    },
    filterAll: { en: "All Services", hi: "सभी सेवाएँ" },
    categoriesHeading: { en: "Categories", hi: "श्रेणियाँ" },
    noResultsTitle: { en: "No services found", hi: "कोई सेवा नहीं मिली" },
    noResultsSub: {
      en: "We couldn't find any service matching your query. Contact us for custom requirements!",
      hi: "आपकी खोज के अनुसार कोई सेवा नहीं मिली। कस्टम आवश्यकता के लिए हमसे सीधे संपर्क करें।",
    },
    customReqCta: { en: "Contact Us for Custom Requirement", hi: "कस्टम आवश्यकता के लिए संपर्क करें" },
    viewDetails: { en: "View Details →", hi: "विवरण देखें →" },
    resultsCount: { en: "services found", hi: "सेवाएँ उपलब्ध" },
  },
  serviceDetail: {
    overviewHeading: { en: "Service Overview", hi: "सेवा का परिचय" },
    optionsHeading: { en: "Available Options & Specifications", hi: "उपलब्ध विकल्प व विशेषताएँ" },
    processHeading: { en: "How It Works (Step-by-Step)", hi: "कार्य प्रक्रिया (चरणबद्ध)" },
    suitableHeading: { en: "Suitable For", hi: "किसके लिए उपयुक्त" },
    faqHeading: { en: "Frequently Asked Questions", hi: "अक्सर पूछे जाने वाले सवाल" },
    relatedHeading: { en: "Related Services", hi: "संबंधित सेवाएँ" },
    viewSamples: { en: "View Samples", hi: "सैंपल देखें" },
    needServiceHeading: { en: "Need This Service?", hi: "क्या आपको यह सेवा चाहिए?" },
    needServiceSub: {
      en: "Get in touch with us on WhatsApp, call directly, or submit a request online.",
      hi: "व्हाट्सएप पर संपर्क करें, सीधे कॉल करें या ऑनलाइन अनुरोध दर्ज करें।",
    },
    requestService: { en: "Request Service →", hi: "सेवा अनुरोध करें →" },
    callDirectly: { en: "Call Directly", hi: "सीधे कॉल करें" },
    whatsappChat: { en: "Chat on WhatsApp", hi: "व्हाट्सएप पर बात करें" },
    complianceNote: { en: "Important Legal & Compliance Notice", hi: "महत्वपूर्ण कानूनी सूचना" },
  },
  portfolioPage: {
    heading: { en: "Design Samples & Reference Portfolio", hi: "डिज़ाइन सैंपल व संदर्भ पोर्टफोलियो" },
    subheading: {
      en: "Browse design concepts, printing samples, stationery layouts, and document preparation references.",
      hi: "प्रिंटिंग डिज़ाइन, स्टेशनरी लेआउट, शादी कार्ड और डिजिटल सेवा संदर्भों के विभिन्न नमूने देखें।",
    },
    filterTabs: {
      all: { en: "All", hi: "सभी" },
      printing: { en: "Printing", hi: "प्रिंटिंग" },
      stationery: { en: "Stationery", hi: "स्टेशनरी" },
      wedding: { en: "Wedding & Cards", hi: "शादी व कार्ड्स" },
      business: { en: "Business", hi: "व्यावसायिक" },
      digital: { en: "Digital", hi: "डिजिटल" },
      design: { en: "Design", hi: "डिज़ाइन" },
    },
    sampleNotice: {
      en: "Important Notice: Images in this portfolio are representative design samples and reference mockups for demonstration. All customer printing and graphic design orders are uniquely customized based on individual specifications.",
      hi: "महत्वपूर्ण सूचना: इस पोर्टफोलियो में प्रदर्शित सभी चित्र केवल प्रदर्शन उद्देश्य हेतु संदर्भ व सैंपल डिज़ाइन हैं। ग्राहकों के सभी प्रिंटिंग और ग्राफिक डिज़ाइन ऑर्डर उनकी विशिष्ट आवश्यकतानुसार नए सिरे से तैयार किए जाते हैं।",
    },
    inquireSample: { en: "Inquire About This Design", hi: "इस डिज़ाइन के बारे में पूछें" },
    clickToEnlarge: { en: "Click to Enlarge", hi: "बड़ा करके देखें" },
    close: { en: "Close", hi: "बंद करें" },
    previous: { en: "Previous", hi: "पिछला" },
    next: { en: "Next", hi: "अगला" },
    noResults: { en: "No matching sample designs found.", hi: "कोई मिलता-जुलता सैंपल डिज़ाइन नहीं मिला।" },
  },
  gallery: {
    heading: { en: "Sample Designs & Reference Portfolio", hi: "सैंपल डिज़ाइन व संदर्भ पोर्टफोलियो" },
    sub: {
      en: "Explore examples of printing, stationery, and digital services we can help you create.",
      hi: "प्रिंटिंग, स्टेशनरी और ऑनलाइन सेवाओं के डिज़ाइन उदाहरण देखें जिन्हें हम आपके लिए तैयार कर सकते हैं।",
    },
    viewAll: { en: "View All Samples →", hi: "सभी सैंपल देखें →" },
    filterAll: { en: "All Samples", hi: "सभी सैंपल" },
    searchPlaceholder: { en: "Filter samples by name or type...", hi: "नाम या प्रकार द्वारा सैंपल खोजें..." },
    disclaimer: {
      en: "Note: Visuals shown above are reference sample designs for demonstration purposes. We customize every design according to your specific requirements.",
      hi: "नोट: ऊपर दिखाई गई तस्वीरें केवल प्रदर्शन उद्देश्य के लिए संदर्भ सैंपल डिज़ाइन हैं। हम आपकी आवश्यकतानुसार कस्टम डिज़ाइन बनाते हैं।",
    },
    inquireSample: { en: "Inquire About This Design", hi: "इस डिज़ाइन के बारे में पूछें" },
    close: { en: "Close", hi: "बंद करें" },
    previous: { en: "Previous", hi: "पिछला" },
    next: { en: "Next", hi: "अगला" },
    viewSamples: { en: "View Samples", hi: "सैंपल देखें" },
    noSamples: { en: "No matching sample designs found.", hi: "कोई मिलता-जुलता सैंपल डिज़ाइन नहीं मिला।" },
  },
};

Object.assign(translations, extendedTranslations);

