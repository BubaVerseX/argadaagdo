import type { Language } from "@/lib/i18n";

// Shared content helpers for the public information pages (terms, privacy,
// FAQ, about, contact, support, for businesses). Every fact in these files was
// checked against the code and migrations on 6 November 2026; update the
// copy whenever the behaviour it describes changes.

export type Localized<T> = Record<Language, T>;

export type ContentSection = {
  /** Optional anchor, e.g. "delete-account" (linked from the store listings). */
  id?: string;
  title: string;
  /** Rendered in this order: paragraphs, bullets, note. */
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const SUPPORT_EMAIL = "argadaagdo.support@gmail.com";

// Who runs ArGadaagdo (from the owner, 6 Nov 2026). Public pages show only the
// name and "Tbilisi, Georgia"; the ID code and tax status appear only in the
// Terms' operator section. Never publish the street address.
export const OPERATOR_NAME: Localized<string> = {
  en: "Individual Entrepreneur Bidzina Abesadze (ი/მ ბიძინა აბესაძე)",
  ka: "ი/მ ბიძინა აბესაძე",
};
/** Short form for footers. */
export const OPERATOR_SHORT: Localized<string> = {
  en: "IE Bidzina Abesadze",
  ka: "ი/მ ბიძინა აბესაძე",
};
export const OPERATOR_LOCATION: Localized<string> = {
  en: "Tbilisi, Georgia",
  ka: "თბილისი, საქართველო",
};
const OPERATOR_ID_CODE = "01027078110";

export const MINIMUM_AGE = 18;

/** One sentence naming the operator (no ID code), for Privacy and Terms. */
export function operatorSentence(language: Language) {
  return language === "ka"
    ? `არ გადააგდოს მართავს ${OPERATOR_NAME.ka}, ინდივიდუალური მეწარმე (${OPERATOR_LOCATION.ka}).`
    : `ArGadaagdo is run by ${OPERATOR_NAME.en}, ${OPERATOR_LOCATION.en}.`;
}

/** The Terms' operator section: the only place with the ID code. */
export const operatorDetails: Localized<string[]> = {
  en: [
    `Operator: ${OPERATOR_NAME.en}`,
    "Legal form: individual entrepreneur, registered in Georgia",
    `Identification code: ${OPERATOR_ID_CODE}`,
    "Tax status: small business status, granted by the Revenue Service of Georgia on 30 September 2026",
    `Location: ${OPERATOR_LOCATION.en}`,
    `Email: ${SUPPORT_EMAIL}`,
  ],
  ka: [
    `ოპერატორი: ${OPERATOR_NAME.ka}`,
    "სამართლებრივი ფორმა: ინდივიდუალური მეწარმე, რეგისტრირებული საქართველოში",
    `საიდენტიფიკაციო კოდი: ${OPERATOR_ID_CODE}`,
    "საგადასახადო სტატუსი: მცირე ბიზნესის სტატუსი, მინიჭებული შემოსავლების სამსახურის მიერ 2026 წლის 30 სექტემბერს",
    `მდებარეობა: ${OPERATOR_LOCATION.ka}`,
    `ელფოსტა: ${SUPPORT_EMAIL}`,
  ],
};

export const LEGAL_LAST_UPDATED: Localized<string> = {
  en: "Last updated: 10 November 2026",
  ka: "ბოლო განახლება: 2026 წლის 10 ნოემბერი",
};
