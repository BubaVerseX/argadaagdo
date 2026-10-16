export const OFFER_CATEGORIES = [
  "Bakery",
  "Cafe",
  "Restaurant",
  "Grocery",
  "Mixed",
  "Other",
] as const;

export type OfferCategory = (typeof OFFER_CATEGORIES)[number];

export const DEFAULT_OFFER_CATEGORY: OfferCategory = "Bakery";
export const FALLBACK_OFFER_CATEGORY: OfferCategory = "Other";

export function normalizeOfferCategory(
  value: string | null | undefined
): OfferCategory {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return FALLBACK_OFFER_CATEGORY;

  return OFFER_CATEGORIES.includes(trimmedValue as OfferCategory)
    ? (trimmedValue as OfferCategory)
    : FALLBACK_OFFER_CATEGORY;
}

const georgianCategoryLabels: Record<OfferCategory, string> = {
  Bakery: "საცხობი",
  Cafe: "კაფე",
  Restaurant: "რესტორანი",
  Grocery: "სასურსათო",
  Mixed: "შერეული",
  Other: "სხვა",
};

// Category values are stored in English; this is only for display.
export function getOfferCategoryLabel(
  value: string | null | undefined,
  language: "en" | "ka"
) {
  const category = normalizeOfferCategory(value);
  return language === "ka" ? georgianCategoryLabels[category] : category;
}
