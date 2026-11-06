// Business types are stored in English ("Bakery", "Cafe", …). Customers
// reading Georgian pages see the Georgian word.
export const georgianBusinessTypes: Record<string, string> = {
  Cafe: "კაფე",
  Bakery: "საცხობი",
  Restaurant: "რესტორანი",
  Supermarket: "სუპერმარკეტი",
  Hotel: "სასტუმრო",
  Other: "სხვა",
};

export function formatBusinessType(
  type: string | null | undefined,
  language: string
): string {
  const value = type?.trim();
  if (!value) return "";
  return language === "ka" ? georgianBusinessTypes[value] || value : value;
}
