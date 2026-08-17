import { type CardOccasion, type CardStyle, type CardTypeFormat, type CardReligion } from "../../lib/storage/catalogData";

export interface OccasionItem {
  id: CardOccasion | "all";
  nameEn: string;
  nameHi: string;
  descEn: string;
  descHi: string;
  emoji: string;
  priceFrom: string;
  colorBg: string;
  borderHover: string;
}

export const OCCASIONS_LIST: OccasionItem[] = [
  {
    id: "all",
    nameEn: "All Invitations",
    nameHi: "सभी कार्ड कलेक्शन",
    descEn: "Complete showroom catalogue across all ceremonial milestones.",
    descHi: "सभी प्रकार के मांगलिक एवं पारिवारिक आमंत्रण पत्र।",
    emoji: "✨",
    priceFrom: "From ₹6/card",
    colorBg: "bg-slate-50",
    borderHover: "hover:border-[#881337]",
  },
  {
    id: "wedding",
    nameEn: "Wedding Cards",
    nameHi: "शुभ विवाह कार्ड",
    descEn: "Royal gold leaf, embossed shlokas, laser cut jackets & luxury boxes.",
    descHi: "शाही स्वर्ण श्लोक, लेज़र कटिंग एवं लग्जरी हार्डबोर्ड बॉक्स कार्ड।",
    emoji: "🪔",
    priceFrom: "From ₹12/card",
    colorBg: "bg-rose-50/70",
    borderHover: "hover:border-[#881337]",
  },
  {
    id: "tilak",
    nameEn: "Tilak & Bariksha",
    nameHi: "तिलक एवं बरीक्षा",
    descEn: "Traditional Sanskrit shloka cards with auspicious Kalash & coconut motifs.",
    descHi: "मंगल कलश, नारियल एवं शुभ मुहूर्त सहित तिलक व फलदान पत्र।",
    emoji: "🚩",
    priceFrom: "From ₹8/card",
    colorBg: "bg-amber-50/70",
    borderHover: "hover:border-amber-600",
  },
  {
    id: "mundan",
    nameEn: "Mundan & Janeu",
    nameHi: "मुंडन एवं जनेऊ संस्कार",
    descEn: "Joyful sanskar cards with child photo print and family feast invites.",
    descHi: "बच्चे के मुंडन, उपनयन एवं प्रीतिभोज के आकर्षक कार्ड।",
    emoji: "👶",
    priceFrom: "From ₹8/card",
    colorBg: "bg-orange-50/70",
    borderHover: "hover:border-orange-600",
  },
  {
    id: "engagement",
    nameEn: "Engagement & Sagai",
    nameHi: "सगाई एवं रिंग सेरेमनी",
    descEn: "Pastel botanicals, intertwining gold rings & modern folded cards.",
    descHi: "पेस्टल फ्लोरल थीम, रिंग प्रतीक एवं मॉडर्न फोल्डेड कार्ड।",
    emoji: "💍",
    priceFrom: "From ₹16/card",
    colorBg: "bg-purple-50/70",
    borderHover: "hover:border-purple-600",
  },
  {
    id: "housewarming",
    nameEn: "Griha Pravesh",
    nameHi: "गृह प्रवेश एवं वास्तु",
    descEn: "New home entry & Vastu Puja cards with Havan timings & venue map.",
    descHi: "नए घर में गृह प्रवेश, वास्तु शांति एवं प्रीतिभोज आमंत्रण पत्र।",
    emoji: "🏡",
    priceFrom: "From ₹9/card",
    colorBg: "bg-emerald-50/70",
    borderHover: "hover:border-emerald-600",
  },
  {
    id: "birthday",
    nameEn: "Birthday Party",
    nameHi: "जन्मदिन आमंत्रण",
    descEn: "Photo-printed birthday invitations with cartoon & superhero themes.",
    descHi: "बच्चों की फोटो, कार्टून थीम और पार्टी टाइमिंग के रंगीन कार्ड।",
    emoji: "🎂",
    priceFrom: "From ₹6/card",
    colorBg: "bg-blue-50/70",
    borderHover: "hover:border-blue-600",
  },
  {
    id: "naming",
    nameEn: "Naming Ceremony",
    nameHi: "नामकरण संस्कार",
    descEn: "Sweet blessings for newborn naming rituals and family celebrations.",
    descHi: "नवजात शिशु के नामकरण संस्कार एवं मंगल आशीर्वाद पत्र।",
    emoji: "🌸",
    priceFrom: "From ₹8/card",
    colorBg: "bg-pink-50/70",
    borderHover: "hover:border-pink-600",
  },
  {
    id: "reception",
    nameEn: "Evening Reception",
    nameHi: "प्रीतिभोज आमंत्रण",
    descEn: "Sophisticated dinner and reception party invitations with RSVP.",
    descHi: "विवाह उपरांत प्रीतिभोज एवं स्वागत समारोह के सुरुचिपूर्ण कार्ड।",
    emoji: "🥂",
    priceFrom: "From ₹12/card",
    colorBg: "bg-indigo-50/70",
    borderHover: "hover:border-indigo-600",
  },
  {
    id: "baby-shower",
    nameEn: "Godh Bharai",
    nameHi: "गोद भराई (Baby Shower)",
    descEn: "Delicate floral celebration invitations for mom-to-be and family.",
    descHi: "गोद भराई एवं मातृत्व उत्सव के मधुर एवं सुंदर आमंत्रण।",
    emoji: "🎀",
    priceFrom: "From ₹14/card",
    colorBg: "bg-fuchsia-50/70",
    borderHover: "hover:border-fuchsia-600",
  },
  {
    id: "religious",
    nameEn: "Puja & Religious",
    nameHi: "धार्मिक एवं कथा पत्र",
    descEn: "Satyanarayan Katha, Yagya, Bhagwat Geeta & Temple invitations.",
    descHi: "श्री सत्यनारायण कथा, महायज्ञ एवं भागवत कथा निमंत्रण पत्र।",
    emoji: "🙏",
    priceFrom: "From ₹6/card",
    colorBg: "bg-yellow-50/70",
    borderHover: "hover:border-yellow-600",
  },
  {
    id: "custom",
    nameEn: "Custom Bespoke",
    nameHi: "कस्टम / विशेष ऑर्डर",
    descEn: "Tailored concepts, custom dimensions, wax seals & luxury boxes.",
    descHi: "अपनी पसंद का मनपसंद डिज़ाइन, विशेष आकार एवं वैक्स सील।",
    emoji: "🎨",
    priceFrom: "Quotation based",
    colorBg: "bg-amber-100/50",
    borderHover: "hover:border-amber-700",
  },
];

export interface StyleOption {
  id: CardStyle | "all";
  nameEn: string;
  nameHi: string;
  icon: string;
}

export const STYLES_LIST: StyleOption[] = [
  { id: "all", nameEn: "All Styles", nameHi: "सभी स्टाइल", icon: "✨" },
  { id: "royal", nameEn: "Royal Gold", nameHi: "रॉयल गोल्ड", icon: "👑" },
  { id: "traditional", nameEn: "Traditional Shloka", nameHi: "पारंपरिक श्लोक", icon: "🪔" },
  { id: "peacock", nameEn: "Peacock Motif", nameHi: "मयूर डिज़ाइन", icon: "🦚" },
  { id: "laser_cut", nameEn: "Laser Cut Filigree", nameHi: "लेज़र कटिंग", icon: "✂️" },
  { id: "luxury", nameEn: "Luxury Box & Glass", nameHi: "लग्जरी बॉक्स/ग्लास", icon: "💎" },
  { id: "floral", nameEn: "Pastel Floral", nameHi: "पेस्टल फ्लोरल", icon: "🌸" },
  { id: "modern", nameEn: "Modern & Minimal", nameHi: "मॉडर्न मिनिमल", icon: "🌟" },
];

export const CARD_TYPES: { id: CardTypeFormat | "all"; labelEn: string; labelHi: string }[] = [
  { id: "all", labelEn: "All Types", labelHi: "सभी प्रकार" },
  { id: "folded", labelEn: "Folded / Book Style", labelHi: "फोल्डेड / बुक स्टाइल" },
  { id: "laser_cut", labelEn: "Laser Cut Filigree", labelHi: "लेज़र कटिंग" },
  { id: "box", labelEn: "Hardboard Velvet Box", labelHi: "हार्डबोर्ड बॉक्स" },
  { id: "single_sheet", labelEn: "Single Sheet / Card", labelHi: "सिंगल शीट कार्ड" },
  { id: "acrylic", labelEn: "Frosted Acrylic Glass", labelHi: "ऐक्रेलिक ग्लास" },
  { id: "scroll", labelEn: "Royal Scroll (Farman)", labelHi: "शाही फरमान स्क्रॉल" },
  { id: "padded", labelEn: "Heavy Padded Card", labelHi: "पैडेड कार्ड" },
];

export const RELIGIONS: { id: CardReligion | "all"; labelEn: string; labelHi: string }[] = [
  { id: "all", labelEn: "All Traditions", labelHi: "सभी परंपराएँ" },
  { id: "hindu", labelEn: "Hindu (Ganesha / Shloka)", labelHi: "हिंदू (गणेश / श्लोक)" },
  { id: "muslim", labelEn: "Islamic (Nikah / Bismillah)", labelHi: "मुस्लिम (निकाह / बिस्मिल्लाह)" },
  { id: "sikh", labelEn: "Sikh (Anand Karaj / Khanda)", labelHi: "सिख (आनंद कारज)" },
  { id: "christian", labelEn: "Christian (Holy Matrimony)", labelHi: "ईसाई (होली मैट्रिमोनी)" },
  { id: "interfaith", labelEn: "Interfaith / Secular", labelHi: "सर्वधर्म / आधुनिक" },
];

export const PRICE_RANGES = [
  { id: "all", labelEn: "All Budgets", labelHi: "सभी मूल्य" },
  { id: "under-20", labelEn: "Under ₹20", labelHi: "₹20 से कम" },
  { id: "20-30", labelEn: "₹20 – ₹30", labelHi: "₹20 – ₹30" },
  { id: "30-50", labelEn: "₹30 – ₹50", labelHi: "₹30 – ₹50" },
  { id: "50-100", labelEn: "₹50 – ₹100", labelHi: "₹50 – ₹100" },
  { id: "100-plus", labelEn: "₹100+ (Luxury)", labelHi: "₹100+ (लग्जरी)" },
];

export const SORT_OPTIONS = [
  { id: "featured", labelEn: "Featured", labelHi: "प्रमुख (Featured)" },
  { id: "popular", labelEn: "Most Popular", labelHi: "सर्वाधिक लोकप्रिय" },
  { id: "price-asc", labelEn: "Price: Low to High", labelHi: "मूल्य: कम से ज्यादा" },
  { id: "price-desc", labelEn: "Price: High to Low", labelHi: "मूल्य: ज्यादा से कम" },
  { id: "newest", labelEn: "Newest Arrivals", labelHi: "नवीनतम डिज़ाइन" },
  { id: "name-asc", labelEn: "Name: A to Z", labelHi: "नाम: A से Z" },
];
