"use client";

import { LeafDecor, WaveEdge } from "@/components/design/Decor";
import { FilterIcon, LeafIcon, SearchIcon } from "@/components/icons";
import OfferImage from "@/components/OfferImage";
import type { Language, TranslationKey } from "@/lib/i18n";
import {
  prefetchOfferDetail,
  useNativeFeed,
  visibleOffers,
  type NativeOffer,
} from "@/lib/nativeData";
import {
  getBagSizeBadge,
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
import Link from "next/link";
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
  const size = getBagSizeBadge(offer.size);
  const quantity = Number(offer.quantity || 0);
  const lowStock = !offer.unlimited_quantity && quantity > 0 && quantity <= 5;

  return (
    <Link
      href={`/offers/${offer.id}`}
      onTouchStart={() => void prefetchOfferDetail(offer.id)}
      className={`${getOfferCategoryTone(
        offer.category
      )} native-press relative block overflow-hidden rounded-[28px] bg-cat p-3.5 text-cat-ink`}
    >
      <span
        aria-hidden="true"
        className="absolute -bottom-12 -right-10 h-48 w-48 rounded-full bg-cat-soft"
      />

      <div className="relative">
        <div className="photo-leaf relative isolate h-52 w-full">
          <OfferImage
            src={offer.image_url}
            alt={offer.title}
            sizes="(max-width: 500px) 94vw, 480px"
            priority={priority}
          />
        </div>

        {discount !== null && (
          <span className="discount-sticker absolute -right-1 -top-1 h-[3.75rem] w-[3.75rem] border-[3px] border-brand-ground text-sm">
            −{discount}%
          </span>
        )}

        {lowStock && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-brand-forest px-3 py-1 text-xs font-bold text-brand-ground">
            {t("native.left").replace("{n}", String(quantity))}
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-3 px-1 pb-0.5">
        <div className="min-w-0">
          <p className="truncate font-serif text-[1.1875rem] font-bold leading-snug">
            {offer.businesses?.name || t("common.business")}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-cat-ink-2">
            {getOfferDateLabel(offer, language)}{" "}
            {formatPickupTimeRange(offer, language)}
            {size ? ` · ${language === "ka" ? "ზომა" : "Size"} ${size}` : ""}
            {rating && rating.rating_count > 0
              ? ` · ★ ${rating.average_rating.toFixed(1)}`
              : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {oldPrice !== null && (
            <p className="text-xs leading-none text-cat-ink-2 line-through">
              {formatMoney(oldPrice)}
            </p>
          )}
          <p className="mt-0.5 whitespace-nowrap text-2xl font-bold leading-tight">
            {formatMoney(offer.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {[0, 1].map((key) => (
        <div key={key} className="native-skeleton h-[19.5rem] rounded-[28px]" />
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
  const { language, t } = useLanguage();
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
      <header className="theme-forest relative overflow-hidden bg-brand-forest px-4 pb-3 pt-3">
        <LeafDecor className="-right-10 -top-12 h-52 w-52 text-brand-forest-2" />

        <div className="relative flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 200 200" aria-hidden="true">
            <rect width="200" height="200" rx="46" fill="var(--brand-mint)" />
            <path
              d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
              fill="var(--brand-forest)"
            />
          </svg>
          <h1 className="font-serif text-lg font-bold text-brand-ground">
            {t("native.home.title")}
          </h1>
        </div>

        <div className="relative mt-3 flex h-12 items-center gap-2.5 rounded-[18px] bg-brand-ground pl-3.5 pr-1.5">
          <SearchIcon
            className="h-[18px] w-[18px] shrink-0 text-brand-secondary"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("native.home.search")}
            aria-label={t("native.home.search")}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-brand-ink outline-none placeholder:text-brand-secondary"
          />
          <Link
            href="/discover?full=1"
            aria-label={t("native.home.filters")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-honey text-brand-ink"
          >
            <FilterIcon className="h-[18px] w-[18px]" strokeWidth={2} />
          </Link>
        </div>

        {presentCategories.length > 0 && (
          <div className="no-scrollbar relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`h-10 flex-none rounded-full px-4 text-[13px] font-bold ${
                category === "all"
                  ? "bg-brand-mint text-brand-forest"
                  : "bg-brand-forest-2 text-brand-ground"
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
                className={`${getOfferCategoryTone(
                  option
                )} h-10 flex-none rounded-full bg-cat px-4 text-[13px] font-medium text-cat-ink ${
                  category === option ? "ring-2 ring-brand-ground" : ""
                }`}
              >
                {getOfferCategoryLabel(option, language)}
              </button>
            ))}
          </div>
        )}
      </header>
      <WaveEdge />

      <section className="px-4 pt-1">
        {loading && !feed && <CardSkeleton />}

        {failed && !feed && (
          <div className="rounded-[28px] bg-well p-8 text-center">
            <p className="font-serif text-xl font-bold">{t("native.error")}</p>
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
          <div className="cat-mixed relative overflow-hidden rounded-[28px] bg-cat px-6 pb-7 pt-9 text-center text-cat-ink">
            <span
              aria-hidden="true"
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cat-soft"
            />
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-forest">
              <LeafIcon className="h-9 w-9 text-brand-mint" strokeWidth={1.6} />
            </div>
            <h2 className="relative mt-5 font-serif text-2xl font-bold">
              {t("native.home.emptyTitle")}
            </h2>
            <p className="relative mt-1.5 text-[15px] text-cat-ink-2">
              {t("native.home.emptyText")}
            </p>
            <Link
              href="/businesses"
              className="premium-button relative mt-6 w-full rounded-2xl px-6 py-3 font-bold"
            >
              {t("native.home.emptyAction")}
            </Link>
          </div>
        )}

        {!nothingAtAll && feed && shown.length === 0 && (
          <p className="rounded-[28px] bg-well p-8 text-center font-bold">
            {t("native.home.noResults")}
          </p>
        )}

        <div className="grid gap-4">
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
