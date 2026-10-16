import type { Language } from "@/lib/i18n";

// Text that a server component (for example a route's loading.tsx, which
// cannot read the selected language) can hand to a client component: either a
// fixed string, or one string per language that the client picks from.
export type LocalizedText = string | Record<Language, string>;

export function resolveLocalizedText(value: LocalizedText, language: Language) {
  return typeof value === "string" ? value : value[language];
}
