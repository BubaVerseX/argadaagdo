"use client";

import { useLanguage } from "@/lib/useLanguage";

export type QuickPanel = "publish" | "collect" | "numbers" | "shop" | null;

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
    <div id="business-quick-actions" className="mt-6 grid scroll-mt-24 gap-3 sm:grid-cols-3">
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
            ? "დღეს გაყიდვის შეჩერება"
            : "Stop sales for today"}
      </button>
    </div>
  );
}

/** A clear way out of an open panel, since a second tap on the tile isn't obvious. */
export function QuickPanelClose({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        onClick={() => {
          onClose();
          document
            .getElementById("business-quick-actions")
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }}
        className="ui-card inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-cream transition hover:text-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
      >
        <span aria-hidden="true">✕</span>
        {isGeorgian ? "დახურვა" : "Close"}
      </button>
    </div>
  );
}
