// Field rules for phone and business verification. No imports, so `npm test`
// can load this file directly. The database repeats the IBAN and ID code rules
// (supabase/migrations/20261105120000_business_verification.sql).

export const LEGAL_FORMS = [
  { value: "ie", ka: "ინდივიდუალური მეწარმე (ი.მ.)", en: "Individual entrepreneur (I.E.)" },
  { value: "llc", ka: "შეზღუდული პასუხისმგებლობის საზოგადოება (შპს)", en: "Limited liability company (LLC)" },
  { value: "jsc", ka: "სააქციო საზოგადოება (სს)", en: "Joint stock company (JSC)" },
  { value: "gp", ka: "სოლიდარული პასუხისმგებლობის საზოგადოება (სპს)", en: "General partnership (GP)" },
  { value: "lp", ka: "კომანდიტური საზოგადოება (კს)", en: "Limited partnership (LP)" },
  { value: "cooperative", ka: "კოოპერატივი", en: "Cooperative" },
  { value: "nnle", ka: "არასამეწარმეო (არაკომერციული) იურიდიული პირი (ა(ა)იპ)", en: "Non-profit legal entity (NNLE)" },
  { value: "other", ka: "სხვა", en: "Other" },
] as const;

export type LegalForm = (typeof LEGAL_FORMS)[number]["value"];

export function normalizeIban(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

/** TBC Bank IBAN: 22 characters in total, GEkkTB + 16 digits, mod-97 checksum. */
export function isValidTbcIban(value: string) {
  const iban = normalizeIban(value);

  if (!/^GE[0-9]{2}TB[0-9]{16}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;

  for (const character of rearranged) {
    const digits = /[A-Z]/.test(character)
      ? String(character.charCodeAt(0) - 55)
      : character;

    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
}

/** საიდენტიფიკაციო კოდი: 9 digits, or 11 for a personal number. */
export function isValidIdCode(value: string) {
  return /^([0-9]{9}|[0-9]{11})$/.test(value.trim());
}

/**
 * A Georgian mobile number in E.164 form (+9955XXXXXXXX), or null. Accepts
 * spaces and dashes, with or without the country code.
 */
export function normalizeGeorgianMobile(value: string) {
  const digits = value.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("995") ? digits.slice(3) : digits;

  return /^5[0-9]{8}$/.test(national) ? `+995${national}` : null;
}

export const REGISTRY_EXTRACT_MAX_BYTES = 10 * 1024 * 1024;
export const REGISTRY_EXTRACT_MIME_TYPES = ["application/pdf", "image/jpeg"];

export function isValidRegistryExtract(file: { type: string; size: number }) {
  return (
    REGISTRY_EXTRACT_MIME_TYPES.includes(file.type) &&
    file.size > 0 &&
    file.size <= REGISTRY_EXTRACT_MAX_BYTES
  );
}
