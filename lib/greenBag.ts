import type { Language } from "@/lib/i18n";
import { getTbilisiDateKey } from "@/lib/offerLifecycle";
import { siteUrl } from "@/lib/site";
import type { Department } from "@/lib/types";

// ISO weekdays as stored in bag_templates.days_of_week (1 = Monday).
export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const weekdayLabels: Record<Language, string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ka: ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"],
};

export function getWeekdayLabel(isoDay: number, language: Language) {
  return weekdayLabels[language][isoDay - 1] ?? String(isoDay);
}

export function formatWeekdays(days: number[], language: Language) {
  if (days.length >= 7) return language === "ka" ? "ყოველდღე" : "Every day";
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => getWeekdayLabel(day, language))
    .join(" · ");
}

/** "Stop sales for today" is stored as the Tbilisi date it was pressed on. */
export function isSalesPausedToday(value: string | null | undefined) {
  return Boolean(value) && value === getTbilisiDateKey();
}

export function getDepartmentDisplayName(
  department: Pick<Department, "name" | "is_default"> | null | undefined,
  language: Language
) {
  if (!department) return language === "ka" ? "მთავარი" : "Main";
  if (department.is_default && department.name === "Main") {
    return language === "ka" ? "მთავარი" : "Main";
  }
  return department.name;
}

export function getStaffPageUrl(departmentId: number) {
  return new URL(`/staff/${departmentId}`, siteUrl).toString();
}

/** What customers see as the remaining count; "until stopped" boxes show no number. */
export function formatBagsLeft(
  offer: { quantity?: number | null; unlimited_quantity?: boolean | null },
  language: Language
) {
  if (offer.unlimited_quantity) {
    return language === "ka" ? "ხელმისაწვდომია" : "Available";
  }
  return String(Number(offer.quantity ?? 0));
}

export const UNLIMITED_DAILY_QUANTITY = 500;
