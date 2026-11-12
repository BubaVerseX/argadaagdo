"use client";

import {
  BarChartIcon,
  ClockIcon,
  PackageIcon,
  PlusIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
} from "@/components/icons";
import { getEffectiveOfferStatus, getTbilisiDateKey } from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import type { QuickPanel } from "@/components/business/BusinessQuickActions";

export type TodayOffer = { offer: Offer; sold: number };

function timeLabel(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

const KA_WEEKDAYS = ["კვი", "ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"];
const KA_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today's Tbilisi date as "ხუთ, 12 ნოე". Built by hand: not every browser ships Georgian date names. */
function todayLabel(isGeorgian: boolean) {
  const [year, month, day] = getTbilisiDateKey().split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const weekdays = isGeorgian ? KA_WEEKDAYS : EN_WEEKDAYS;
  const months = isGeorgian ? KA_MONTHS : EN_MONTHS;
  return `${weekdays[weekday]}, ${day} ${months[month - 1]}`;
}

function formatAmount(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/**
 * The dashboard's home: today's box at a glance, one big handover button,
 * three numbers and four shortcuts. Everything else stays in the sections
 * below, so no existing function is lost.
 */
export function BusinessTodayPanel({
  businessName,
  todayOffers,
  salesPaused,
  pauseBusy,
  updatingOfferId,
  waitingCount,
  earningsToday,
  kgSaved,
  averageRating,
  activeTemplateCount,
  activePanel,
  onAdjustQuantity,
  onToggleSales,
  onSelectPanel,
  onOpenSection,
}: {
  businessName: string;
  todayOffers: TodayOffer[];
  salesPaused: boolean;
  pauseBusy: boolean;
  updatingOfferId: number | null;
  waitingCount: number;
  earningsToday: number;
  kgSaved: number;
  averageRating: number | null;
  activeTemplateCount: number;
  activePanel: QuickPanel;
  onAdjustQuantity: (offer: Offer, delta: number) => void;
  onToggleSales: () => void;
  onSelectPanel: (panel: QuickPanel) => void;
  onOpenSection: (id: string) => void;
}) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const today = todayLabel(isGeorgian);

  const pauseButton = (
    <button
      type="button"
      onClick={onToggleSales}
      disabled={pauseBusy}
      aria-pressed={salesPaused}
      className="min-h-12 flex-1 rounded-2xl bg-brand-honey px-4 text-base font-bold text-brand-ink transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:cursor-not-allowed disabled:opacity-60"
    >
      {salesPaused
        ? isGeorgian
          ? "გაყიდვის განახლება"
          : "Resume sales"
        : isGeorgian
          ? "დღეს შეჩერება"
          : "Stop for today"}
    </button>
  );

  const shortcuts: { label: string; Icon: typeof PackageIcon; onClick: () => void; active?: boolean }[] = [
    {
      label: isGeorgian ? "ბოქსები" : "Boxes",
      Icon: PlusIcon,
      active: activePanel === "publish",
      onClick: () => onSelectPanel(activePanel === "publish" ? null : "publish"),
    },
    {
      label: isGeorgian ? "შეთავაზებები" : "Offers",
      Icon: TagIcon,
      onClick: () => onOpenSection("business-offers"),
    },
    {
      label: isGeorgian ? "ციფრები" : "Numbers",
      Icon: BarChartIcon,
      onClick: () => onOpenSection("business-stats"),
    },
    {
      label: isGeorgian ? "მაღაზია" : "Shop",
      Icon: StoreIcon,
      onClick: () => onOpenSection("business-profile"),
    },
  ];

  return (
    <div id="business-quick-actions" className="scroll-mt-24 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-cream sm:text-2xl">{businessName}</h1>
          <p className="text-sm text-body">{isGeorgian ? "ბიზნესის პანელი" : "Business panel"}</p>
        </div>
        <span className="ui-card shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-cream">
          {today}
        </span>
      </div>

      {todayOffers.length === 0 ? (
        <section className="theme-forest rounded-[28px] bg-page p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-mint">
              {isGeorgian ? "დღეს" : "Today"}
            </p>
            {salesPaused && (
              <span className="rounded-full bg-brand-honey px-3 py-1 text-xs font-bold text-brand-ink">
                {isGeorgian ? "შეჩერებულია" : "Paused"}
              </span>
            )}
          </div>
          <p className="mt-2 text-xl font-bold text-cream">
            {isGeorgian ? "დღეს ბოქსი ჯერ არ არის" : "No box today yet"}
          </p>
          <p className="mt-1 text-sm text-body">
            {activeTemplateCount > 0
              ? isGeorgian
                ? "განრიგის ბოქსი თავისი დროით გამოჩნდება."
                : "Your scheduled box appears at its set time."
              : isGeorgian
                ? "გამოაქვეყნე ბოქსი ან დააყენე განრიგი."
                : "Publish a box or set a schedule."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSelectPanel("publish")}
              className="min-h-12 flex-1 rounded-2xl bg-brand-mint px-4 text-base font-bold text-brand-forest transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
            >
              {isGeorgian ? "+ ბოქსის გამოქვეყნება" : "+ Publish a box"}
            </button>
            {salesPaused && pauseButton}
          </div>
        </section>
      ) : (
        todayOffers.map(({ offer, sold }, index) => {
          const remaining = Math.max(0, Number(offer.quantity || 0));
          const total = sold + remaining;
          const percent = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
          const status = getEffectiveOfferStatus(offer);
          const busy = updatingOfferId === offer.id;
          const pill = salesPaused
            ? { text: isGeorgian ? "შეჩერებულია" : "Paused", className: "bg-brand-honey text-brand-ink" }
            : status === "inactive"
              ? { text: isGeorgian ? "დამალულია" : "Hidden", className: "bg-brand-honey text-brand-ink" }
              : status === "sold_out"
                ? { text: isGeorgian ? "გაიყიდა" : "Sold out", className: "bg-brand-honey text-brand-ink" }
                : { text: isGeorgian ? "● ლაივშია" : "● Live", className: "bg-brand-mint text-brand-forest" };

          return (
            <section key={offer.id} className="theme-forest rounded-[28px] bg-page p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-mint">
                  {isGeorgian ? "დღევანდელი ბოქსი" : "Today's box"}
                </p>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${pill.className}`}>
                  {pill.text}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-cream sm:text-2xl">{offer.title}</h2>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold leading-none text-cream">
                  {sold} / {total}
                </span>
                <span className="text-base text-mint">{isGeorgian ? "გაიყიდა" : "sold"}</span>
              </div>
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-card"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={sold}
                aria-label={isGeorgian ? "გაყიდული ბოქსები" : "Boxes sold"}
              >
                <div className="h-full rounded-full bg-brand-mint" style={{ width: `${percent}%` }} />
              </div>

              <p className="mt-3 flex items-center gap-2 text-sm text-body">
                <ClockIcon className="h-4 w-4 shrink-0 text-mint" strokeWidth={2} />
                {isGeorgian ? "წაღება" : "Pickup"} {timeLabel(offer.pickup_start)}–{timeLabel(offer.pickup_end)}
                {" · "}
                {formatAmount(Number(offer.price || 0))} ₾
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex min-h-12 items-center rounded-2xl bg-card" aria-busy={busy}>
                  <button
                    type="button"
                    onClick={() => onAdjustQuantity(offer, -1)}
                    disabled={busy || remaining <= 0}
                    aria-label={isGeorgian ? "ერთით ნაკლები ბოქსი" : "One box fewer"}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-cream transition hover:bg-page focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-14 text-center">
                    <span className="block text-lg font-bold leading-tight text-cream">{remaining}</span>
                    <span className="block text-[11px] leading-tight text-body">
                      {isGeorgian ? "დარჩა" : "left"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustQuantity(offer, 1)}
                    disabled={busy}
                    aria-label={isGeorgian ? "ერთით მეტი ბოქსი" : "One box more"}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-cream transition hover:bg-page focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                {index === 0 && pauseButton}
              </div>
            </section>
          );
        })
      )}

      <button
        type="button"
        aria-expanded={activePanel === "collect"}
        onClick={() => onSelectPanel(activePanel === "collect" ? null : "collect")}
        className="flex w-full items-center gap-4 rounded-[24px] bg-brand-mint p-4 text-left text-brand-ink transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest sm:p-5"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-forest">
          <PackageIcon className="h-7 w-7 text-brand-mint" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-extrabold">{isGeorgian ? "გაცემა" : "Hand over"}</span>
          <span className="block text-sm text-brand-forest-2">
            {waitingCount > 0
              ? isGeorgian
                ? `${waitingCount} მყიდველი ელოდება`
                : `${waitingCount} waiting`
              : isGeorgian
                ? "ახლა არავინ ელოდება"
                : "Nobody waiting right now"}
          </span>
        </span>
        {waitingCount > 0 && (
          <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-brand-honey px-2 text-lg font-extrabold text-brand-ink">
            {waitingCount}
          </span>
        )}
      </button>

      <div className="grid grid-cols-3 gap-3">
        <div className="ui-card rounded-2xl p-3 sm:p-4">
          <p className="truncate text-lg font-extrabold text-cream sm:text-xl">{formatAmount(earningsToday)} ₾</p>
          <p className="text-xs text-body">{isGeorgian ? "დღეს შენი წილი" : "Your share today"}</p>
        </div>
        <div className="ui-card rounded-2xl p-3 sm:p-4">
          <p className="truncate text-lg font-extrabold text-cream sm:text-xl">{formatAmount(kgSaved)} {isGeorgian ? "კგ" : "kg"}</p>
          <p className="text-xs text-body">{isGeorgian ? "გადარჩა სულ" : "Saved in total"}</p>
        </div>
        <div className="ui-card rounded-2xl p-3 sm:p-4">
          <p className="flex items-center gap-1 truncate text-lg font-extrabold text-cream sm:text-xl">
            {averageRating !== null ? averageRating.toFixed(1) : "—"}
            <StarIcon className="h-4 w-4 shrink-0 text-brand-honey" strokeWidth={2} />
          </p>
          <p className="text-xs text-body">{isGeorgian ? "შეფასება" : "Rating"}</p>
        </div>
      </div>

      <nav aria-label={isGeorgian ? "პანელის სექციები" : "Panel sections"} className="grid grid-cols-4 gap-2">
        {shortcuts.map(({ label, Icon, onClick, active }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-expanded={active === undefined ? undefined : active}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint sm:text-sm ${
              active ? "theme-forest bg-page text-cream" : "ui-card text-cream"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.9} />
            <span className="w-full truncate text-center">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
