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

export const LEGAL_LAST_UPDATED: Localized<string> = {
  en: "Last updated: 6 November 2026",
  ka: "ბოლო განახლება: 2026 წლის 6 ნოემბერი",
};
