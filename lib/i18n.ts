export const supportedLanguages = ["en", "ka"] as const;

export type Language = (typeof supportedLanguages)[number];

export const defaultLanguage: Language = "en";

export const languageNames: Record<Language, string> = {
  en: "English",
  ka: "ქართული",
};

export const languageShortNames: Record<Language, string> = {
  en: "EN",
  ka: "KA",
};

const translations = {
  en: {
    "brand.tagline": "Food rescue marketplace",
    "nav.offers": "Offers",
    "nav.orders": "Orders",
    "nav.favorites": "Favorites",
    "nav.dashboard": "Dashboard",
    "nav.admin": "Admin",
    "nav.forBusiness": "For Business",
    "nav.logout": "Logout",
    "nav.signIn": "Sign In",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",
    "language.switcherLabel": "Choose language",
  },
  ka: {
    "brand.tagline": "საკვების გადარჩენის მარკეტი",
    "nav.offers": "შეთავაზებები",
    "nav.orders": "შეკვეთები",
    "nav.favorites": "რჩეულები",
    "nav.dashboard": "დაფა",
    "nav.admin": "ადმინი",
    "nav.forBusiness": "ბიზნესისთვის",
    "nav.logout": "გასვლა",
    "nav.signIn": "შესვლა",
    "nav.openMenu": "მენიუს გახსნა",
    "nav.closeMenu": "მენიუს დახურვა",
    "language.switcherLabel": "ენის არჩევა",
  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof (typeof translations)[typeof defaultLanguage];

export function isSupportedLanguage(value: string | null): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function translate(language: Language, key: TranslationKey) {
  return translations[language][key] || translations[defaultLanguage][key];
}
