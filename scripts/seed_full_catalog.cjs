const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function runSeed() {
  const client = new Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  await client.connect();
  console.log('Connected to PostgreSQL for seeding.');

  // 1. Seed Categories
  const categories = [
    {
      id: "printing-products",
      slug: "printing-products",
      name_en: "Printing & Press",
      name_hi: "प्रिंटिंग एवं प्रेस",
      description_en: "Visiting cards, letterheads, flex banners, pamphlets, photo prints & packaging.",
      description_hi: "विजिटिंग कार्ड, लेटरहेड, फ्लेक्स बैनर, पम्पलेट, फोटो प्रिंट व पैकेजिंग।",
      icon_name: "Printer",
      category_type: "printing",
      badge_en: "Popular",
      badge_hi: "लोकप्रिय",
      sort_order: 1,
      is_active: true
    },
    {
      id: "digital-services",
      slug: "digital-services",
      name_en: "Online & Digital Services",
      name_hi: "डिजिटल एवं ऑनलाइन सेवाएँ",
      description_en: "PAN cards, RTPS certificates, exam forms, pensions, Aadhaar print & CSC assistance.",
      description_hi: "पैन कार्ड, आरटीपीएस प्रमाणपत्र, परीक्षा फॉर्म, पेंशन, आधार प्रिंट व सीएससी सहायता।",
      icon_name: "Globe",
      category_type: "digital",
      badge_en: "Govt & CSC",
      badge_hi: "सरकारी व सीएससी",
      sort_order: 2,
      is_active: true
    },
    {
      id: "business-solutions",
      slug: "business-solutions",
      name_en: "Business Solutions",
      name_hi: "व्यावसायिक समाधान",
      description_en: "Complete office stationery, shop branding, bill books, school kits & custom web dev.",
      description_hi: "ऑफिस स्टेशनरी, दुकान ब्रांडिंग, बिल बुक, स्कूल किट एवं कस्टम वेब डेवलपमेंट।",
      icon_name: "Briefcase",
      category_type: "business",
      badge_en: "B2B / Bulk",
      badge_hi: "थोक प्रिंटिंग",
      sort_order: 3,
      is_active: true
    },
    {
      id: "wedding-events",
      slug: "wedding-events",
      name_en: "Wedding & Ceremonies",
      name_hi: "शादी एवं मांगलिक कार्ड",
      description_en: "Custom invitation cards for weddings, Tilak, Mundan, birthdays & special occasions.",
      description_hi: "शादी, तिलक, मुंडन, जन्मदिन व मांगलिक आयोजनों के सुंदर निमंत्रण कार्ड।",
      icon_name: "Sparkles",
      category_type: "wedding",
      badge_en: "Celebrations",
      badge_hi: "मांगलिक कार्य",
      sort_order: 4,
      is_active: true
    }
  ];

  for (const c of categories) {
    await client.query(`
      INSERT INTO public.categories (id, slug, name_en, name_hi, description_en, description_hi, icon_name, category_type, badge_en, badge_hi, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_hi = EXCLUDED.name_hi,
        description_en = EXCLUDED.description_en,
        description_hi = EXCLUDED.description_hi,
        icon_name = EXCLUDED.icon_name,
        category_type = EXCLUDED.category_type,
        sort_order = EXCLUDED.sort_order;
    `, [c.id, c.slug, c.name_en, c.name_hi, c.description_en, c.description_hi, c.icon_name, c.category_type, c.badge_en, c.badge_hi, c.sort_order, c.is_active]);
  }
  console.log('Categories seeded.');

  // 2. Seed Sample Products
  const products = [
    {
      id: "visiting-cards",
      slug: "visiting-cards",
      category_id: "printing-products",
      name_en: "Premium Visiting Cards",
      name_hi: "प्रीमियम विजिटिंग कार्ड",
      short_desc_en: "High-grade 300-350 GSM business cards with Matte, Gloss or Velvet Spot-UV finish.",
      short_desc_hi: "मैट, ग्लॉस या वेलवेट स्पॉट-यूवी फिनिश में 300-350 जीएसएम कार्ड।",
      description_en: "Make an unforgettable first impression with our professional business visiting cards.",
      description_hi: "हमारे पेशेवर विजिटिंग कार्ड के साथ एक शानदार प्रभाव बनाएं।",
      starting_price: 199,
      base_quantity: 100,
      unit: "Cards",
      image_url: "/images/gallery/visiting-cards-sample.svg",
      gallery_urls: ["/images/gallery/visiting-cards-sample.svg"],
      is_featured: true,
      is_popular: true,
      turnaround_time_en: "Same Day / 24 Hours",
      turnaround_time_hi: "उसी दिन / 24 घंटे",
      tags: ["visiting card", "business card", "विजिटिंग कार्ड"]
    },
    {
      id: "flex-banners",
      slug: "flex-banners",
      category_id: "printing-products",
      name_en: "Heavy-Duty Flex Banners & Hoardings",
      name_hi: "मजबूत फ्लेक्स बैनर एवं होर्डिंग्स",
      short_desc_en: "Weatherproof 320-440 GSM flex printing with metal eyelets for shop boards & promotions.",
      short_desc_hi: "दुकान बोर्ड और प्रचार के लिए मेटल रिंग युक्त वेदरप्रूफ 320-440 जीएसएम फ्लेक्स प्रिंटिंग।",
      description_en: "Durable, high-visibility all-weather flex banners for shopfronts and promotions.",
      description_hi: "दुकानों और आयोजनों के लिए टिकाऊ और स्पष्ट फ्लेक्स बैनर।",
      starting_price: 240,
      base_quantity: 1,
      unit: "Banner",
      image_url: "/images/gallery/flex-banner-sample.svg",
      gallery_urls: ["/images/gallery/flex-banner-sample.svg"],
      is_featured: true,
      is_popular: true,
      turnaround_time_en: "4-8 Hours",
      turnaround_time_hi: "4-8 घंटे",
      tags: ["flex", "banner", "hoarding", "फ्लेक्स"]
    },
    {
      id: "letterheads-stationery",
      slug: "letterheads-stationery",
      category_id: "business-solutions",
      name_en: "Corporate Letterheads & Envelopes",
      name_hi: "कॉरपोरेट लेटरहेड एवं लिफाफे",
      short_desc_en: "Executive bond paper letterheads for official business documentation and bills.",
      short_desc_hi: "आधिकारिक व्यावसायिक उपयोग के लिए प्रीमियम बॉन्ड पेपर लेटरहेड।",
      description_en: "Print official letterheads on fine textured executive bond sheets.",
      description_hi: "फाइन टेक्सचर्ड एग्जीक्यूटिव बॉन्ड शीट पर आधिकारिक लेटरहेड प्रिंट करें।",
      starting_price: 350,
      base_quantity: 100,
      unit: "Sheets",
      image_url: "/images/gallery/letterhead-envelope-sample.svg",
      gallery_urls: ["/images/gallery/letterhead-envelope-sample.svg"],
      is_featured: false,
      is_popular: true,
      turnaround_time_en: "24-48 Hours",
      turnaround_time_hi: "24-48 घंटे",
      tags: ["letterhead", "stationery", "लेटरहेड"]
    }
  ];

  for (const p of products) {
    await client.query(`
      INSERT INTO public.products (id, slug, category_id, name_en, name_hi, short_desc_en, short_desc_hi, description_en, description_hi, starting_price, base_quantity, unit, image_url, gallery_urls, is_featured, is_popular, turnaround_time_en, turnaround_time_hi, tags, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true)
      ON CONFLICT (id) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_hi = EXCLUDED.name_hi,
        starting_price = EXCLUDED.starting_price;
    `, [p.id, p.slug, p.category_id, p.name_en, p.name_hi, p.short_desc_en, p.short_desc_hi, p.description_en, p.description_hi, p.starting_price, p.base_quantity, p.unit, p.image_url, p.gallery_urls, p.is_featured, p.is_popular, p.turnaround_time_en, p.turnaround_time_hi, p.tags]);
  }
  console.log('Products seeded.');

  // 3. Seed Sample Services
  const services = [
    {
      id: "pan-card-apply",
      slug: "pan-card-apply",
      category_id: "digital-services",
      name_en: "New PAN Card Apply & Instant Correction",
      name_hi: "नया पैन कार्ड आवेदन एवं तत्काल सुधार",
      short_desc_en: "Instant paperless PAN via NSDL / UTI with biometric/OTP verification and physical doorstep dispatch.",
      short_desc_hi: "बायोमेट्रिक/ओटीपी सत्यापन के साथ एनएसडीएल से तत्काल पैन कार्ड।",
      description_en: "Fast and reliable government PAN card registration with door delivery.",
      description_hi: "घर पर डिलीवरी के साथ त्वरित और सुरक्षित सरकारी पैन कार्ड आवेदन।",
      estimated_fee: 150,
      processing_time_en: "2-4 Working Days",
      processing_time_hi: "2-4 कार्य दिवस",
      required_documents_en: ["Aadhaar Card", "2 Passport Photos", "Signature Proof"],
      required_documents_hi: ["आधार कार्ड", "2 पासपोर्ट साइज फोटो", "हस्ताक्षर प्रमाण"],
      official_portal_name: "NSDL / UTIITSL Protean",
      icon_name: "CreditCard",
      is_featured: true,
      is_popular: true,
      tags: ["pan card", "nsdl", "पैन कार्ड"]
    },
    {
      id: "rtps-bihar-certificates",
      slug: "rtps-bihar-certificates",
      category_id: "digital-services",
      name_en: "Bihar RTPS Caste, Income & Residential Certificates",
      name_hi: "बिहार RTPS जाति, आय एवं निवास प्रमाण पत्र",
      short_desc_en: "Fast-track online application on Service Plus portal with official digital signature barcode.",
      short_desc_hi: "सर्विस प्लस पोर्टल पर आधिकारिक डिजिटल हस्ताक्षर युक्त प्रमाण पत्र आवेदन।",
      description_en: "Apply for Block / CO / SDO / DM level verified caste, income, and domicile certificates.",
      description_hi: "अंचल, अनुमंडल एवं जिला स्तर के सत्यापित जाति, आय और निवास प्रमाण पत्र।",
      estimated_fee: 60,
      processing_time_en: "7-10 Working Days",
      processing_time_hi: "7-10 कार्य दिवस",
      required_documents_en: ["Aadhaar Card", "Mobile Linked OTP", "Ration Card or Land Receipt (for Income)"],
      required_documents_hi: ["आधार कार्ड", "मोबाइल ओटीपी", "राशन कार्ड या जमीन रसीद"],
      official_portal_name: "ServicePlus RTPS Bihar",
      icon_name: "FileCheck",
      is_featured: true,
      is_popular: true,
      tags: ["rtps", "caste", "income", "निवास", "जाति", "आय"]
    }
  ];

  for (const s of services) {
    await client.query(`
      INSERT INTO public.services (id, slug, category_id, name_en, name_hi, short_desc_en, short_desc_hi, description_en, description_hi, estimated_fee, processing_time_en, processing_time_hi, required_documents_en, required_documents_hi, official_portal_name, icon_name, is_featured, is_popular, tags, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true)
      ON CONFLICT (id) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_hi = EXCLUDED.name_hi,
        estimated_fee = EXCLUDED.estimated_fee;
    `, [s.id, s.slug, s.category_id, s.name_en, s.name_hi, s.short_desc_en, s.short_desc_hi, s.description_en, s.description_hi, s.estimated_fee, s.processing_time_en, s.processing_time_hi, s.required_documents_en, s.required_documents_hi, s.official_portal_name, s.icon_name, s.is_featured, s.is_popular, s.tags]);
  }
  console.log('Services seeded.');

  await client.end();
  console.log('ALL SEEDING COMPLETED SUCCESSFULLY!');
}

runSeed();