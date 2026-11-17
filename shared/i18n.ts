import type { LanguageCode } from './types.ts';

export interface TranslationBundle {
  tagline: string;
  navExplore: string;
  navCategories: string;
  navRequests: string;
  navEmergency: string;
  navHelp: string;
  navSignIn: string;
  heroHeadline: string;
  heroSubhead: string;
  searchPlaceholder: string;
  searchButton: string;
  emergencyCta: string;
  emergencySub: string;
  categoriesTitle: string;
  popularTitle: string;
  nearbyTitle: string;
  recommendedTitle: string;
  recentTitle: string;
  topRatedTitle: string;
  localRequestsTitle: string;
  howItWorksTitle: string;
  reviewsTitle: string;
  zeroCommission: string;
  demoLabel: string;
  verifiedLabel: string;
  startingAt: string;
  requestService: string;
  viewProfile: string;
  callNow: string;
  whatsapp: string;
  chat: string;
  lowInternetMode: string;
  aiAssistantTitle: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationBundle> = {
  en: {
    tagline: 'Your Neighbourhood. Your Services.',
    navExplore: 'Explore',
    navCategories: 'Categories',
    navRequests: 'Requests',
    navEmergency: 'Emergency',
    navHelp: 'Help',
    navSignIn: 'Sign In',
    heroHeadline: 'Trusted local specialists across Kerala, without middlemen.',
    heroSubhead:
      'Discover electricians, appliance technicians, contractors, tutors, and event professionals in your town. Compare transparent quotes directly and pay zero commission.',
    searchPlaceholder: 'Search service, provider, town, or PIN code (e.g. Electrician Tirur 676101)',
    searchButton: 'Search',
    emergencyCta: 'Emergency Assistance',
    emergencySub: 'Urgent home repairs or India 112 safety support',
    categoriesTitle: 'Explore 8 Service Categories',
    popularTitle: 'Popular Services in Kerala',
    nearbyTitle: 'Nearby Professionals',
    recommendedTitle: 'Recommended for You',
    recentTitle: 'Recently Added Providers',
    topRatedTitle: 'Top-Rated Specialists',
    localRequestsTitle: 'Recent Local Service Requests',
    howItWorksTitle: 'How LocalConnect Works',
    reviewsTitle: 'Household Reviews',
    zeroCommission: 'Free marketplace · Zero commission',
    demoLabel: 'Demo Profile',
    verifiedLabel: 'Verified',
    startingAt: 'Starts at',
    requestService: 'Request Service',
    viewProfile: 'View Profile',
    callNow: 'Call',
    whatsapp: 'WhatsApp',
    chat: 'Chat',
    lowInternetMode: 'Low-Internet Mode',
    aiAssistantTitle: 'LocalConnect AI',
  },
  ml: {
    tagline: 'നിങ്ങളുടെ അയൽപക്കം. നിങ്ങളുടെ സേവനങ്ങൾ.',
    navExplore: 'തിരയുക',
    navCategories: 'വിഭാഗങ്ങൾ',
    navRequests: 'അഭ്യർത്ഥനകൾ',
    navEmergency: 'അടിയന്തരം',
    navHelp: 'സഹായം',
    navSignIn: 'ലോഗിൻ',
    heroHeadline: 'കേരളത്തിലെ വിശ്വസ്തരായ പ്രാദേശിക സേവന വിദഗ്ധർ, ഇടനിലക്കാരില്ലാതെ.',
    heroSubhead:
      'നിങ്ങളുടെ നാട്ടിലെ ഇലക്ട്രീഷ്യൻ, പ്ലംബർ, എസി ടെക്നീഷ്യൻ, ട്യൂട്ടർ, ഇവന്റ് വിദഗ്ധരെ കണ്ടെത്തൂ. ക്വട്ടേഷനുകൾ താരതമ്യം ചെയ്ത് കമ്മീഷൻ ഇല്ലാതെ ബുക്ക് ചെയ്യാം.',
    searchPlaceholder: 'സേവനം, പേര്, സ്ഥലം അല്ലെങ്കിൽ പിൻ കോഡ് തിരയുക (ഉദാ: Electrician Tirur)',
    searchButton: 'തിരയുക',
    emergencyCta: 'അടിയന്തര സഹായം',
    emergencySub: 'അടിയന്തര വീട്ടുപണികൾ അല്ലെങ്കിൽ 112 സുരക്ഷാ സഹായം',
    categoriesTitle: '8 സേവന വിഭാഗങ്ങൾ',
    popularTitle: 'ജനപ്രിയ സേവനങ്ങൾ',
    nearbyTitle: 'സമീപത്തുള്ള വിദഗ്ധർ',
    recommendedTitle: 'നിങ്ങൾക്കായി നിർദ്ദേശിക്കുന്നത്',
    recentTitle: 'പുതുതായി ചേർന്നവർ',
    topRatedTitle: 'മികച്ച റേറ്റിംഗുള്ളവർ',
    localRequestsTitle: 'പ്രാദേശിക സേവന അഭ്യർത്ഥനകൾ',
    howItWorksTitle: 'LocalConnect പ്രവർത്തിക്കുന്ന വിധം',
    reviewsTitle: 'ഉപഭോക്തൃ അഭിപ്രായങ്ങൾ',
    zeroCommission: 'സൗജന്യ വിപണി · കമ്മീഷൻ ഇല്ല',
    demoLabel: 'ഡെമോ പ്രൊഫൈൽ',
    verifiedLabel: 'പരിശോധിച്ചത്',
    startingAt: 'ആരംഭ നിരക്ക്',
    requestService: 'സേവനം ആവശ്യപ്പെടുക',
    viewProfile: 'പ്രൊഫൈൽ കാണുക',
    callNow: 'വിളിക്കുക',
    whatsapp: 'വാട്സാപ്പ്',
    chat: 'ചാറ്റ്',
    lowInternetMode: 'കുറഞ്ഞ ഇന്റർനെറ്റ് മോഡ്',
    aiAssistantTitle: 'LocalConnect AI',
  },
  hi: {
    tagline: 'आपका पड़ोस। आपकी सेवाएँ।',
    navExplore: 'खोजें',
    navCategories: 'श्रेणियाँ',
    navRequests: 'अनुरोध',
    navEmergency: 'आपातकाल',
    navHelp: 'सहायता',
    navSignIn: 'साइन इन',
    heroHeadline: 'केरल भर में विश्वसनीय स्थानीय विशेषज्ञ, बिना किसी बिचौलिए के।',
    heroSubhead:
      'अपने शहर में इलेक्ट्रीशियन, उपकरण तकनीशियन, ठेकेदार, ट्यूटर और इवेंट पेशेवर खोजें। सीधे कोटेशन की तुलना करें और शून्य कमीशन पर बुक करें।',
    searchPlaceholder: 'सेवा, प्रदाता, शहर या पिन कोड खोजें (जैसे Electrician Tirur)',
    searchButton: 'खोजें',
    emergencyCta: 'आपातकालीन सहायता',
    emergencySub: 'तत्काल घरेलू मरम्मत या भारत 112 सुरक्षा सहायता',
    categoriesTitle: '8 सेवा श्रेणियाँ',
    popularTitle: 'लोकप्रिय सेवाएँ',
    nearbyTitle: 'आस-पास के विशेषज्ञ',
    recommendedTitle: 'आपके लिए अनुशंसित',
    recentTitle: 'नए जुड़े प्रदाता',
    topRatedTitle: 'शीर्ष रेटेड विशेषज्ञ',
    localRequestsTitle: 'स्थानीय सेवा अनुरोध',
    howItWorksTitle: 'LocalConnect कैसे काम करता है',
    reviewsTitle: 'ग्राहकों की समीक्षाएँ',
    zeroCommission: 'निःशुल्क बाज़ार · शून्य कमीशन',
    demoLabel: 'डेमो प्रोफ़ाइल',
    verifiedLabel: 'सत्यापित',
    startingAt: 'शुरुआती शुल्क',
    requestService: 'सेवा अनुरोध भेजें',
    viewProfile: 'प्रोफ़ाइल देखें',
    callNow: 'कॉल करें',
    whatsapp: 'व्हाट्सऐप',
    chat: 'चैट',
    lowInternetMode: 'लो-इंटरनेट मोड',
    aiAssistantTitle: 'LocalConnect AI',
  },
};

export function t(lang: LanguageCode): TranslationBundle {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
