// Rules for the profile name, photo and phone, shared by the website and the
// app screens. Pure functions only (no imports), so tests/*.test.mjs can load
// this file directly with Node.

export const NAME_MAX_LENGTH = 30;
export const NAME_CHANGE_DAYS = 30;

// Same pattern as public.set_my_display_name() in
// supabase/migrations/20261107090000_profile_name_avatar.sql: letters only
// (Georgian, Latin incl. accents, Cyrillic), with a single space, hyphen or
// apostrophe between parts. Keep the two in sync.
export const NAME_PATTERN =
  /^[A-Za-zÀ-ÖØ-öø-ÿა-ჿА-Яа-яЁё]+([ '’-][A-Za-zÀ-ÖØ-öø-ÿა-ჿА-Яа-яЁё]+)*$/;

/** Trims and collapses inner whitespace, as the database does before saving. */
export function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export type NameCheck = "ok" | "empty" | "too_long" | "invalid";

export function checkName(value: string): NameCheck {
  const clean = cleanName(value);
  if (!clean) return "empty";
  if (clean.length > NAME_MAX_LENGTH) return "too_long";
  return NAME_PATTERN.test(clean) ? "ok" : "invalid";
}

/** When the name may change again; null when it was never changed. */
export function nextNameChangeAt(changedAt: string | null | undefined) {
  if (!changedAt) return null;
  const time = Date.parse(changedAt);
  if (!Number.isFinite(time)) return null;
  return new Date(time + NAME_CHANGE_DAYS * 24 * 60 * 60 * 1000);
}

export function isNameLocked(nextChangeAt: Date | null, now = new Date()) {
  return nextChangeAt !== null && nextChangeAt.getTime() > now.getTime();
}

/** 07.12.2026: day.month.year in Tbilisi time. */
export function formatTbilisiDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("day")}.${part("month")}.${part("year")}`;
}

/** A verified Georgian mobile ("995555123456") as "+995 555 12 34 56". */
export function formatGeorgianPhone(phone: string | null | undefined) {
  const digits = (phone || "").replace(/\D/g, "");
  const national = digits.startsWith("995") ? digits.slice(3) : digits;
  if (/^5\d{8}$/.test(national)) {
    return `+995 ${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
  }
  return digits ? `+${digits}` : "";
}

// iOS builds before 7 have no camera / photo-library usage text in Info.plist,
// and a file input there offers "Take Photo", which crashes the app.
export const AVATAR_MIN_IOS_BUILD = 7;

/**
 * Whether this app or website can offer the photo picker. `app` is null on
 * the website; `build` is the native build number (CFBundleVersion /
 * versionCode) as reported by Capacitor's App.getInfo().
 */
export function canPickAvatar(
  app: { platform: string; build: string | number | null } | null
) {
  if (!app) return true;
  if (app.platform !== "ios") return true;
  const build = Number(app.build);
  return Number.isFinite(build) && build >= AVATAR_MIN_IOS_BUILD;
}

/** Initials for the photo circle: "Nino Beridze" → "NB". */
export function nameInitials(name: string) {
  const parts = name
    .replace(/@.*/, "")
    .split(/[\s._'’-]+/)
    .filter(Boolean);
  // Georgian (Mkhedruli) stays as is: upper-casing turns it into Mtavruli.
  const letter = (part: string | undefined) => {
    const char = Array.from(part || "")[0] || "";
    return /[ა-ჿ]/.test(char) ? char : char.toUpperCase();
  };
  return letter(parts[0]) + letter(parts[1]) || "A";
}
