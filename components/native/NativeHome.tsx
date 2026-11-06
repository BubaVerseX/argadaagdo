"use client";

import { BellIcon, ClockIcon, FilterIcon, LeafIcon, SearchIcon } from "@/components/icons";
import OfferImage from "@/components/OfferImage";
import type { Language, TranslationKey } from "@/lib/i18n";
import {
  prefetchOfferDetail,
  useNativeFeed,
  visibleOffers,
  type NativeOffer,
} from "@/lib/nativeData";
import {
  getOfferCategoryLabel,
  getOfferCategoryTone,
  normalizeOfferCategory,
  OFFER_CATEGORIES,
  type OfferCategory,
} from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupTimeRange,
  getDiscountPercent,
  getOfferDateLabel,
  getOriginalPrice,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { useLanguage } from "@/lib/useLanguage";
import Link from "./AppLink";
import { useEffect, useMemo, useState } from "react";

function NativeOfferCard({
  offer,
  language,
  t,
  rating,
  priority,
}: {
  offer: NativeOffer;
  language: Language;
  t: (key: TranslationKey) => string;
  rating?: RatingSummary;
  priority: boolean;
}) {
  const discount = getDiscountPercent(offer);
  const oldPrice = getOriginalPrice(offer);
  const quantity = Number(offer.quantity || 0);
  const lowStock = !offer.unlimited_quantity && quantity > 0 && quantity <= 5;

  return (
    <Link
      href={`/offers/${offer.id}`}
      onTouchStart={() => void prefetchOfferDetail(offer.id)}
      className="native-press relative flex min-w-0 items-center gap-3 rounded-[20px] bg-card p-2.5 text-cream"
    >
      <div
        className={`${getOfferCategoryTone(
          offer.category
        )} photo-leaf-sm relative isolate h-[4.5rem] w-[4.5rem] shrink-0`}
      >
        <OfferImage src={offer.image_url} alt={offer.title} sizes="72px" priority={priority} />
        {discount !== null && (
          <span className="absolute bottom-1 left-1 rounded-full bg-brand-forest px-1.5 py-0.5 text-[10px] font-semibold text-brand-ground">
            −{discount}%
          </span>
        )}
        {lowStock && (
          <span className="absolute right-1 top-1 rounded-full bg-brand-ground/90 px-1.5 py-0.5 text-[10px] font-semibold text-brand-forest">
            {t("native.left").replace("{n}", String(quantity))}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug">
            {offer.businesses?.name || t("common.business")}
          </span>
          {rating && rating.rating_count > 0 && (
            <span className="shrink-0 text-xs text-body">★ {rating.average_rating.toFixed(1)}</span>
          )}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 text-[13px] text-body">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 truncate">
              {getOfferDateLabel(offer, language)} {formatPickupTimeRange(offer, language)}
            </span>
          </p>
          <p className="shrink-0 whitespace-nowrap text-right leading-none">
            {oldPrice !== null && (
              <span className="mr-1.5 hidden text-xs text-muted line-through min-[380px]:inline">{formatMoney(oldPrice)}</span>
            )}
            <span className="text-base font-semibold text-mint">{formatMoney(offer.price)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="native-skeleton h-[5.75rem] rounded-[20px]" />
      ))}
    </div>
  );
}

function initialCategory(): OfferCategory | "all" {
  const value = new URLSearchParams(window.location.search).get("category");
  return value && OFFER_CATEGORIES.includes(value as OfferCategory)
    ? (value as OfferCategory)
    : "all";
}

export default function NativeHome() {
  const { language, setLanguage, t } = useLanguage();
  const { feed, loading, failed, retry } = useNativeFeed();
  const [category, setCategory] = useState<OfferCategory | "all">(initialCategory);
  const [query, setQuery] = useState("");

  // Warm the next screens so opening one doesn't wait for its code.
  useEffect(() => {
    const warm = () => {
      void import("./NativeOffer");
      void import("./NativeCheckout");
    };
    const timer = window.setTimeout(warm, 800);
    return () => window.clearTimeout(timer);
  }, []);

  const offers = useMemo(() => visibleOffers(feed), [feed]);
  const presentCategories = useMemo(
    () =>
      OFFER_CATEGORIES.filter((option) =>
        offers.some((offer) => normalizeOfferCategory(offer.category) === option)
      ),
    [offers]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const shown = offers.filter((offer) => {
    if (
      category !== "all" &&
      normalizeOfferCategory(offer.category) !== category
    ) {
      return false;
    }
    if (!normalizedQuery) return true;
    return [offer.title, offer.businesses?.name, offer.businesses?.business_type]
      .filter(Boolean)
      .some((text) => text!.toLocaleLowerCase().includes(normalizedQuery));
  });
  const nothingAtAll = !loading && !failed && offers.length === 0;

  return (
    <main className="native-main">
      <header className="relative px-4 pb-2 pt-3">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 200 200" aria-hidden="true">
            <rect width="200" height="200" rx="46" fill="var(--brand-forest)" />
            <path
              d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
              fill="var(--brand-mint)"
            />
          </svg>
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-cream">
            ArGadaagdo
          </p>
          {/* The app's only language switch. */}
          <button
            type="button"
            onClick={() => setLanguage(language === "ka" ? "en" : "ka")}
            aria-label={language === "ka" ? "Switch to English" : "ქართულზე გადართვა"}
            className="native-press flex h-9 min-w-9 items-center justify-center rounded-full border border-line bg-card px-2.5 text-xs font-semibold text-cream"
          >
            {language === "ka" ? "KA" : "EN"}
          </button>
          <Link
            href="/notifications"
            aria-label={language === "ka" ? "შეტყობინებები" : "Notifications"}
            className="native-press flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-cream"
          >
            <BellIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
        </div>

        <h1 className="mt-5 font-serif text-[1.25rem] font-bold leading-snug text-cream">
          {language === "ka" ? "დღეს გადაარჩინე ლანჩ ბოქსი" : "Rescue a Lunch Box today"}
        </h1>

        <div className="mt-3 flex h-11 items-center gap-2.5 rounded-2xl border border-line bg-card pl-3.5 pr-1.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("native.home.search")}
            aria-label={t("native.home.search")}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-muted"
          />
          <Link
            href="/discover?full=1"
            aria-label={t("native.home.filters")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-forest text-brand-ground"
          >
            <FilterIcon className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        {presentCategories.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`h-9 flex-none rounded-full border px-3.5 text-[13px] font-semibold ${
                category === "all" ? "border-transparent bg-brand-forest text-brand-ground" : "border-line bg-card text-body"
              }`}
            >
              {t("native.home.all")}
            </button>
            {presentCategories.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                aria-pressed={category === option}
                className={`h-9 flex-none rounded-full border px-3.5 text-[13px] font-semibold ${
                  category === option ? "border-transparent bg-brand-forest text-brand-ground" : "border-line bg-card text-body"
                }`}
              >
                {getOfferCategoryLabel(option, language)}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="px-4 pt-2">
        {loading && !feed && <CardSkeleton />}

        {failed && !feed && (
          <div className="rounded-[20px] bg-card p-6 text-center">
            <p className="text-base font-semibold">{t("native.error")}</p>
            <button
              type="button"
              onClick={retry}
              className="premium-button mt-5 w-full rounded-2xl px-6 font-bold"
            >
              {t("offline.retry")}
            </button>
          </div>
        )}

        {nothingAtAll && (
          <div className="rounded-[20px] bg-card px-6 pb-6 pt-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss">
              <LeafIcon className="h-6 w-6 text-mint" strokeWidth={1.6} />
            </div>
            <h2 className="mt-4 text-[17px] font-semibold">{t("native.home.emptyTitle")}</h2>
            <p className="mt-1 text-sm text-body">{t("native.home.emptyText")}</p>
            <Link
              href="/businesses"
              className="native-press mt-5 flex min-h-11 items-center justify-center rounded-2xl bg-brand-forest px-6 text-sm font-semibold text-brand-ground"
            >
              {t("native.home.emptyAction")}
            </Link>
          </div>
        )}

        {!nothingAtAll && feed && shown.length === 0 && (
          <p className="rounded-[20px] bg-card p-6 text-center text-sm font-medium text-body">
            {t("native.home.noResults")}
          </p>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {shown.map((offer, index) => (
            <NativeOfferCard
              key={offer.id}
              offer={offer}
              language={language}
              t={t}
              rating={feed?.ratings[offer.business_id]}
              priority={index < 2}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
