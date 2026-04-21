import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LANGUAGES } from "./languages";

// Base translations (English source) + curated Hindi & Sanskrit translations.
// Other Indian languages fall back to English UI strings; content (announcements,
// notices, intro) can later be translated per-language via the admin panel.

const en = {
  nav: {
    home: "Home",
    about: "About",
    announcements: "Announcements",
    notices: "Notices",
    donate: "Donate",
    directory: "Directory",
    matrimonial: "Matrimonial",
  },
  brand: {
    name: "Indraprastha Brahman Samaj",
    tagline: "Heritage • Harmony • Humanity",
  },
  hero: {
    welcome: "Welcome to",
    subtitle: "A united community preserving our timeless traditions while embracing a vibrant modern future together.",
    ctaAbout: "Discover Our Story",
    ctaDonate: "Support the Samaj",
  },
  home: {
    introTitle: "Our Sacred Community",
    introBody: "For generations, Indraprastha Brahman Samaj has been a guiding light for families — fostering culture, education, and seva. Join us in carrying forward this living legacy.",
    latestAnnouncements: "Latest Announcements",
    quickLinks: "Quick Links",
    viewAll: "View all",
    urgentBadge: "Urgent",
    quick: {
      notices: "Notices Board",
      noticesDesc: "Official circulars & meeting decisions",
      events: "Upcoming Events",
      eventsDesc: "Festivals, gatherings & ceremonies",
      directory: "Community Directory",
      directoryDesc: "Connect with fellow members",
      donate: "Contribute",
      donateDesc: "Support our mission with seva",
    },
  },
  about: {
    title: "About the Samaj",
    aboutTitle: "Who We Are",
    aboutBody: "Indraprastha Brahman Samaj is a community organisation rooted in the timeless values of dharma, vidya, and seva. We bring together families across generations to preserve our shared heritage and uplift one another.",
    historyTitle: "Our History",
    historyBody: "Founded by elders who envisioned a united Brahman community in the heart of Indraprastha, the Samaj has grown into a thriving sangha — supporting education, culture, and social welfare for decades.",
    missionTitle: "Mission",
    missionBody: "To preserve our cultural and spiritual heritage, support every family in need, and empower the next generation through education and values.",
    visionTitle: "Vision",
    visionBody: "A united, prosperous and enlightened Brahman community that contributes meaningfully to society while honouring its sacred roots.",
    valuesTitle: "Our Values",
    values: {
      dharma: "Dharma — Righteous living",
      vidya: "Vidya — Lifelong learning",
      seva: "Seva — Selfless service",
      ekta: "Ekta — Unity in community",
    },
  },
  announcements: {
    title: "Announcements",
    subtitle: "Stay updated with what's happening in our community",
    empty: "No announcements yet.",
    urgent: "Urgent",
    posted: "Posted on",
  },
  notices: {
    title: "Notices Board",
    subtitle: "Official circulars, meeting minutes & community decisions",
    download: "Download PDF",
    category: "Category",
    all: "All",
    categories: {
      meeting: "Meeting",
      circular: "Circular",
      decision: "Decision",
      legal: "Legal",
    },
  },
  donate: {
    title: "Support Our Seva",
    subtitle: "Every contribution lights a diya of hope, education, and unity.",
    chooseAmount: "Choose your contribution",
    customAmount: "Or enter a custom amount",
    chooseMethod: "Choose payment method",
    methods: {
      upi: "UPI",
      phonepe: "PhonePe",
      paytm: "Paytm",
      bhim: "BHIM UPI",
      gpay: "Google Pay",
      stripe: "Card (Stripe)",
      bank: "Bank Transfer",
    },
    scanQr: "Scan & Pay",
    upiId: "UPI ID",
    copy: "Copy",
    copied: "Copied!",
    bankName: "Bank Name",
    accountName: "Account Name",
    accountNumber: "Account Number",
    ifsc: "IFSC Code",
    thankYou: "Thank you for your generosity 🙏",
    note: "All donations support community welfare, education scholarships, festivals & seva activities.",
    impact: {
      title: "Your Contribution Powers",
      education: "Scholarships for children",
      festivals: "Cultural festivals & rituals",
      welfare: "Welfare for elders & families",
      heritage: "Preserving our heritage",
    },
  },
  directory: {
    title: "Community Directory",
    subtitle: "Connect with fellow members of our Samaj — search by name, gotra, profession, or city.",
    searchPlaceholder: "Search by name, gotra, city, profession…",
    empty: "No members listed yet.",
    gotra: "Gotra",
    familyHead: "Family head",
  },
  matrimonial: {
    title: "Matrimonial",
    subtitle: "Sacred unions within our community — browse profiles and reach out through guardians.",
    searchPlaceholder: "Search by name, gotra, education, city…",
    empty: "No matrimonial profiles yet.",
    allGenders: "All",
    male: "Male",
    female: "Female",
    other: "Other",
    years: "yrs",
    contact: "Contact",
  },
  footer: {
    rights: "All rights reserved.",
    blessing: "॥ सर्वे भवन्तु सुखिनः ॥",
  },
};

const hi: typeof en = {
  nav: { home: "मुख्य पृष्ठ", about: "परिचय", announcements: "घोषणाएँ", notices: "सूचना पट", donate: "दान करें", directory: "निर्देशिका", matrimonial: "विवाह" },
  brand: { name: "इन्द्रप्रस्थ ब्राह्मण समाज", tagline: "विरासत • सद्भाव • मानवता" },
  hero: {
    welcome: "स्वागत है",
    subtitle: "एक एकजुट समुदाय जो अपनी कालातीत परंपराओं को संजोए हुए एक उज्ज्वल आधुनिक भविष्य की ओर अग्रसर है।",
    ctaAbout: "हमारी कहानी जानें",
    ctaDonate: "समाज को सहयोग दें",
  },
  home: {
    introTitle: "हमारा पावन समुदाय",
    introBody: "पीढ़ियों से इन्द्रप्रस्थ ब्राह्मण समाज परिवारों के लिए मार्गदर्शक रहा है — संस्कृति, शिक्षा एवं सेवा का संवर्धन करते हुए। इस जीवंत विरासत को आगे बढ़ाने में हमारे साथ जुड़ें।",
    latestAnnouncements: "नवीनतम घोषणाएँ",
    quickLinks: "त्वरित लिंक",
    viewAll: "सभी देखें",
    urgentBadge: "अत्यावश्यक",
    quick: {
      notices: "सूचना पट",
      noticesDesc: "आधिकारिक परिपत्र एवं निर्णय",
      events: "आगामी कार्यक्रम",
      eventsDesc: "त्योहार, सभाएँ एवं समारोह",
      directory: "समुदाय निर्देशिका",
      directoryDesc: "सदस्यों से जुड़ें",
      donate: "योगदान दें",
      donateDesc: "सेवा भाव से सहयोग करें",
    },
  },
  about: {
    title: "समाज के बारे में",
    aboutTitle: "हम कौन हैं",
    aboutBody: "इन्द्रप्रस्थ ब्राह्मण समाज धर्म, विद्या और सेवा के शाश्वत मूल्यों पर आधारित एक सामुदायिक संगठन है। हम पीढ़ियों के परिवारों को एक साथ लाते हैं।",
    historyTitle: "हमारा इतिहास",
    historyBody: "इन्द्रप्रस्थ के हृदय में एक एकजुट ब्राह्मण समुदाय की कल्पना करने वाले बुज़ुर्गों द्वारा स्थापित, यह समाज दशकों से शिक्षा, संस्कृति और समाज कल्याण का स्तंभ रहा है।",
    missionTitle: "मिशन",
    missionBody: "हमारी सांस्कृतिक और आध्यात्मिक विरासत को संरक्षित करना, ज़रूरतमंद परिवारों की सहायता करना, और शिक्षा एवं मूल्यों के माध्यम से अगली पीढ़ी को सशक्त बनाना।",
    visionTitle: "दृष्टि",
    visionBody: "एक एकजुट, समृद्ध और प्रबुद्ध ब्राह्मण समुदाय जो अपनी पावन जड़ों का सम्मान करते हुए समाज में सार्थक योगदान दे।",
    valuesTitle: "हमारे मूल्य",
    values: { dharma: "धर्म — सत्यनिष्ठ जीवन", vidya: "विद्या — आजीवन शिक्षा", seva: "सेवा — निःस्वार्थ सेवा", ekta: "एकता — समुदाय में एकजुटता" },
  },
  announcements: { title: "घोषणाएँ", subtitle: "हमारे समुदाय की नवीनतम जानकारी से जुड़े रहें", empty: "अभी कोई घोषणा नहीं।", urgent: "अत्यावश्यक", posted: "पोस्ट किया गया" },
  notices: { title: "सूचना पट", subtitle: "आधिकारिक परिपत्र, बैठक के निर्णय और समुदायिक सूचनाएँ", download: "PDF डाउनलोड करें", category: "श्रेणी", all: "सभी",
    categories: { meeting: "बैठक", circular: "परिपत्र", decision: "निर्णय", legal: "क़ानूनी" } },
  donate: {
    title: "हमारी सेवा में सहयोग दें",
    subtitle: "हर योगदान आशा, शिक्षा और एकता का एक दीपक प्रज्वलित करता है।",
    chooseAmount: "अपना योगदान चुनें",
    customAmount: "या कस्टम राशि दर्ज करें",
    chooseMethod: "भुगतान विधि चुनें",
    methods: { upi: "UPI", phonepe: "PhonePe", paytm: "Paytm", bhim: "BHIM UPI", gpay: "Google Pay", stripe: "कार्ड (Stripe)", bank: "बैंक ट्रांसफर" },
    scanQr: "स्कैन करें और भुगतान करें", upiId: "UPI आईडी", copy: "कॉपी करें", copied: "कॉपी हो गया!",
    bankName: "बैंक का नाम", accountName: "खाताधारक", accountNumber: "खाता संख्या", ifsc: "IFSC कोड",
    thankYou: "आपकी उदारता के लिए धन्यवाद 🙏",
    note: "सभी दान समुदाय कल्याण, शिक्षा छात्रवृत्ति, त्योहारों और सेवा गतिविधियों में लगाए जाते हैं।",
    impact: { title: "आपका योगदान शक्ति देता है", education: "बच्चों के लिए छात्रवृत्ति", festivals: "सांस्कृतिक त्योहार एवं अनुष्ठान", welfare: "बुज़ुर्गों एवं परिवारों का कल्याण", heritage: "हमारी विरासत का संरक्षण" },
  },
  directory: {
    title: "समुदाय निर्देशिका",
    subtitle: "समाज के सदस्यों से जुड़ें — नाम, गोत्र, पेशा या शहर से खोजें।",
    searchPlaceholder: "नाम, गोत्र, शहर, पेशा से खोजें…",
    empty: "अभी कोई सदस्य सूचीबद्ध नहीं।",
    gotra: "गोत्र",
    familyHead: "परिवार के मुखिया",
  },
  matrimonial: {
    title: "विवाह प्रोफ़ाइल",
    subtitle: "हमारे समुदाय के भीतर पवित्र संबंध — प्रोफ़ाइल देखें और अभिभावक के माध्यम से संपर्क करें।",
    searchPlaceholder: "नाम, गोत्र, शिक्षा, शहर से खोजें…",
    empty: "अभी कोई विवाह प्रोफ़ाइल नहीं।",
    allGenders: "सभी", male: "पुरुष", female: "स्त्री", other: "अन्य",
    years: "वर्ष", contact: "संपर्क",
  },
  footer: { rights: "सर्वाधिकार सुरक्षित।", blessing: "॥ सर्वे भवन्तु सुखिनः ॥" },
};

const sa: typeof en = {
  nav: { home: "मुख्यपृष्ठम्", about: "परिचयः", announcements: "घोषणाः", notices: "सूचनाफलकम्", donate: "दानम्", directory: "सूची", matrimonial: "विवाहः" },
  brand: { name: "इन्द्रप्रस्थब्राह्मणसमाजः", tagline: "परम्परा • सद्भावः • मानवता" },
  hero: { welcome: "स्वागतम्", subtitle: "एकः समाजः यः सनातनपरम्परां पालयन् नवीनं भविष्यम् आलिङ्गति।", ctaAbout: "अस्माकं कथां पश्यतु", ctaDonate: "समाजाय दीयताम्" },
  home: {
    introTitle: "अस्माकं पावनः समुदायः",
    introBody: "बहुपीढीभ्यः इन्द्रप्रस्थब्राह्मणसमाजः कुटुम्बानां दीपकः अस्ति — संस्कृतेः, विद्यायाः, सेवायाः च संवर्धनम् करोति।",
    latestAnnouncements: "नवीनाः घोषणाः", quickLinks: "शीघ्रसम्पर्काः", viewAll: "सर्वं पश्यतु", urgentBadge: "अत्यावश्यकम्",
    quick: {
      notices: "सूचनाफलकम्", noticesDesc: "आधिकारिकाः परिपत्राणि",
      events: "आगामीकार्यक्रमाः", eventsDesc: "उत्सवाः, सभाः, संस्काराः",
      directory: "समाजसूची", directoryDesc: "सदस्यैः सह सम्पर्कः",
      donate: "योगदानम्", donateDesc: "सेवाभावेन सहयोगः",
    },
  },
  about: {
    title: "समाजविषये",
    aboutTitle: "वयं के स्मः", aboutBody: "इन्द्रप्रस्थब्राह्मणसमाजः धर्मस्य, विद्यायाः, सेवायाः च मूलमूल्येषु प्रतिष्ठितः समुदायसंस्था अस्ति।",
    historyTitle: "अस्माकम् इतिहासः", historyBody: "इन्द्रप्रस्थस्य हृदये एकीकृतस्य ब्राह्मणसमुदायस्य कल्पनां कुर्वद्भिः वृद्धैः स्थापितः अयं समाजः दशकेभ्यः सेवारतः अस्ति।",
    missionTitle: "उद्देश्यम्", missionBody: "अस्माकं सांस्कृतिकं आध्यात्मिकं च वारसां संरक्षितुं, सर्वकुटुम्बानां सहायतां कर्तुं, अग्रिमपीढीं शिक्षया मूल्यैः च सशक्तीकर्तुं च।",
    visionTitle: "दर्शनम्", visionBody: "एकीकृतः, समृद्धः, प्रबुद्धः च ब्राह्मणसमुदायः यः समाजे सार्थकं योगदानं ददाति।",
    valuesTitle: "अस्माकं मूल्यानि",
    values: { dharma: "धर्मः — सत्यजीवनम्", vidya: "विद्या — आजीवनशिक्षणम्", seva: "सेवा — निःस्वार्थसेवा", ekta: "एकता — समुदायैक्यम्" },
  },
  announcements: { title: "घोषणाः", subtitle: "समुदायस्य नवीनं ज्ञातव्यम्", empty: "घोषणाः न सन्ति।", urgent: "अत्यावश्यकम्", posted: "प्रकाशितम्" },
  notices: { title: "सूचनाफलकम्", subtitle: "आधिकारिकाः सूचनाः", download: "PDF अवचयतु", category: "वर्गः", all: "सर्वम्",
    categories: { meeting: "सभा", circular: "परिपत्रम्", decision: "निर्णयः", legal: "विधिः" } },
  donate: {
    title: "अस्माकं सेवायां सहयोगं ददातु",
    subtitle: "प्रत्येकं योगदानं आशायाः, शिक्षायाः, ऐक्यस्य च दीपकं प्रज्वालयति।",
    chooseAmount: "योगदानं चिनोतु", customAmount: "वा स्वेच्छया राशिं लिखतु", chooseMethod: "भुगतानविधिं चिनोतु",
    methods: { upi: "UPI", phonepe: "PhonePe", paytm: "Paytm", bhim: "BHIM UPI", gpay: "Google Pay", stripe: "कार्ड (Stripe)", bank: "बैङ्कस्थानान्तरणम्" },
    scanQr: "स्कैन कृत्वा भुगतानं कुरुत", upiId: "UPI सङ्केतः", copy: "प्रतिलिप्यताम्", copied: "प्रतिलिपिता!",
    bankName: "बैङ्कस्य नाम", accountName: "खातानाम", accountNumber: "खातासङ्ख्या", ifsc: "IFSC सङ्केतः",
    thankYou: "भवतः उदारतायै धन्यवादाः 🙏",
    note: "सर्वाणि दानानि समुदायकल्याणाय शिक्षायै उत्सवाय सेवायै च उपयुज्यन्ते।",
    impact: { title: "भवतः योगदानेन", education: "बालकेभ्यः छात्रवृत्तिः", festivals: "सांस्कृतिकोत्सवाः", welfare: "वृद्धानां कुटुम्बानां च कल्याणम्", heritage: "वारसायाः संरक्षणम्" },
  },
  directory: {
    title: "समुदायसूची",
    subtitle: "समाजस्य सदस्यैः सह सम्पर्कं कुरुत — नाम्ना, गोत्रेण, व्यवसायेन, नगरेण वा अन्विष्यतु।",
    searchPlaceholder: "नाम, गोत्रम्, नगरम्, व्यवसायः…",
    empty: "अद्यापि सदस्याः सूचीकृताः न सन्ति।",
    gotra: "गोत्रम्", familyHead: "कुटुम्बप्रमुखः",
  },
  matrimonial: {
    title: "विवाहसूची",
    subtitle: "अस्माकं समुदाये पवित्रसम्बन्धाः — सूचीं पश्यतु, अभिभावकैः सह सम्पर्कं कुरुत।",
    searchPlaceholder: "नाम, गोत्रम्, शिक्षा, नगरम्…",
    empty: "अद्यापि विवाहसूची रिक्ता।",
    allGenders: "सर्वम्", male: "पुरुषः", female: "स्त्री", other: "अन्यः",
    years: "वर्षाणि", contact: "सम्पर्कः",
  },
  footer: { rights: "सर्वाधिकाराः सुरक्षिताः।", blessing: "॥ सर्वे भवन्तु सुखिनः ॥" },
};

const resources: Record<string, { translation: typeof en }> = {
  en: { translation: en },
  hi: { translation: hi },
  sa: { translation: sa },
};

LANGUAGES.forEach((l) => {
  if (!resources[l.code]) resources[l.code] = { translation: en };
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

export default i18n;
