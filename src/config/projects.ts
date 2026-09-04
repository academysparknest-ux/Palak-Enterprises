export interface WebsiteProject {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  category: {
    en: string;
    hi: string;
  };
  description: {
    en: string;
    hi: string;
  };
  image: string;
  technologies: string[];
  url: string;
  displayUrl: string;
  featured?: boolean;
  highlightBadge?: {
    en: string;
    hi: string;
  };
  keyHighlights: {
    en: string;
    hi: string;
  }[];
}

export const websiteProjects: WebsiteProject[] = [
  {
    id: "roshani-public-school",
    name: {
      en: "Roshani Public School Portal",
      hi: "रोशनी पब्लिक स्कूल पोर्टल",
    },
    category: {
      en: "CBSE Premier School Platform",
      hi: "सीबीएसई मान्यता प्राप्त स्कूल प्लेटफॉर्म",
    },
    description: {
      en: "Official modern digital portal for East Champaran's premier CBSE school featuring online admissions, faculty directories, academic prospectus, dynamic notice boards, and student activity showcases.",
      hi: "पूर्वी चंपारण (तुरकौलिया) के प्रमुख सीबीएसई स्कूल का आधिकारिक आधुनिक वेब पोर्टल — ऑनलाइन एडमिशन फॉर्म, संकाय विवरण, नोटिस बोर्ड एवं छात्र गतिविधियों का ऑनलाइन प्रदर्शन।",
    },
    image: "/projects/roshani-public-school.png",
    technologies: ["HTML5", "CSS3 / Modern UI", "JavaScript", "React", "Vercel"],
    url: "https://roshani-public-school.vercel.app/",
    displayUrl: "roshani-public-school.vercel.app",
    featured: true,
    highlightBadge: {
      en: "Live School Portal",
      hi: "लाइव स्कूल पोर्टल",
    },
    keyHighlights: [
      { en: "Nursery to 12th Admission System", hi: "नर्सरी से 12वीं तक एडमिशन सिस्टम" },
      { en: "Smart Labs & Facilities Showcase", hi: "स्मार्ट लैब्स एवं इन्फ्रास्ट्रक्चर प्रदर्शन" },
      { en: "CBSE Curriculum & Notices", hi: "सीबीएसई पाठ्यक्रम एवं त्वरित सूचनाएं" },
    ],
  },
  {
    id: "roshani-public-school-erp",
    name: {
      en: "Roshani Public School ERP",
      hi: "रोशनी पब्लिक स्कूल ईआरपी सिस्टम",
    },
    category: {
      en: "Cloud School Management ERP",
      hi: "क्लाउड स्कूल मैनेजमेंट ईआरपी",
    },
    description: {
      en: "Enterprise-grade cloud school management system with role-based secure access for Admins, Principals, Teachers, Accountants, Parents, and Students covering fee collections, attendance tracking, and exam report cards.",
      hi: "एंटरप्राइज-ग्रेड क्लाउड स्कूल मैनेजमेंट सिस्टम — एडमिन, प्रिंसिपल, शिक्षक, अकाउंटेंट, अभिभावक और छात्रों के लिए अलग लॉगिन, ऑनलाइन फीस, उपस्थिति एवं रिपोर्ट कार्ड।",
    },
    image: "/projects/roshani-public-school-erp.png",
    technologies: ["Next.js 15", "React 19", "Tailwind CSS", "TypeScript", "Role-Based Auth"],
    url: "https://roshani-public-school-erp.vercel.app/login",
    displayUrl: "roshani-public-school-erp.vercel.app",
    featured: true,
    highlightBadge: {
      en: "Enterprise ERP System",
      hi: "एंटरप्राइज ईआरपी सिस्टम",
    },
    keyHighlights: [
      { en: "6 Role-Based Portals (Admin/Parent/Teacher)", hi: "6 अलग रोल-आधारित पोर्टल" },
      { en: "Automated Fee Invoicing & Tracking", hi: "ऑटोमेटेड फीस रसीद व हिसाब" },
      { en: "Examinations & Grading Management", hi: "परीक्षा एवं डिजिटल रिपोर्ट कार्ड" },
    ],
  },
  {
    id: "ekaagra-technologies",
    name: {
      en: "Ekaagra Technologies",
      hi: "एकाग्र टेक्नोलॉजीज",
    },
    category: {
      en: "Digital Product & Software Studio",
      hi: "डिजिटल प्रोडक्ट एवं सॉफ्टवेयर स्टूडियो",
    },
    description: {
      en: "Independent digital product studio platform showcasing production-grade software engineering, custom web applications, high-performance web platforms, and Android development capabilities.",
      hi: "स्वतंत्र डिजिटल प्रोडक्ट स्टूडियो — कस्टम वेब एप्लीकेशन, सॉफ्टवेयर इंजीनियरिंग, मोबाइल-फर्स्ट वेब प्लेटफॉर्म एवं हाई-परफॉरमेंस डिजिटल समाधान।",
    },
    image: "/projects/ekaagra-technologies.png",
    technologies: ["Next.js 16", "React 19", "Tailwind CSS", "TypeScript", "Node.js", "Vercel"],
    url: "https://www.ekaagratechnologies.site/",
    displayUrl: "ekaagratechnologies.site",
    featured: false,
    highlightBadge: {
      en: "Software Studio",
      hi: "सॉफ्टवेयर स्टूडियो",
    },
    keyHighlights: [
      { en: "99/100 Lighthouse Performance Score", hi: "99/100 लाइटहाउस परफॉरमेंस स्कोर" },
      { en: "High-Impact Modern Tech Stack", hi: "आधुनिक रिएक्ट व नेक्स्ट.जेएस आर्किटेक्चर" },
      { en: "Custom Web & App Engineering", hi: "कस्टम वेब व एंड्रॉइड डेवलपमेंट" },
    ],
  },
  {
    id: "palak-enterprises-platform",
    name: {
      en: "Palak Enterprises Digital Platform",
      hi: "पालक इंटरप्राइजेज डिजिटल प्लेटफॉर्म",
    },
    category: {
      en: "Printing Press & CSC Citizen Portal",
      hi: "प्रिंटिंग प्रेस एवं सीएससी सिटिज़न पोर्टल",
    },
    description: {
      en: "Full-stack bilingual web storefront with live price calculation, drag-and-drop file uploads, dual-mode order timeline tracking, local payment options, and shop administration dashboard.",
      hi: "द्विभाषी वेब स्टोरफ्रंट — लाइव मूल्य गणना, दस्तावेज़ व डिज़ाइन अपलोड, रियल-टाइम ऑर्डर ट्रैकिंग, यूपीआई पेमेंट एवं ग्राहक पोर्टल।",
    },
    image: "/projects/palak-enterprises.png",
    technologies: ["React 19", "TypeScript", "Tailwind CSS", "Supabase Realtime", "Vite"],
    url: "https://www.palakenterprises.shop/",
    displayUrl: "palakenterprises.shop",
    featured: false,
    highlightBadge: {
      en: "Live E-Commerce Store",
      hi: "लाइव ई-कॉमर्स स्टोर",
    },
    keyHighlights: [
      { en: "Realtime Bilingual Switcher (Hindi/English)", hi: "रियल-टाइम द्विभाषी अनुभव (हिंदी/अंग्रेज़ी)" },
      { en: "Instant Price & Paper GSM Configurator", hi: "इंस्टेंट प्रिंटिंग मूल्य कैलकुलेटर" },
      { en: "Priority vs Normal Print Queue Tracking", hi: "प्राथमिकता प्रिंटिंग व ट्रैकिंग" },
    ],
  },
];
