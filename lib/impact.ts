import type { Language } from "@/lib/i18n";

// Impact estimate shown to customers and businesses. One Green Bag is counted
// as roughly 1 kg of food, and 1 kg of saved food as 2.7 kg of CO₂e avoided
// (the figure used across food-rescue apps). Both are estimates, labelled as
// such in the UI.
export const KG_FOOD_PER_BAG = 1;
export const KG_CO2_PER_KG_FOOD = 2.7;

export type Impact = {
  bags: number;
  foodKg: number;
  co2Kg: number;
};

export function calculateImpact(bags: number): Impact {
  const safeBags = Math.max(0, Math.round(bags));
  const foodKg = safeBags * KG_FOOD_PER_BAG;
  return {
    bags: safeBags,
    foodKg,
    co2Kg: Math.round(foodKg * KG_CO2_PER_KG_FOOD * 10) / 10,
  };
}

export function formatKg(value: number, language: Language) {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded} ${language === "ka" ? "კგ" : "kg"}`;
}

/** "You saved 12 bags ≈ 12 kg food ≈ 32.4 kg CO₂" */
export function formatImpactSentence(impact: Impact, language: Language, subject: "you" | "store") {
  const bagsWord =
    language === "ka"
      ? "ჩანთა"
      : impact.bags === 1
      ? "bag"
      : "bags";
  if (language === "ka") {
    return `${subject === "you" ? "შენ გადაარჩინე" : "მაღაზიამ გადაარჩინა"} ${impact.bags} ${bagsWord} ≈ ${formatKg(impact.foodKg, language)} საკვები ≈ ${formatKg(impact.co2Kg, language)} CO₂`;
  }
  return `${subject === "you" ? "You saved" : "This store saved"} ${impact.bags} ${bagsWord} ≈ ${formatKg(impact.foodKg, language)} food ≈ ${formatKg(impact.co2Kg, language)} CO₂`;
}

export function getMonthKey(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}

export function formatMonthLabel(monthKey: string, language: Language) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat(language === "ka" ? "ka-GE" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function listRecentMonthKeys(count = 12) {
  const keys: string[] = [];
  const now = new Date();
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

// 1080 × 1080 share image drawn on a canvas (brand colours from globals.css).
export async function renderImpactShareImage(options: {
  impact: Impact;
  language: Language;
  headline: string;
  subline: string;
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, "#1C4A40");
  gradient.addColorStop(1, "#07241F");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1080);

  // Leaf tile
  context.fillStyle = "#133832";
  roundedRect(context, 80, 80, 120, 120, 32);
  context.fill();
  context.fillStyle = "#DAF1DE";
  context.beginPath();
  context.moveTo(110, 170);
  context.quadraticCurveTo(110, 100, 175, 108);
  context.quadraticCurveTo(178, 170, 110, 170);
  context.fill();

  const fontFamily = '"Noto Sans Georgian", "Noto Sans", system-ui, sans-serif';
  context.fillStyle = "#F4EFE4";
  context.font = `600 44px ${fontFamily}`;
  context.fillText(options.language === "ka" ? "არ გადააგდო" : "ArGadaagdo", 230, 158);

  context.fillStyle = "#9DBFA8";
  context.font = `500 34px ${fontFamily}`;
  context.fillText(options.headline, 80, 330);

  context.fillStyle = "#DAF1DE";
  context.font = `600 150px ${fontFamily}`;
  context.fillText(String(options.impact.bags), 80, 500);
  context.fillStyle = "#F4EFE4";
  context.font = `600 48px ${fontFamily}`;
  context.fillText(
    options.language === "ka" ? "მწვანე ჩანთა გადარჩენილია" : "Green Bags saved",
    80,
    570
  );

  const rows = [
    [`≈ ${formatKg(options.impact.foodKg, options.language)}`, options.language === "ka" ? "საკვები" : "of food rescued"],
    [`≈ ${formatKg(options.impact.co2Kg, options.language)} CO₂`, options.language === "ka" ? "თავიდან აცილებული" : "avoided"],
  ];
  rows.forEach(([value, label], index) => {
    const y = 700 + index * 130;
    context.fillStyle = "#133832";
    roundedRect(context, 80, y - 70, 920, 104, 28);
    context.fill();
    context.fillStyle = "#DAF1DE";
    context.font = `600 46px ${fontFamily}`;
    context.fillText(value, 110, y);
    context.fillStyle = "#C3DDCB";
    context.font = `400 32px ${fontFamily}`;
    context.fillText(label, 110 + context.measureText(value).width + 220, y);
  });

  context.fillStyle = "#9DBFA8";
  context.font = `400 30px ${fontFamily}`;
  context.fillText(options.subline, 80, 1000);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
