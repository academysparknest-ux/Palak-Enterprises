export interface FAQItem {
  id: string;
  question: {
    en: string;
    hi: string;
  };
  answer: {
    en: string;
    hi: string;
  };
}

export const faqData: FAQItem[] = [
  {
    id: "faq-services",
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
    question: {
      en: "Where is Palak Printing Press located in Chakia?",
      hi: "पालक प्रिंटिंग प्रेस चकिया में कहाँ स्थित है?",
    },
    answer: {
      en: "Our center is located at Ward No. 7, Saniganj Mohalla, Near Block Gate, Chakia, East Champaran, Bihar. It is conveniently accessible from main roads and government block offices.",
      hi: "हमारा केंद्र वार्ड नं. 7, सनिगंज मोहल्ला, ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार में स्थित है। यह ब्लॉक ऑफिस और मुख्य मार्ग के बिल्कुल निकट है।",
    },
  },
  {
    id: "faq-government-form",
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
    id: "faq-website-development",
    question: {
      en: "How can I get a website built for my shop, school, or coaching center?",
      hi: "अपनी दुकान, स्कूल या कोचिंग के लिए वेबसाइट कैसे बनवा सकते हैं?",
    },
    answer: {
      en: "You can visit our center or call us at 9905238015 to discuss your requirements. We build clean, modern, bilingual mobile-friendly websites with WhatsApp and Google Maps integration tailored for local businesses.",
      hi: "आप हमारे केंद्र पर आ सकते हैं या 9905238015 पर संपर्क कर सकते हैं। हम आपकी आवश्यकता अनुसार सुंदर, मोबाइल-फ्रेंडली, हिंदी-अंग्रेजी द्विभाषी वेबसाइट तैयार करते हैं।",
    },
  },
];
