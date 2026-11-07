"use client";

import {
  BellIcon,
  ClockIcon,
  FilterIcon,
  LeafIcon,
  MapPinIcon,
  MenuIcon,
  SearchIcon,
} from "@/components/icons";
import AccountDeletedNotice from "@/components/AccountDeletedNotice";
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
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { useLanguage } from "@/lib/useLanguage";
import Link from "./AppLink";
import NativeHero from "./NativeHero";
import {
  businessLocation,
  distanceKm,
  formatDistance,
  getLocationChoice,
  getLocationIfAllowed,
  requestLocation,
  setLocationChoice,
  type LatLng,
} from "@/lib/location";

// The map (and MapLibre) loads only when the Map view opens.
const NativeMapView = lazy(() => import("./NativeMapView"));
import NativeWelcome from "./NativeWelcome";
import {
  askForAccount,
  hasSeenWelcome,
  markWelcomeSeen,
} from "@/lib/accountGate";
import { formatBusinessType } from "@/lib/businessTypes";
import { supabase } from "@/lib/supabase";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

function NativeOfferCard({
  offer,
  language,
  t,
  rating,
  priority,
  distance,
}: {
  offer: NativeOffer;
  language: Language;
  t: (key: TranslationKey) => string;
  rating?: RatingSummary;
  priority: boolean;
  /** Km from the person, when they shared their location. */
  distance?: number | null;
}) {
  const discount = getDiscountPercent(offer);
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
        <OfferImage
          src={offer.image_url}
          alt={offer.title}
          sizes="72px"
          priority={priority}
        />
        {discount !== null && (
          <span className="action-pill absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
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
          {distance != null && (
            <span className="shrink-0 text-xs text-body">
              {formatDistance(distance, language)}
            </span>
          )}
          {rating && rating.rating_count > 0 && (
            <span className="shrink-0 text-xs font-medium text-[#3b8a55]">
              ★ {rating.average_rating.toFixed(1)}
            </span>
          )}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="native-time-chip min-w-0 text-[12px] font-medium">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 truncate">
              {getOfferDateLabel(offer, language)}{" "}
              {formatPickupTimeRange(offer, language)}
            </span>
          </p>
          <p className="shrink-0 whitespace-nowrap text-right leading-none">
            <span className="action-text text-base font-semibold">
              {formatMoney(offer.price)}
            </span>
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

// Nearby (the first tab): what's on today as a list, or by place (Map).
// On the first app start, people who aren't signed in see the welcome screen
// here; after that, guests browse Nearby (lib/accountGate.ts).
export default function NativeHome({
  initialView = "list",
}: {
  initialView?: "list" | "map";
}) {
  const { language, setLanguage, t } = useLanguage();
  const [view, setView] = useState<"list" | "map">(initialView);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [welcomed, setWelcomed] = useState(hasSeenWelcome);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationChoice, setLocationChoiceState] = useState(getLocationChoice);
  const [locating, setLocating] = useState(false);
  // Set once the stored-permission check is done (so "on but revoked" shows the off line).
  const [locationChecked, setLocationChecked] = useState(false);
  // The person tapped "Turn on" but the phone said no: point to Settings.
  const [locationBlocked, setLocationBlocked] = useState(false);

  // Nearest first, only with the person's OK (asked in a small card below).
  useEffect(() => {
    let active = true;
    void getLocationIfAllowed().then((location) => {
      if (!active) return;
      if (location) setUserLocation(location);
      setLocationChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function turnOnLocation() {
    setLocating(true);
    const location = await requestLocation();
    setLocating(false);
    setLocationChoice(location ? "on" : "off");
    setLocationChoiceState(location ? "on" : "off");
    setLocationBlocked(!location);
    if (location) setUserLocation(location);
  }

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => active && setSignedIn(Boolean(data.session)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session))
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const { feed, loading, failed, retry } = useNativeFeed();
  const [category, setCategory] = useState<OfferCategory | "all">(
    initialCategory
  );
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
        offers.some(
          (offer) => normalizeOfferCategory(offer.category) === option
        )
      ),
    [offers]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = offers.filter((offer) => {
    if (
      category !== "all" &&
      normalizeOfferCategory(offer.category) !== category
    ) {
      return false;
    }
    if (!normalizedQuery) return true;
    return [
      offer.title,
      offer.businesses?.name,
      offer.businesses?.business_type,
      formatBusinessType(offer.businesses?.business_type, "ka"),
      getOfferCategoryLabel(normalizeOfferCategory(offer.category), "ka"),
      getOfferCategoryLabel(normalizeOfferCategory(offer.category), "en"),
    ]
      .filter(Boolean)
      .some((text) => text!.toLocaleLowerCase().includes(normalizedQuery));
  });
  const distanceOf = (offer: NativeOffer) => {
    const place = businessLocation(offer.businesses);
    return userLocation && place ? distanceKm(userLocation, place) : null;
  };
  // With a location: nearest first; places without a pin keep their order after.
  const shown = userLocation
    ? filtered
        .map((offer, index) => ({ offer, index, distance: distanceOf(offer) }))
        .sort((a, b) =>
          a.distance == null && b.distance == null
            ? a.index - b.index
            : a.distance == null
            ? 1
            : b.distance == null
            ? -1
            : a.distance - b.distance
        )
        .map((item) => item.offer)
    : filtered;
  const nothingAtAll = !loading && !failed && offers.length === 0;
  const locationOff =
    !userLocation &&
    (locationChoice === "off" || (locationChoice === "on" && locationChecked));

  // Until we know who's here: the plain ground, so neither screen flashes.
  if (signedIn === null) return <main className="native-main" />;
  if (!signedIn && !welcomed) {
    return (
      <NativeWelcome
        onStart={() => {
          markWelcomeSeen();
          setWelcomed(true);
        }}
      />
    );
  }

  const viewButton = (option: "list" | "map") => (
    <button
      type="button"
      role="tab"
      aria-selected={view === option}
      aria-label={
        option === "list"
          ? language === "ka"
            ? "სია"
            : "List"
          : language === "ka"
          ? "რუკა"
          : "Map"
      }
      onClick={() => setView(option)}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${
        view === option ? "bg-brand-mint text-brand-forest" : "text-body"
      }`}
    >
      {option === "list" ? (
        <MenuIcon className="h-4 w-4" strokeWidth={2} />
      ) : (
        <MapPinIcon className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );

  return (
    <main className="native-main">
      <AccountDeletedNotice />
      <NativeHero className="px-4 pb-1 pt-3">
        <header>
          <div className="flex items-center gap-2.5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <rect width="200" height="200" rx="46" fill="var(--brand-mint)" />
              <path
                d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
                fill="var(--brand-forest)"
              />
            </svg>
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-cream">
              ArGadaagdo
            </p>
            {/* The app's only language switch. */}
            <button
              type="button"
              onClick={() => setLanguage(language === "ka" ? "en" : "ka")}
              aria-label={
                language === "ka" ? "Switch to English" : "ქართულზე გადართვა"
              }
              className="native-press flex h-11 min-w-11 items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-brand-mint"
            >
              {language === "ka" ? "KA" : "EN"}
            </button>
            <Link
              onClick={(event) => {
                if (!signedIn) {
                  event.preventDefault();
                  askForAccount("/notifications");
                }
              }}
              href="/notifications"
              aria-label={language === "ka" ? "შეტყობინებები" : "Notifications"}
              className="native-press flex h-11 w-11 items-center justify-center rounded-full bg-card text-brand-mint"
            >
              <BellIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Link>
          </div>

          {/* No visible headline (owner's call): the header is just logo,
              language, bell, search and the list/map switch. */}
          <h1 className="sr-only">{language === "ka" ? "ახლოს" : "Nearby"}</h1>

          <div className="mt-3 flex h-[3.25rem] items-center gap-2.5 rounded-2xl bg-card pl-3.5 pr-1">
            <SearchIcon
              className="h-4 w-4 shrink-0 text-muted"
              strokeWidth={2}
            />
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-mint text-brand-forest"
            >
              <FilterIcon className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div
              role="tablist"
              aria-label={language === "ka" ? "ხედი" : "View"}
              className="flex flex-none rounded-full bg-card p-0.5"
            >
              {viewButton("list")}
              {viewButton("map")}
            </div>
            {presentCategories.length > 0 && (
              <div className="no-scrollbar -mr-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-4">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  aria-pressed={category === "all"}
                  className={`h-11 flex-none rounded-full border px-3.5 text-[13px] font-semibold ${
                    category === "all"
                      ? "border-transparent action-pill"
                      : "border-line bg-card text-body"
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
                    className={`h-11 flex-none rounded-full border px-3.5 text-[13px] font-semibold ${
                      category === option
                        ? "border-transparent action-pill"
                        : "border-line bg-card text-body"
                    }`}
                  >
                    {getOfferCategoryLabel(option, language)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      </NativeHero>

      <section className="native-under-hero relative z-[1] px-4">
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
            <h2 className="mt-4 text-[17px] font-semibold">
              {t("native.home.emptyTitle")}
            </h2>
            <p className="mt-1 text-sm text-body">
              {t("native.home.emptyText")}
            </p>
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

        {/* One button that leads to the phone's own permission dialog, where
            people allow or decline (Apple 5.1.1(iv): no "Not now" of ours). */}
        {locationChoice === null && feed && shown.length > 0 && (
          <div className="mb-2.5 flex items-center gap-3 rounded-[20px] bg-card p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-mint">
              <MapPinIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-cream">
              {language === "ka"
                ? "ნახე, რა არის შენთან ახლოს"
                : "See what's closest to you"}
            </p>
            <button
              type="button"
              onClick={() => void turnOnLocation()}
              disabled={locating}
              className="native-press action-pill min-h-11 shrink-0 rounded-full px-3.5 text-xs font-semibold disabled:opacity-60"
            >
              {locating ? "…" : t("native.home.locationOn")}
            </button>
          </div>
        )}

        {locationOff && feed && shown.length > 0 && (
          <button
            type="button"
            onClick={() => void turnOnLocation()}
            disabled={locating}
            className="mb-2 flex min-h-11 w-full items-center gap-2 px-1 text-left text-[13px] text-body disabled:opacity-60"
          >
            <MapPinIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate">
              {locationBlocked
                ? t("native.home.locationSettings")
                : t("native.home.locationOff")}
            </span>
            {!locationBlocked && (
              <span className="shrink-0 font-semibold text-cream">
                {locating ? "…" : t("native.home.locationOn")}
              </span>
            )}
          </button>
        )}

        {view === "map" ? (
          <Suspense
            fallback={
              <div className="native-skeleton h-[calc(100dvh-25rem)] min-h-[15rem] rounded-[22px]" />
            }
          >
            <NativeMapView offers={shown} userLocation={userLocation} />
          </Suspense>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
            {shown.map((offer, index) => (
              <NativeOfferCard
                key={offer.id}
                offer={offer}
                language={language}
                t={t}
                rating={feed?.ratings[offer.business_id]}
                priority={index < 2}
                distance={distanceOf(offer)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
