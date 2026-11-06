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
  const size = getBagSizeBadge(offer.size);
  const quantity = Number(offer.quantity || 0);
  const lowStock = !offer.unlimited_quantity && quantity > 0 && quantity <= 5;

  return (
    <Link
      href={`/offers/${offer.id}`}
      onTouchStart={() => void prefetchOfferDetail(offer.id)}
      className="native-press relative flex min-w-0 items-center gap-3 rounded-[24px] bg-card p-3 text-cream"
    >
      <div
        className={`${getOfferCategoryTone(
          offer.category
        )} photo-leaf-sm relative isolate h-[5.5rem] w-[5.5rem] shrink-0`}
      >
        <OfferImage src={offer.image_url} alt={offer.title} sizes="88px" priority={priority} />
        {discount !== null && (
          <span className="absolute bottom-1 left-1 rounded-full bg-brand-forest px-1.5 py-0.5 text-[11px] font-bold text-brand-mint">
            −{discount}%
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[1.0625rem] font-bold leading-snug">
          {offer.businesses?.name || t("common.business")}
        </p>
        <p className="truncate text-[13px] text-body">
          {getOfferCategoryLabel(normalizeOfferCategory(offer.category), language)}
          {size ? ` · ${language === "ka" ? "ზომა" : "Size"} ${size}` : ""}
          {rating && rating.rating_count > 0 ? ` · ★ ${rating.average_rating.toFixed(1)}` : ""}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-[13px] text-body">
          <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="min-w-0 truncate">
            {getOfferDateLabel(offer, language)} {formatPickupTimeRange(offer, language)}
          </span>
          {lowStock && (
            <span className="ml-1 shrink-0 rounded-full bg-mint px-1.5 text-[11px] font-bold text-ink">
              {t("native.left").replace("{n}", String(quantity))}
            </span>
          )}
        </p>
      </div>

      <div className="shrink-0 self-end text-right">
        {oldPrice !== null && (
          <p className="text-xs leading-none text-muted line-through">{formatMoney(oldPrice)}</p>
        )}
        <p className="mt-0.5 whitespace-nowrap text-xl font-bold leading-tight text-mint">
          {formatMoney(offer.price)}
        </p>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="native-skeleton h-[7rem] rounded-[24px]" />
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
      <header className="theme-forest relative px-4 pb-3 pt-3">
        <div className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 200 200" aria-hidden="true">
            <rect width="200" height="200" rx="46" fill="var(--brand-mint)" />
            <path
              d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
              fill="var(--brand-forest)"
            />
          </svg>
          <p className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-brand-ground">
            ArGadaagdo
          </p>
          {/* The app's only language switch. */}
          <button
            type="button"
            onClick={() => setLanguage(language === "ka" ? "en" : "ka")}
            aria-label={language === "ka" ? "Switch to English" : "ქართულზე გადართვა"}
            className="native-press flex h-10 min-w-10 items-center justify-center rounded-full bg-well px-2.5 text-[13px] font-bold text-brand-mint"
          >
            {language === "ka" ? "KA" : "EN"}
          </button>
          <Link
            href="/notifications"
            aria-label={language === "ka" ? "შეტყობინებები" : "Notifications"}
            className="native-press flex h-10 w-10 items-center justify-center rounded-full bg-well text-brand-mint"
          >
            <BellIcon className="h-5 w-5" strokeWidth={2} />
          </Link>
        </div>

        <h1 className="mt-4 font-serif text-[1.625rem] font-bold leading-tight text-brand-ground">
          {language === "ka" ? (
            <>დღეს გადაარჩინე<br />ლანჩ ბოქსი</>
          ) : (
            <>Rescue a<br />Lunch Box today</>
          )}
        </h1>

        <div className="mt-4 flex h-12 items-center gap-2.5 rounded-[18px] border border-line bg-card pl-3.5 pr-1.5">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("native.home.search")}
            aria-label={t("native.home.search")}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-cream outline-none placeholder:text-muted"
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
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`h-10 flex-none rounded-full border px-4 text-[13px] font-bold ${
                category === "all"
                  ? "border-transparent bg-brand-mint text-brand-forest"
                  : "border-line bg-well text-brand-ground"
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
                className={`h-10 flex-none rounded-full border px-4 text-[13px] font-bold ${
                  category === option
                    ? "border-transparent bg-brand-mint text-brand-forest"
                    : "border-line bg-well text-brand-ground"
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

        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
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
