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
