export interface BusinessConfig {
  name: {
    en: string;
    hi: string;
  };
  associatedName: {
    en: string;
    hi: string;
  };
  tagline: {
    en: string;
    hi: string;
  };
  subtitle: {
    en: string;
    hi: string;
  };
  owner: {
    name: {
      en: string;
      hi: string;
    };
    title: {
      en: string;
      hi: string;
    };
    signatureUrl?: string;
  };
  phoneNumbers: {
    primary: string;
    secondary: string;
    displayPrimary: string;
    displaySecondary: string;
  };
  whatsappNumber: string;
  upiId?: string;
  address: {
    street: string;
    landmark: {
      en: string;
      hi: string;
    };
    city: string;
    district: string;
    state: string;
    pincode: string;
    fullAddress: {
      en: string;
      hi: string;
    };
  };
  googleMapsUrl: string;
  mapEmbedUrl: string;
  openingHours: {
    en: string;
    hi: string;
  };
  registrations?: {
    cscId: string;
    udyamNo: string;
    gstin: string;
    gstNo: string;
  };
}

export const BUSINESS_GST_NUMBER = "10AVUPP3470E1ZK";
export const BUSINESS_GST_DISPLAY = "GST No. 10AVUPP3470E1ZK";

export const businessLocation = "Near Block Gate, Chakia, East Champaran, Bihar - 845412";
export const businessLocationHi = "ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार - 845412";

export const OWNER_SIGNATURE_ONLINE_URL =
  "https://zofddiuswdtbqvqycezy.supabase.co/storage/v1/object/public/business-assets/signatures/owner_signature.png";
export const OWNER_SIGNATURE_LOCAL_URL = "/signatures/owner_signature.png";

export const businessConfig: BusinessConfig = {
  name: {
    en: "Palak Enterprises",
    hi: "पालक इंटरप्राइजेज",
  },
  associatedName: {
    en: "Palak Printing Press",
    hi: "पालक प्रिंटिंग प्रेस",
  },
  tagline: {
    en: "Printing & Digital Services, All in One Place",
    hi: "आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह",
  },
  subtitle: {
    en: "Professional printing, digital services and online assistance — simple, fast and reliable.",
    hi: "प्रोफेशनल प्रिंटिंग, डिजिटल सेवाएँ और ऑनलाइन कार्य — सरल, तेज़ और भरोसेमंद तरीके से।",
  },
  owner: {
    name: {
      en: "Kumar Pankaj",
      hi: "कुमार पंकज",
    },
    title: {
      en: "Proprietor",
      hi: "प्रोपराइटर",
    },
    signatureUrl: OWNER_SIGNATURE_ONLINE_URL,
  },
  phoneNumbers: {
    primary: "9905238015",
    secondary: "7324964770",
    displayPrimary: "+91 99052 38015",
    displaySecondary: "+91 73249 64770",
  },
  whatsappNumber: "919905238015",
  upiId: "9905238015@okbizaxis",
  address: {
    street: "Near Block Gate",
    landmark: {
      en: "Near Block Gate",
      hi: "ब्लॉक गेट के पास",
    },
    city: "Chakia",
    district: "East Champaran",
    state: "Bihar",
    pincode: "845412",
    fullAddress: {
      en: "Near Block Gate, Chakia, East Champaran, Bihar - 845412",
      hi: "ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार - 845412",
    },
  },
  googleMapsUrl: "https://goo.gl/maps/UjhUTivNEjdN9Est7",
  mapEmbedUrl: "https://www.google.com/maps?q=26.413807,85.052013&z=17&output=embed",
  openingHours: {
    en: "Monday - Saturday: 8:00 AM - 8:00 PM | Sunday: 9:00 AM - 5:00 PM",
    hi: "सोमवार - शनिवार: सुबह 8:00 से शाम 8:00 बजे | रविवार: सुबह 9:00 से शाम 5:00 बजे",
  },
  registrations: {
    cscId: "634165120013",
    udyamNo: "UDYAM-BR-11-0061705",
    gstin: BUSINESS_GST_NUMBER,
    gstNo: BUSINESS_GST_NUMBER,
  },
};

export interface BusinessInfo {
  name: { en: string; hi: string };
  unit: { en: string; hi: string };
  tagline: { en: string; hi: string };
  owner: { en: string; hi: string };
  phones: string[];
  primaryPhone: string;
  whatsappNumber: string;
  upiId?: string;
  address: {
    line1: { en: string; hi: string };
    landmark: { en: string; hi: string };
    city: { en: string; hi: string };
  };
  registrations: {
    cscId: string;
    udyamNo: string;
    gstin: string;
    gstNo: string;
  };
  mapsQuery: string;
  googleMapsUrl: string;
  mapEmbedUrl: string;
  social: {
    facebook: string;
    instagram: string;
  };
  logoPath: string;
  signaturePath?: string;
}

export const business: BusinessInfo = {
  name: {
    en: "Palak Enterprises",
    hi: "पालक इंटरप्राइजेज",
  },
  unit: {
    en: "Palak Printing Press",
    hi: "पालक प्रिंटिंग प्रेस",
  },
  tagline: {
    en: "Online Service Center",
    hi: "ऑनलाइन सेवा केंद्र",
  },
  owner: {
    en: "Kumar Pankaj",
    hi: "कुमार पंकज",
  },
  phones: ["9905238015", "7324964770"],
  primaryPhone: "9905238015",
  whatsappNumber: "919905238015",
  upiId: "9905238015@okbizaxis",
  address: {
    line1: {
      en: "Near Block Gate",
      hi: "ब्लॉक गेट के पास",
    },
    landmark: {
      en: "Near Block Gate",
      hi: "ब्लॉक गेट के पास",
    },
    city: {
      en: "Chakia, East Champaran, Bihar - 845412",
      hi: "चकिया, पूर्वी चंपारण, बिहार - 845412",
    },
  },
  registrations: {
    cscId: "634165120013",
    udyamNo: "UDYAM-BR-11-0061705",
    gstin: BUSINESS_GST_NUMBER,
    gstNo: BUSINESS_GST_NUMBER,
  },
  mapsQuery: "Palak Enterprises, Near Block Gate, Chakia, East Champaran, Bihar - 845412",
  googleMapsUrl: "https://goo.gl/maps/UjhUTivNEjdN9Est7",
  mapEmbedUrl: "https://www.google.com/maps?q=26.413807,85.052013&z=17&output=embed",
  social: {
    facebook: "",
    instagram: "",
  },
  logoPath: "/logo.webp",
  signaturePath: OWNER_SIGNATURE_ONLINE_URL,
};

export function getWhatsAppLink(prefilledMessage?: string) {
  const base = `https://wa.me/${business.whatsappNumber}`;
  if (!prefilledMessage) return base;
  return `${base}?text=${encodeURIComponent(prefilledMessage)}`;
}

export function getCallLink(phone: string = business.primaryPhone) {
  return `tel:+91${phone}`;
}

export function getDirectionsLink() {
  return business.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    business.mapsQuery
  )}`;
}
