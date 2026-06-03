export function createMapsSearchUrl(
  address: string | null | undefined,
  businessName?: string | null
) {
  const query = [businessName, address, "Tbilisi, Georgia"]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query || "Tbilisi, Georgia"
  )}`;
}
