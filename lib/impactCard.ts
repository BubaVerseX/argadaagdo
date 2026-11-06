import type { Language } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";
import type { ImpactLevel } from "@/lib/impactLevels";

// The "Share my impact" image: 1080×1920, the size of an Instagram story.
// Drawn on a canvas in the brand's light look (beige ground, faint lines and
// leaves, a white card), so it needs no server.

const W = 1080;
const H = 1920;
const SERIF = '"Noto Serif", "Noto Serif Georgian", Georgia, serif';
const SANS = '"Noto Sans", "Noto Sans Georgian", system-ui, sans-serif';
const INK = "#0b2b26";
const FOREST = "#0f3a32";
const BODY = "#5b736b";
const LEAF_PATH = "M18 84 C14 50 38 20 84 14 C88 52 62 82 22 86 Z";
const VEIN_PATH = "M20 84 C40 62 58 42 82 16";

export type ImpactCardData = {
  boxes: number;
  moneySaved: number;
  co2Kg: number;
  level: ImpactLevel | null;
  language: Language;
};

function fitFont(context: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxWidth: number) {
  let current = size;
  context.font = `${weight} ${current}px ${family}`;
  while (context.measureText(text).width > maxWidth && current > 20) {
    current -= 4;
    context.font = `${weight} ${current}px ${family}`;
  }
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function leaf(context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, fill: string, vein: string) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.scale(size / 100, size / 100);
  context.fillStyle = fill;
  context.fill(new Path2D(LEAF_PATH));
  context.strokeStyle = vein;
  context.lineWidth = 2.4;
  context.stroke(new Path2D(VEIN_PATH));
  context.restore();
}

export async function drawImpactCard(data: ImpactCardData): Promise<Blob> {
  const ka = data.language === "ka";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d")!;

  // The page's own fonts (self-hosted), Georgian included.
  await Promise.all([
    document.fonts.load(`700 200px ${SERIF}`, "0123456789 ₾ აბგ ArGadaagdo"),
    document.fonts.load(`400 40px ${SANS}`, "ა abc"),
    document.fonts.load(`700 40px ${SANS}`, "ა abc"),
  ]).catch(() => undefined);

  // Ground and faint flowing lines.
  const ground = context.createLinearGradient(0, 0, 0, H);
  ground.addColorStop(0, "#fbf7ee");
  ground.addColorStop(0.45, "#f7f1e3");
  ground.addColorStop(1, "#efe5cf");
  context.fillStyle = ground;
  context.fillRect(0, 0, W, H);
  context.lineWidth = 2;
  for (let i = 0; i < 34; i++) {
    const base = 60 + i * 58;
    context.beginPath();
    for (let x = 0; x <= W + 12; x += 12) {
      const y = base + Math.sin(x * 0.008 + i * 0.35) * 26 + Math.sin(x * 0.0032 + i * 0.2) * 40;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = i % 4 === 3 ? "rgba(201,165,90,0.12)" : "rgba(95,140,110,0.09)";
    context.stroke();
  }
  leaf(context, 70, 330, 130, -0.3, "#cfe6d3", "#8db89a");
  leaf(context, 900, 250, 110, 0.5, "#f2d9a0", "#c9a55a");
  leaf(context, 940, 1470, 150, 0.2, "#bfddc6", "#7faf8d");
  leaf(context, 60, 1560, 100, -0.6, "#f0cdbb", "#c98f72");
  leaf(context, 820, 1700, 90, 1.1, "#cfe6d3", "#8db89a");

  // Brand.
  context.save();
  context.translate(W / 2 - 230, 150);
  roundRect(context, 0, 0, 96, 96, 24);
  context.fillStyle = FOREST;
  context.fill();
  context.scale(0.48, 0.48);
  context.fillStyle = "#b8e6c4";
  context.fill(new Path2D("M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"));
  context.restore();
  context.fillStyle = INK;
  context.font = `700 60px ${SERIF}`;
  context.textBaseline = "middle";
  context.fillText("ArGadaagdo", W / 2 - 110, 200);

  // The card.
  const cardX = 90;
  const cardY = 430;
  const cardW = W - 180;
  const cardH = 980;
  context.save();
  context.shadowColor = "rgba(15,58,50,0.08)";
  context.shadowBlur = 60;
  context.shadowOffsetY = 20;
  roundRect(context, cardX, cardY, cardW, cardH, 64);
  context.fillStyle = "rgba(255,253,248,0.94)";
  context.fill();
  context.restore();
  roundRect(context, cardX, cardY, cardW, cardH, 64);
  context.strokeStyle = "rgba(15,58,50,0.08)";
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = BODY;
  context.font = `500 44px ${SANS}`;
  context.fillText(ka ? "ჩემი გავლენა" : "My impact", W / 2, cardY + 110);

  context.fillStyle = FOREST;
  fitFont(context, String(data.boxes), 700, 260, SERIF, cardW - 120);
  context.fillText(String(data.boxes), W / 2, cardY + 330);
  context.fillStyle = INK;
  fitFont(context, ka ? "გადარჩენილი ლანჩ ბოქსი" : data.boxes === 1 ? "Lunch Box rescued" : "Lunch Boxes rescued", 600, 48, SANS, cardW - 120);
  context.fillText(ka ? "გადარჩენილი ლანჩ ბოქსი" : data.boxes === 1 ? "Lunch Box rescued" : "Lunch Boxes rescued", W / 2, cardY + 500);

  context.strokeStyle = "rgba(15,58,50,0.1)";
  context.beginPath();
  context.moveTo(cardX + 80, cardY + 600);
  context.lineTo(cardX + cardW - 80, cardY + 600);
  context.stroke();

  const stats = [
    { value: `${data.moneySaved} ₾`, label: ka ? "დაზოგილი" : "saved" },
    { value: formatKg(data.co2Kg, data.language), label: ka ? "CO₂ ნაკლები" : "less CO₂" },
  ];
  stats.forEach((stat, index) => {
    const x = cardX + cardW * (index === 0 ? 0.27 : 0.73);
    context.fillStyle = FOREST;
    fitFont(context, stat.value, 700, 96, SERIF, cardW / 2 - 60);
    context.fillText(stat.value, x, cardY + 740);
    context.fillStyle = BODY;
    context.font = `400 40px ${SANS}`;
    context.fillText(stat.label, x, cardY + 840);
  });

  // Level pill.
  if (data.level) {
    const label = ka ? `დონე: ${data.level.name.ka}` : `Level: ${data.level.name.en}`;
    context.font = `600 44px ${SANS}`;
    const width = context.measureText(label).width + 110;
    roundRect(context, W / 2 - width / 2, cardY + cardH + 70, width, 104, 52);
    context.fillStyle = FOREST;
    context.fill();
    context.fillStyle = "#f7f1e3";
    context.fillText(label, W / 2, cardY + cardH + 124);
  }

  // Footer.
  context.fillStyle = BODY;
  context.font = `400 38px ${SANS}`;
  context.fillText(ka ? "კარგი საკვები არ უნდა გადაიყაროს" : "Good food shouldn't go to waste", W / 2, H - 200);
  context.fillStyle = FOREST;
  context.font = `700 44px ${SANS}`;
  context.fillText("argadaagdo.ge", W / 2, H - 130);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image failed"))), "image/png")
  );
}
