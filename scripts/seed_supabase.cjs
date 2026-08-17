const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const supabaseKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';
const client = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('--- Seeding Categories ---');
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

  for (const cat of categories) {
    const { error } = await client.from('categories').upsert(cat, { onConflict: 'id' });
    if (error) console.log('Category upsert notice:', cat.id, error.message);
    else console.log('Category seeded:', cat.id);
  }

  console.log('--- Seed process completed ---');
}

seed();