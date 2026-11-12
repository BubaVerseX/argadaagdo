"use client";

import { useEffect, useState } from "react";
import { BellIcon, CheckIcon, ClockIcon } from "@/components/icons";

const TOTAL = 5;
const PRICE = 9;
const VALUE = 25;

/**
 * A small, looping picture of a shop's day: boxes sell one by one, each sale
 * pops a notice, and handed-over boxes get a check. Purely illustrative.
 * With reduced motion it stays still at 3 of 5.
 */
export function HeroDemo({ isGeorgian }: { isGeorgian: boolean }) {
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [sold, setSold] = useState(3);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current = 3;
    let timer = 0;
    const tick = () => {
      current = current >= TOTAL ? 0 : current + 1;
      setSold(current);
      timer = window.setTimeout(tick, current >= TOTAL ? 3600 : current === 0 ? 900 : 1700);
    };
    timer = window.setTimeout(tick, 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const percent = Math.round((sold / TOTAL) * 100);

  return (
    <div className="relative mx-auto w-full max-w-[420px] px-2 py-10 sm:px-6" aria-hidden="true">
      <div className="ag-glow pointer-events-none absolute inset-0 rounded-[48px] bg-[radial-gradient(circle_at_50%_45%,rgba(184,230,196,0.28),transparent_65%)]" />

      <div className="ag-float relative rounded-[28px] bg-white p-5 text-brand-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/lunch-bag.jpg" alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-secondary">
                {L("დღევანდელი ბოქსი", "Today's box")}
              </p>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-mint px-2.5 py-1 text-[11px] font-bold text-brand-forest">
                <span className="ag-pulse-dot h-2 w-2 rounded-full bg-brand-forest" />
                {L("აპშია", "Live")}
              </span>
            </div>
            <p className="mt-0.5 truncate text-lg font-bold">{L("საცხობის ბოქსი", "Bakery box")}</p>
            <p className="flex items-center gap-1.5 text-xs text-brand-secondary">
              <ClockIcon className="h-3.5 w-3.5" strokeWidth={2} />
              19:00–21:00 · <span className="font-bold text-brand-ink">{PRICE} ₾</span>
              <span className="line-through">{VALUE} ₾</span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-6xl font-extrabold leading-none tabular-nums">{sold}</span>
          <span className="text-2xl font-bold text-brand-secondary">/ {TOTAL}</span>
          <span className="text-sm font-semibold text-brand-forest-2">{L("გაიყიდა", "sold")}</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#efe7d3]">
          <div
            className="h-full rounded-full bg-brand-forest transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-ground px-4 py-3 text-sm">
          <span className="text-brand-secondary">{L("გაყიდვები დღეს", "Sales today")}</span>
          <span className="text-base font-extrabold tabular-nums text-brand-ink">{sold * PRICE} ₾</span>
        </div>
      </div>

      {sold > 0 && (
        <div
          key={`sale-${sold}`}
          className="ag-pop-in absolute right-0 top-2 flex items-center gap-2 rounded-2xl bg-brand-forest px-3.5 py-2.5 text-sm font-semibold text-brand-ground shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
        >
          <BellIcon className="h-4 w-4 text-brand-mint" strokeWidth={2} />
          {L("ახალი ჯავშანი", "New order")}
          <span className="font-extrabold text-brand-mint">+{PRICE} ₾</span>
        </div>
      )}

      {sold >= 3 && (
        <div className="ag-pop-in absolute bottom-1 left-0 flex items-center gap-2 rounded-2xl bg-brand-mint px-3.5 py-2.5 text-sm font-bold text-brand-forest shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)]">
          <CheckIcon className="h-4 w-4" strokeWidth={2.6} />
          {L("გაცემულია", "Handed over")}
          <span className="font-semibold tabular-nums opacity-80">· 482 917</span>
        </div>
      )}
    </div>
  );
}
