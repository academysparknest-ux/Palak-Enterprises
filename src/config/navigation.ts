export interface NavLink {
  path: string;
  labelKey: "home" | "services" | "printing" | "onlineServices" | "businessSolutions" | "work" | "about" | "contact" | "faq" | "request";
  children?: {
    path: string;
    labelKey: string;
    name: { en: string; hi: string };
    desc?: { en: string; hi: string };
  }[];
}

export const primaryNavLinks: NavLink[] = [
  { path: "/", labelKey: "home" },
  {
    path: "/services",
    labelKey: "services",
    children: [
      {
        path: "/services",
        labelKey: "allServices",
        name: { en: "All Services Directory", hi: "संपूर्ण सेवा सूची" },
        desc: { en: "Browse all available services", hi: "सभी सेवाएँ देखें" },
      },
      {
        path: "/printing",
        labelKey: "printing",
        name: { en: "Printing & Press", hi: "प्रिंटिंग एवं प्रेस" },
        desc: { en: "Documents, cards, flex & banners", hi: "दस्तावेज़, कार्ड, फ्लेक्स और बैनर" },
      },
      {
        path: "/online-services",
        labelKey: "onlineServices",
        name: { en: "Online & Govt Services", hi: "ऑनलाइन व सरकारी सेवाएँ" },
        desc: { en: "Forms, certificates, schemes & pensions", hi: "फॉर्म, प्रमाण पत्र, योजनाएँ व पेंशन" },
      },
      {
        path: "/business",
        labelKey: "businessSolutions",
        name: { en: "Business Solutions", hi: "व्यावसायिक समाधान" },
        desc: { en: "Branding, bill books, visiting cards & websites", hi: "ब्रांडिंग, बिल बुक, विजिटिंग कार्ड व वेबसाइट" },
      },
      {
        path: "/website-development",
        labelKey: "websiteDev",
        name: { en: "Website Development", hi: "वेबसाइट डेवलपमेंट" },
        desc: { en: "For schools, coaching & shops", hi: "स्कूल, कोचिंग और दुकानों के लिए" },
      },
    ],
  },
  { path: "/printing", labelKey: "printing" },
  { path: "/online-services", labelKey: "onlineServices" },
  { path: "/business", labelKey: "businessSolutions" },
  { path: "/work", labelKey: "work" },
  { path: "/about", labelKey: "about" },
  { path: "/contact", labelKey: "contact" },
];

export const secondaryNavLinks = [
  { path: "/faq", labelKey: "faq" },
  { path: "/request", labelKey: "request" },
];
