import type { Language } from "@/lib/i18n";

// Customer levels by Lunch Boxes collected. Shown on the profile and on the
// shareable impact card.
export type ImpactLevelId = "seedling" | "sprout" | "tree" | "forest";

export type ImpactLevel = {
  id: ImpactLevelId;
  /** Boxes needed to reach this level. */
  min: number;
  name: Record<Language, string>;
  /** Georgian "up to <level>" form, e.g. ყლორტამდე. */
  untilKa: string;
};

export const IMPACT_LEVELS: ImpactLevel[] = [
  { id: "seedling", min: 1, name: { ka: "აღმონაცენი", en: "Seedling" }, untilKa: "აღმონაცენამდე" },
  { id: "sprout", min: 5, name: { ka: "ყლორტი", en: "Sprout" }, untilKa: "ყლორტამდე" },
  { id: "tree", min: 20, name: { ka: "ხე", en: "Tree" }, untilKa: "ხემდე" },
  { id: "forest", min: 50, name: { ka: "ტყე", en: "Forest" }, untilKa: "ტყემდე" },
];

export type ImpactProgress = {
  current: ImpactLevel | null;
  next: ImpactLevel | null;
  /** 0–1 towards the next level (1 at the top level). */
  progress: number;
  /** Boxes still needed for the next level. */
  remaining: number;
};

export function getImpactProgress(boxes: number): ImpactProgress {
  const count = Math.max(0, Math.floor(boxes));
  let current: ImpactLevel | null = null;
  for (const level of IMPACT_LEVELS) {
    if (count >= level.min) current = level;
  }
  const next = IMPACT_LEVELS.find((level) => level.min > count) || null;
  if (!next) return { current, next: null, progress: 1, remaining: 0 };
  const from = current?.min ?? 0;
  return {
    current,
    next,
    progress: Math.min(1, Math.max(0, (count - from) / (next.min - from))),
    remaining: next.min - count,
  };
}
