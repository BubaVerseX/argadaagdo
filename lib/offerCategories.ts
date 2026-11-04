// Green Bag taxonomy. A Green Bag (Georgian: მწვანე ჩანთა) is the product;
// the category is a tag under it and the size (S / M / L) carries its own
// price. Category and size values are stored in English in offers.category /
// offers.size; the Georgian labels below are display-only.

export const OFFER_CATEGORIES = [
  "Bakery",
  "Fruit & veg",
  "Dairy",
  "Deli",
  "Mixed",
] as const;

export type OfferCategory = (typeof OFFER_CATEGORIES)[number];

export const DEFAULT_OFFER_CATEGORY: OfferCategory = "Bakery";
export const FALLBACK_OFFER_CATEGORY: OfferCategory = "Mixed";

// Categories stored before the Green Bag model (Cafe, Restaurant, Grocery,
// Other). Rows keep their value; the UI shows them under the closest tag.
const legacyCategoryMap: Record<string, OfferCategory> = {
  Cafe: "Mixed",
  Restaurant: "Deli",
  Grocery: "Mixed",
  Other: "Mixed",
  Produce: "Fruit & veg",
  Vegetables: "Fruit & veg",
};

export function normalizeOfferCategory(
  value: string | null | undefined
): OfferCategory {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return FALLBACK_OFFER_CATEGORY;

  if (OFFER_CATEGORIES.includes(trimmedValue as OfferCategory)) {
    return trimmedValue as OfferCategory;
  }

  return legacyCategoryMap[trimmedValue] ?? FALLBACK_OFFER_CATEGORY;
}

const georgianCategoryLabels: Record<OfferCategory, string> = {
  Bakery: "ცომეული",
  "Fruit & veg": "ხილ-ბოსტნეული",
  Dairy: "რძის ნაწარმი",
  Deli: "კულინარია",
  Mixed: "შერეული",
};

export function getOfferCategoryLabel(
  value: string | null | undefined,
  language: "en" | "ka"
) {
  const category = normalizeOfferCategory(value);
  return language === "ka" ? georgianCategoryLabels[category] : category;
}

// Category colours live in app/globals.css as .cat-* classes.
const categoryToneClasses: Record<OfferCategory, string> = {
  Bakery: "cat-bakery",
  "Fruit & veg": "cat-produce",
  Dairy: "cat-dairy",
  Deli: "cat-deli",
  Mixed: "cat-mixed",
};

/** The .cat-* class for a stored category, legacy values included. */
export function getOfferCategoryTone(value: string | null | undefined) {
  return categoryToneClasses[normalizeOfferCategory(value)];
}

// Sizes ---------------------------------------------------------------------

export const BAG_SIZES = ["S", "M", "L"] as const;

export type BagSize = (typeof BAG_SIZES)[number];

export const DEFAULT_BAG_SIZE: BagSize = "M";

export function normalizeBagSize(
  value: string | null | undefined
): BagSize | null {
  const trimmedValue = value?.trim().toUpperCase();
  return BAG_SIZES.includes(trimmedValue as BagSize)
    ? (trimmedValue as BagSize)
    : null;
}

const sizeLabels: Record<BagSize, { en: string; ka: string }> = {
  S: { en: "Small", ka: "პატარა" },
  M: { en: "Medium", ka: "საშუალო" },
  L: { en: "Large", ka: "დიდი" },
};

/** "S", "M", "L" as shown on badges. */
export function getBagSizeBadge(value: string | null | undefined) {
  return normalizeBagSize(value);
}

/** "Medium" / "საშუალო". */
export function getBagSizeLabel(
  value: string | null | undefined,
  language: "en" | "ka"
) {
  const size = normalizeBagSize(value);
  return size ? sizeLabels[size][language] : "";
}

/** "Green Bag M · Bakery" / "მწვანე ჩანთა M · ცომეული" — the product line. */
export function getGreenBagLabel(
  offer: { size?: string | null; category?: string | null },
  language: "en" | "ka"
) {
  const base = language === "ka" ? "მწვანე ჩანთა" : "Green Bag";
  const size = normalizeBagSize(offer.size);
  const category = getOfferCategoryLabel(offer.category, language);
  return `${base}${size ? ` ${size}` : ""} · ${category}`;
}
