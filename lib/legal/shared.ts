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

// Who runs ArGadaagdo (confirmed by the owner on 6 Nov 2026). The ID code and
// registered address are added once the owner sends them; empty = not shown.
const OPERATOR_ID_CODE = "";
const OPERATOR_ADDRESS: Localized<string> = { en: "", ka: "" };

export const MINIMUM_AGE = 18;

/** One sentence naming the operator, for Terms and Privacy. */
export function operatorSentence(language: Language) {
  const address = OPERATOR_ADDRESS[language];
  if (language === "ka") {
    return (
      "არ გადააგდოს მართავს ი/მ ბიძინა აბესაძე (ინდივიდუალური მეწარმე, საქართველო)" +
      (OPERATOR_ID_CODE ? `, საიდენტიფიკაციო კოდი ${OPERATOR_ID_CODE}` : "") +
      (address ? `, იურიდიული მისამართი: ${address}` : "") +
      "."
    );
  }
  return (
    "ArGadaagdo is run by Individual Entrepreneur Bidzina Abesadze (ი/მ ბიძინა აბესაძე), registered in Georgia" +
    (OPERATOR_ID_CODE ? `, identification code ${OPERATOR_ID_CODE}` : "") +
    (address ? `, registered address: ${address}` : "") +
    "."
  );
}

export const LEGAL_LAST_UPDATED: Localized<string> = {
  en: "Last updated: 6 November 2026",
  ka: "ბოლო განახლება: 2026 წლის 6 ნოემბერი",
};
