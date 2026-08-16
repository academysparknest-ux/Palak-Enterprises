export interface BusinessConfig {
  name: string;
  associatedName: string;
  tagline: {
    en: string;
    hi: string;
  };
  subtitle: {
    en: string;
    hi: string;
  };
  owner: {
    name: string;
    title: {
      en: string;
      hi: string;
    };
  };
  phoneNumbers: {
    primary: string;
    secondary: string;
    displayPrimary: string;
    displaySecondary: string;
  };
  whatsappNumber: string;
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
}

export const businessConfig: BusinessConfig = {
  name: "Palak Enterprises",
  associatedName: "Palak Printing Press",
  tagline: {
    en: "Printing & Digital Services, All in One Place",
    hi: "आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह",
  },
  subtitle: {
    en: "Professional printing, digital services and online assistance — simple, fast and reliable.",
    hi: "प्रोफेशनल प्रिंटिंग, डिजिटल सेवाएँ और ऑनलाइन कार्य — सरल, तेज़ और भरोसेमंद तरीके से।",
  },
  owner: {
    name: "Kumar Pankaj (Pankaj Kumar)",
    title: {
      en: "Proprietor",
      hi: "प्रोपराइटर",
    },
  },
  phoneNumbers: {
    primary: "9905238015",
    secondary: "7324964770",
    displayPrimary: "+91 99052 38015",
    displaySecondary: "+91 73249 64770",
  },
  whatsappNumber: "919905238015",
  address: {
    street: "Ward No. 7, Saniganj Mohalla",
    landmark: {
      en: "Near Block Gate",
      hi: "ब्लॉक गेट के पास",
    },
    city: "Chakia",
    district: "East Champaran",
    state: "Bihar",
    pincode: "845412",
    fullAddress: {
      en: "Ward No. 7, Saniganj Mohalla, Near Block Gate, Chakia, East Champaran, Bihar - 845412",
      hi: "वार्ड नं. 7, सनिगंज मोहल्ला, ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार - 845412",
    },
  },
  googleMapsUrl: "https://maps.google.com/?q=Chakia+East+Champaran+Bihar+Block+Gate",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14300.0!2d85.04!3d26.42!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed45b9b8b8b8b8%3A0x0!2zQ2hha2lhLCBCaWhhciA4NDU0MTI!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
  openingHours: {
    en: "Monday - Saturday: 8:00 AM - 8:00 PM | Sunday: 9:00 AM - 5:00 PM",
    hi: "सोमवार - शनिवार: सुबह 8:00 से शाम 8:00 बजे | रविवार: सुबह 9:00 से शाम 5:00 बजे",
  },
};

export const business = {
  name: "Palak Enterprises",
  unit: "Palak Printing Press",
  tagline: {
    en: "Online Service Center",
    hi: "ऑनलाइन सेवा केंद्र",
  },
  owner: {
    en: "Pankaj Kumar",
    hi: "प्रो. कुमार पंकज",
  },
  phones: ["9905238015", "7324964770"],
  primaryPhone: "9905238015",
  whatsappNumber: "919905238015",
  address: {
    line1: {
      en: "Ward No. 7, Raniganj Mohalla",
      hi: "वार्ड नं. 7, रानीगंज मोहल्ला",
    },
    landmark: {
      en: "Near Block Gate",
      hi: "नियर ब्लॉक गेट",
    },
    city: {
      en: "Chakia, East Champaran, Bihar – 845412",
      hi: "चकिया, पूर्वी चंपारण, बिहार – 845412",
    },
  },
  registrations: {
    cscId: "634165120013",
    udyamNo: "UDYAM-BR-11-0061705",
  },
  mapsQuery: "Palak Enterprises Palak Printing Press Chakia East Champaran Bihar 845412",
  social: {
    facebook: "",
    instagram: "",
  },
  logoPath: "/logo.webp",
} as const;

export function getWhatsAppLink(prefilledMessage?: string) {
  const base = `https://wa.me/${business.whatsappNumber}`;
  if (!prefilledMessage) return base;
  return `${base}?text=${encodeURIComponent(prefilledMessage)}`;
}

export function getCallLink(phone: string = business.primaryPhone) {
  return `tel:+91${phone}`;
}

export function getDirectionsLink() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    business.mapsQuery
  )}`;
}
