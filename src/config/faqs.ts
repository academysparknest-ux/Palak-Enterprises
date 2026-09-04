export interface FAQItem {
  id: string;
  category: "printing" | "online-services" | "documents" | "orders" | "website-dev" | "contact";
  question: {
    en: string;
    hi: string;
  };
  answer: {
    en: string;
    hi: string;
  };
}

export const faqCategories = [
  { id: "all", label: { en: "All Questions", hi: "सभी प्रश्न" } },
  { id: "printing", label: { en: "Printing & Press", hi: "प्रिंटिंग व प्रेस" } },
  { id: "online-services", label: { en: "Online Services", hi: "ऑनलाइन सेवाएँ" } },
  { id: "documents", label: { en: "Documents & ID", hi: "दस्तावेज़ व पहचान पत्र" } },
  { id: "orders", label: { en: "Orders & Delivery", hi: "ऑर्डर व डिलीवरी" } },
  { id: "website-dev", label: { en: "Website Development", hi: "वेबसाइट निर्माण" } },
  { id: "contact", label: { en: "Location & Timings", hi: "स्थान व समय" } },
];

export const faqData: FAQItem[] = [
  {
    id: "faq-services",
    category: "printing",
    question: {
      en: "What main services are provided at Palak Enterprises?",
      hi: "पालक इंटरप्राइजेज पर मुख्य रूप से कौन-कौन सी सेवाएँ उपलब्ध हैं?",
    },
    answer: {
      en: "We provide complete document photocopy, black & white & color printing, 5-minute instant passport photos, lamination, PVC ID card printing, wedding & invitation cards, business visiting cards, flex banners, online job application guidance, certificate assistance (caste, income, residence), pension schemes guidance, and business website development.",
      hi: "हम फोटोकॉपी, सादा व रंगीन प्रिंटिंग, 5 मिनट में पासपोर्ट फोटो, लैमिनेशन, पीवीसी आईडी कार्ड, शादी-तिलक निमंत्रण कार्ड, विजिटिंग कार्ड, फ्लेक्स बैनर, ऑनलाइन फॉर्म मार्गदर्शन, जाति-आय-निवास फॉर्म सहायता, पेंशन योजना मार्गदर्शन एवं वेबसाइट निर्माण की सुविधा प्रदान करते हैं।",
    },
  },
  {
    id: "faq-documents-whatsapp",
    category: "orders",
    question: {
      en: "Can I send my documents on WhatsApp for printing before visiting?",
      hi: "क्या मैं आने से पहले प्रिंटिंग के लिए दस्तावेज व्हाट्सएप पर भेज सकता हूँ?",
    },
    answer: {
      en: "Yes! You can send your PDF or image files on our official WhatsApp number (+91 99052 38015) along with quantity details. We will keep your prints ready for quick collection.",
      hi: "हाँ! आप अपने पीडीएफ या फोटो दस्तावेज हमारे व्हाट्सएप नंबर (+91 99052 38015) पर संख्या विवरण के साथ भेज सकते हैं। हम आपका प्रिंट तैयार रखेंगे ताकि आपको इंतजार न करना पड़े।",
    },
  },
  {
    id: "faq-location",
    category: "contact",
    question: {
      en: "Where is Palak Printing Press located in Chakia?",
      hi: "पालक प्रिंटिंग प्रेस चकिया में कहाँ स्थित है?",
    },
    answer: {
      en: "Our center is located near Block Gate, Chakia, East Champaran, Bihar. It is conveniently accessible from main roads and government block offices.",
      hi: "हमारा केंद्र ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार में स्थित है। यह ब्लॉक ऑफिस और मुख्य मार्ग के बिल्कुल निकट है।",
    },
  },
  {
    id: "faq-government-form",
    category: "online-services",
    question: {
      en: "Do you assist with government scheme applications and forms?",
      hi: "क्या आप सरकारी योजनाओं और फॉर्म भरने में सहायता करते हैं?",
    },
    answer: {
      en: "Yes, we assist citizens and students in filling online applications for jobs, examinations, certificates (RTPS), e-Shram cards, PM Kisan e-KYC, and pension schemes. Please note that we act as an application assistance service, and final approval rests with government departments.",
      hi: "हाँ, हम छात्रों और नागरिकों को नौकरी फॉर्म, परीक्षा एडमिट कार्ड, जाति-आय-निवास (RTPS), ई-श्रम, पीएम किसान ई-केवाईसी एवं पेंशन आवेदन भरने में सहायता प्रदान करते हैं। कृपया ध्यान दें कि हम आवेदन सहायता केंद्र हैं और अंतिम निर्णय संबंधित विभाग का होता है।",
    },
  },
  {
    id: "faq-passport-photo-time",
    category: "documents",
    question: {
      en: "How long does it take to get instant passport photos?",
      hi: "पासपोर्ट फोटो बनने में कितना समय लगता है?",
    },
    answer: {
      en: "We offer instant passport photos in just 5 minutes. We also provide background cleanup and professional dress correction if required.",
      hi: "पासपोर्ट फोटो मात्र 5 मिनट में तैयार करके दे दी जाती है। आवश्यकतानुसार बैकग्राउंड सुधार और ड्रेस सही करने की सुविधा भी उपलब्ध है।",
    },
  },
  {
    id: "faq-visiting-cards",
    category: "printing",
    question: {
      en: "What types of visiting cards and business stationery do you print?",
      hi: "आप किस प्रकार के विजिटिंग कार्ड और बिजनेस स्टेशनरी प्रिंट करते हैं?",
    },
    answer: {
      en: "We print Matte finish, Glossy finish, Velvet touch, and Spot UV business visiting cards. In addition, we design and print customized bill books, cash memos, letterheads, envelopes, pamphlets, and large outdoor flex banners.",
      hi: "हम मैट, ग्लॉसी, वेलवेट टच एवं स्पॉट यूवी विजिटिंग कार्ड प्रिंट करते हैं। इसके अलावा बिल बुक, रसीद बही, लेटरपैड, लिफाफे, पम्पलेट और बड़े आउटडोर फ्लेक्स बैनर भी तैयार करते हैं।",
    },
  },
  {
    id: "faq-rtps-certificates",
    category: "online-services",
    question: {
      en: "How long does it take for Caste, Income, or Residence certificates (RTPS)?",
      hi: "जाति, आय या निवास प्रमाण पत्र बनने में कितना समय लगता है?",
    },
    answer: {
      en: "We submit the online application immediately on the Bihar RTPS portal and hand over the official acknowledgment receipt. The official processing typically takes 10 to 14 working days as per government rules. We also assist in tracking status and downloading the verified certificate.",
      hi: "हम बिहार आरटीपीएस पोर्टल पर तुरंत आवेदन भरकर रसीद सौंप देते हैं। सरकारी नियमानुसार प्रमाणपत्र 10 से 14 कार्य दिवसों में निर्गत होता है। हम स्टेटस ट्रैकिंग और प्रमाणपत्र डाउनलोड में भी सहायता करते हैं।",
    },
  },
  {
    id: "faq-pvc-id",
    category: "documents",
    question: {
      en: "Do you make durable PVC plastic cards for Aadhaar, Ayushman, and student IDs?",
      hi: "क्या आप आधार, आयुष्मान और स्टूडेंट कार्ड के लिए मजबूत पीवीसी कार्ड बनाते हैं?",
    },
    answer: {
      en: "Yes, we produce high-grade waterproof and scratch-resistant PVC smart cards for Aadhaar print, Ayushman Bharat health cards, e-Shram cards, and custom student/employee identity cards.",
      hi: "हाँ, हम आधार प्रिंट, आयुष्मान भारत कार्ड, ई-श्रम और स्कूल/संस्थान आईडी कार्ड के लिए वाटरप्रूफ और टिकाऊ पीवीसी स्मार्ट कार्ड प्रिंट करते हैं।",
    },
  },
  {
    id: "faq-website-development",
    category: "website-dev",
    question: {
      en: "How can I get a website built for my shop, school, or coaching center?",
      hi: "अपनी दुकान, स्कूल या कोचिंग के लिए वेबसाइट कैसे बनवा सकते हैं?",
    },
    answer: {
      en: "You can visit our center or call us at 9905238015 to discuss your requirements. We build clean, modern, bilingual mobile-friendly websites with WhatsApp and Google Maps integration tailored for local businesses.",
      hi: "आप हमारे केंद्र पर आ सकते हैं या 9905238015 पर संपर्क कर सकते हैं। हम आपकी आवश्यकता अनुसार सुंदर, मोबाइल-फ्रेंडली, हिंदी-अंग्रेजी द्विभाषी वेबसाइट तैयार करते हैं।",
    },
  },
  {
    id: "faq-timings",
    category: "contact",
    question: {
      en: "What are your business working hours?",
      hi: "पालक इंटरप्राइजेज के खुलने और बंद होने का समय क्या है?",
    },
    answer: {
      en: "Our center is open Monday to Saturday from 8:00 AM to 8:00 PM, and on Sundays from 9:00 AM to 5:00 PM. Emergency online form submissions can also be coordinated via WhatsApp.",
      hi: "हमारा केंद्र सोमवार से शनिवार सुबह 8:00 बजे से शाम 8:00 बजे तक और रविवार को सुबह 9:00 बजे से शाम 5:00 बजे तक खुला रहता है। आवश्यक ऑनलाइन फॉर्म के लिए व्हाट्सएप पर भी संपर्क किया जा सकता है।",
    },
  },
];
