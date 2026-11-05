"use client";

import { useLanguage } from "@/lib/useLanguage";

export type QuickPanel = "publish" | "collect" | null;

/** The dashboard's home: the three things a shop does every day. */
export function BusinessQuickActions({
  activePanel,
  reservedCount,
  salesPaused,
  busy,
  onSelectPanel,
  onToggleSales,
}: {
  activePanel: QuickPanel;
  reservedCount: number;
  salesPaused: boolean;
  busy: boolean;
  onSelectPanel: (panel: QuickPanel) => void;
  onToggleSales: () => void;
}) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const tileClass =
    "min-h-28 rounded-3xl p-5 text-left text-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-36";

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <button
        type="button"
        aria-expanded={activePanel === "publish"}
        onClick={() => onSelectPanel(activePanel === "publish" ? null : "publish")}
        className={`${tileClass} premium-button`}
      >
        {isGeorgian ? "ლანჩ ბოქსის გამოქვეყნება" : "Publish bag"}
      </button>

      <button
        type="button"
        aria-expanded={activePanel === "collect"}
        onClick={() => onSelectPanel(activePanel === "collect" ? null : "collect")}
        className={`${tileClass} ui-card text-cream`}
      >
        {isGeorgian ? "შეკვეთის გაცემა" : "Collect order"}
        {reservedCount > 0 && (
          <span className="mt-1 block text-sm font-medium text-mint">
            {isGeorgian ? `${reservedCount} ელოდება` : `${reservedCount} waiting`}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onToggleSales}
        disabled={busy}
        aria-pressed={salesPaused}
        className={`${tileClass} ${salesPaused ? "bg-warning-soft text-warning" : "ui-card text-cream"}`}
      >
        {salesPaused
          ? isGeorgian
            ? "გაყიდვების განახლება"
            : "Resume sales"
          : isGeorgian
            ? "დღეს: ლანჩ ბოქსები აღარ არის"
            : "Today: no bags"}
      </button>
    </div>
  );
}
