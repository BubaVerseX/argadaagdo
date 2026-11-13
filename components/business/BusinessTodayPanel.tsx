"use client";

import { useState, type ChangeEvent } from "react";
import {
  BarChartIcon,
  CameraIcon,
  ClockIcon,
  EditIcon,
  PackageIcon,
  PlusIcon,
  StoreIcon,
} from "@/components/icons";
import { IMAGE_INPUT_ACCEPT } from "@/lib/business/prepareImage";
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

type TodayPanelProps = {
  businessName: string;
  todayOffers: TodayOffer[];
  salesPaused: boolean;
  pauseBusy: boolean;
  updatingOfferId: number | null;
  waitingCount: number;
  earningsToday: number;
  activeTemplateCount: number;
  activePanel: QuickPanel;
  onAdjustQuantity: (offer: Offer, delta: number) => void;
  onToggleSales: () => void;
  onSelectPanel: (panel: QuickPanel) => void;
  onNewBox: () => void;
  /** Uploads a photo for this one box. Resolves to an error text, or "" when it worked. */
  onSetOfferPhoto: (offer: Offer, file: File) => Promise<string>;
};

/**
 * The dashboard's home, kept to what a shop needs every day: today's box
 * (with one "Change" button for the rare cases), the handover button and
 * three doors: my boxes, numbers, shop.
 */
export function BusinessTodayPanel({
  businessName,
  todayOffers,
  salesPaused,
  pauseBusy,
  updatingOfferId,
  waitingCount,
  earningsToday,
  activeTemplateCount,
  activePanel,
  onAdjustQuantity,
  onToggleSales,
  onSelectPanel,
  onNewBox,
  onSetOfferPhoto,
}: TodayPanelProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null);
  const [photoError, setPhotoError] = useState<{ offerId: number; text: string } | null>(null);

  async function handlePhoto(offer: Offer, event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setPhotoError(null);
    setPhotoBusyId(offer.id);
    const error = await onSetOfferPhoto(offer, file);
    setPhotoBusyId(null);
    if (error) setPhotoError({ offerId: offer.id, text: error });
  }

  const toggle = (panel: Exclude<QuickPanel, null>) =>
    onSelectPanel(activePanel === panel ? null : panel);

  const doors: {
    panel: Exclude<QuickPanel, null>;
    label: string;
    hint: string;
    Icon: typeof PackageIcon;
  }[] = [
    {
      panel: "publish",
      label: L("ბოქსები", "Boxes"),
      hint:
        activeTemplateCount > 0
          ? L(`${activeTemplateCount} ჩართული`, `${activeTemplateCount} on`)
          : L("დამატება", "Add one"),
      Icon: PackageIcon,
    },
    {
      panel: "numbers",
      label: L("ციფრები", "Numbers"),
      hint: L(`დღეს ${formatAmount(earningsToday)} ₾`, `Today ${formatAmount(earningsToday)} ₾`),
      Icon: BarChartIcon,
    },
    {
      panel: "shop",
      label: L("მაღაზია", "Shop"),
      hint: L("პროფილი, განყოფილებები", "Profile, departments"),
      Icon: StoreIcon,
    },
  ];

  return (
    <div id="business-quick-actions" className="scroll-mt-24 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight text-cream sm:text-2xl">{businessName}</h1>
          <p className="text-sm text-body">{L("ბიზნესის პანელი", "Business panel")}</p>
        </div>
        <span className="ui-card shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-cream">
          {todayLabel(isGeorgian)}
        </span>
      </div>

      {salesPaused && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-honey px-4 py-3 text-brand-ink"
        >
          <span className="font-bold">{L("დღეს გაყიდვა შეჩერებულია", "Sales are stopped for today")}</span>
          <button
            type="button"
            onClick={onToggleSales}
            disabled={pauseBusy}
            className="min-h-11 rounded-xl bg-brand-ink px-4 text-sm font-bold text-brand-honey transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest disabled:opacity-60"
          >
            {L("გაყიდვის განახლება", "Resume sales")}
          </button>
        </div>
      )}

      {todayOffers.length === 0 ? (
        <section className="theme-forest rounded-[28px] bg-page p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-mint">{L("დღეს", "Today")}</p>
          <p className="mt-2 text-xl font-bold text-cream">{L("დღეს ბოქსი ჯერ არ არის", "No box today yet")}</p>
          <p className="mt-1 text-sm text-body">
            {activeTemplateCount > 0
              ? L("შენი ბოქსი აპში დანიშნულ დროს გამოჩნდება.", "Your box appears in the app at its set time.")
              : L(
                  "დაამატე ბოქსი ერთხელ — მერე აპში ყოველდღე თავად გამოჩნდება.",
                  "Add a box once — then it appears in the app by itself."
                )}
          </p>
          <button
            type="button"
            onClick={onNewBox}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-mint px-4 text-base font-bold text-brand-forest transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" strokeWidth={2.2} />
            {L("ბოქსის დამატება", "Add a box")}
          </button>
        </section>
      ) : (
        todayOffers.map(({ offer, sold }) => {
          const remaining = Math.max(0, Number(offer.quantity || 0));
          const total = sold + remaining;
          const percent = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
          const status = getEffectiveOfferStatus(offer);
          const busy = updatingOfferId === offer.id;
          const editing = editingOfferId === offer.id;
          const photoBusy = photoBusyId === offer.id;
          const pill = salesPaused
            ? { text: L("შეჩერებულია", "Stopped"), className: "bg-brand-honey text-brand-ink" }
            : status === "inactive"
              ? { text: L("დამალულია", "Hidden"), className: "bg-brand-honey text-brand-ink" }
              : status === "sold_out"
                ? { text: L("ყველა გაიყიდა", "Sold out"), className: "bg-brand-honey text-brand-ink" }
                : { text: L("● აპშია", "● Live"), className: "bg-brand-mint text-brand-forest" };

          return (
            <section key={offer.id} className="theme-forest rounded-[28px] bg-page p-5 sm:p-6">
              <div className="flex gap-4">
                <label
                  className={`relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl ${
                    offer.image_url ? "bg-card" : "border-2 border-dashed border-line-strong bg-card"
                  } focus-within:ring-2 focus-within:ring-brand-mint`}
                  title={offer.image_url ? L("ფოტოს შეცვლა", "Change photo") : L("ფოტოს დამატება", "Add a photo")}
                >
                  {offer.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offer.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-[11px] font-semibold text-mint">
                      <CameraIcon className="h-6 w-6" strokeWidth={1.9} />
                      {L("ფოტო", "Photo")}
                    </span>
                  )}
                  {photoBusy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                      {L("იტვირთება...", "Uploading...")}
                    </span>
                  )}
                  <input
                    type="file"
                    accept={IMAGE_INPUT_ACCEPT}
                    className="sr-only"
                    disabled={photoBusy}
                    aria-label={offer.image_url ? L("ფოტოს შეცვლა", "Change photo") : L("ფოტოს დამატება", "Add a photo")}
                    onChange={(event) => void handlePhoto(offer, event)}
                  />
                </label>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="pt-0.5 text-xs font-bold uppercase tracking-wide text-mint">
                      {L("დღევანდელი ბოქსი", "Today's box")}
                    </p>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${pill.className}`}>
                      {pill.text}
                    </span>
                  </div>
                  <h2 className="mt-1 truncate text-xl font-bold text-cream sm:text-2xl">{offer.title}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-body">
                    <ClockIcon className="h-4 w-4 shrink-0 text-mint" strokeWidth={2} />
                    {timeLabel(offer.pickup_start)}–{timeLabel(offer.pickup_end)} · {formatAmount(Number(offer.price || 0))} ₾
                  </p>
                </div>
              </div>

              {photoError?.offerId === offer.id && (
                <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                  {photoError.text}
                </p>
              )}

              <div className="mt-5 flex items-end justify-between gap-3">
                <p className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold leading-none text-cream">{sold}</span>
                  <span className="text-2xl font-bold text-body">/ {total}</span>
                  <span className="text-base text-mint">{L("გაიყიდა", "sold")}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setEditingOfferId(editing ? null : offer.id)}
                  aria-expanded={editing}
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-cream transition hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
                >
                  <EditIcon className="h-4 w-4" strokeWidth={2} />
                  {editing ? L("დახურვა", "Close") : L("შეცვლა", "Change")}
                </button>
              </div>
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-card"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={sold}
                aria-label={L("გაყიდული ბოქსები", "Boxes sold")}
              >
                <div className="h-full rounded-full bg-brand-mint" style={{ width: `${percent}%` }} />
              </div>

              {editing && (
                <div className="mt-4 space-y-3 rounded-2xl bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-cream">{L("გასაყიდად დარჩა", "Left to sell")}</p>
                      <p className="text-xs text-body">
                        {L("საკვები ნაკლებია ან მეტია? შეცვალე აქ.", "Less or more food than planned? Change it here.")}
                      </p>
                    </div>
                    <div className="flex items-center rounded-2xl bg-page" aria-busy={busy}>
                      <button
                        type="button"
                        onClick={() => onAdjustQuantity(offer, -1)}
                        disabled={busy || remaining <= 0}
                        aria-label={L("ერთით ნაკლები ბოქსი", "One box fewer")}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-cream transition hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-10 text-center text-xl font-bold text-cream">{remaining}</span>
                      <button
                        type="button"
                        onClick={() => onAdjustQuantity(offer, 1)}
                        disabled={busy}
                        aria-label={L("ერთით მეტი ბოქსი", "One box more")}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-cream transition hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line-strong px-4 text-sm font-semibold text-cream transition hover:bg-page focus-within:ring-2 focus-within:ring-brand-mint">
                      <CameraIcon className="h-4 w-4" strokeWidth={2} />
                      {photoBusy
                        ? L("იტვირთება...", "Uploading...")
                        : offer.image_url
                          ? L("ფოტოს შეცვლა", "Change photo")
                          : L("ფოტოს დამატება", "Add a photo")}
                      <input
                        type="file"
                        accept={IMAGE_INPUT_ACCEPT}
                        className="sr-only"
                        disabled={photoBusy}
                        onChange={(event) => void handlePhoto(offer, event)}
                      />
                    </label>
                    {!salesPaused && (
                      <button
                        type="button"
                        onClick={onToggleSales}
                        disabled={pauseBusy}
                        className="min-h-12 rounded-2xl border border-brand-honey px-4 text-sm font-semibold text-brand-honey transition hover:bg-page focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-honey disabled:opacity-60"
                      >
                        {todayOffers.length > 1
                          ? L("დღეს ყველა ბოქსის შეჩერება", "Stop all boxes for today")
                          : L("დღეს გაყიდვის შეჩერება", "Stop selling today")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })
      )}

      <button
        type="button"
        aria-expanded={activePanel === "collect"}
        onClick={() => toggle("collect")}
        className="flex w-full items-center gap-4 rounded-[24px] bg-brand-mint p-4 text-left text-brand-ink transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest sm:p-5"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-forest">
          <PackageIcon className="h-7 w-7 text-brand-mint" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-extrabold">{L("გაცემა", "Hand over")}</span>
          <span className="block text-sm text-brand-forest-2">
            {waitingCount > 0
              ? L(`${waitingCount} მყიდველი ელოდება`, `${waitingCount} waiting`)
              : L("ახლა არავინ ელოდება", "Nobody waiting right now")}
          </span>
        </span>
        {waitingCount > 0 && (
          <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-brand-honey px-2 text-lg font-extrabold text-brand-ink">
            {waitingCount}
          </span>
        )}
      </button>

      <nav aria-label={L("პანელის სექციები", "Panel sections")} className="grid grid-cols-3 gap-2 sm:gap-3">
        {doors.map(({ panel, label, hint, Icon }) => {
          const open = activePanel === panel;
          return (
            <button
              key={panel}
              type="button"
              onClick={() => toggle(panel)}
              aria-expanded={open}
              className={`flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint sm:p-4 ${
                open ? "theme-forest bg-page" : "ui-card hover:brightness-[0.98]"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  open ? "bg-brand-mint text-brand-forest" : "bg-brand-forest text-brand-mint"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="w-full min-w-0">
                <span className="block text-sm font-bold leading-tight text-cream sm:text-base">{label}</span>
                <span className="mt-0.5 block text-xs leading-tight text-body">{hint}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
