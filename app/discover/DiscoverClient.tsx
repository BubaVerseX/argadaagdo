"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeHomeScreen } from "@/components/native/screens";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { LeafDecor, WaveEdge } from "@/components/design/Decor";
import { ClockIcon, HeartIcon } from "@/components/icons";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { formatBusinessType } from "@/lib/businessTypes";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  getOfferCategoryLabel,
  getOfferCategoryTone,
  normalizeOfferCategory,
  OFFER_CATEGORIES,
} from "@/lib/offerCategories";
import {
  compareMarketplaceOffers,
  formatMoney,
  getDiscountPercent,
  getOriginalPrice,
  formatPickupTimeRange,
  getOfferDateLabel,
  getOfferGroup,
  isOfferReservable,
  type OfferGroup,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { paginateItems } from "@/lib/pagination";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OfferSort =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "savings-desc"
  | "rating-desc";
type PickupFilter = "all" | "today" | "tomorrow" | "upcoming";
type PriceFilter = "all" | "under-5" | "under-10" | "under-15";

const OFFERS_PAGE_SIZE = 12;
const OFFERS_QUERY_LIMIT = 300;

function getOfferCategory(offer: Offer) {
  return normalizeOfferCategory(offer.category);
}

function getSavingsAmount(offer: Offer) {
  const price = Number(offer.price || 0);
  const oldPrice = Number(offer.old_price || 0);

  return oldPrice > price ? oldPrice - price : 0;
}

function matchesPriceFilter(offer: Offer, priceFilter: PriceFilter) {
  const price = Number(offer.price || 0);

  if (priceFilter === "under-5") return price <= 5;
  if (priceFilter === "under-10") return price <= 10;
  if (priceFilter === "under-15") return price <= 15;
  return true;
}

function DiscoverClient() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [offerSort, setOfferSort] = useState<OfferSort>("recommended");
  const [pickupFilter, setPickupFilter] = useState<PickupFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canUseFavorites, setCanUseFavorites] = useState(false);
  const [favoriteOfferIds, setFavoriteOfferIds] = useState<number[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const favoriteRequestsInFlight = useRef(new Set<number>());
  const [updatingFavoriteId, setUpdatingFavoriteId] = useState<number | null>(
    null
  );
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFavorites = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("favorites")
      .select("offer_id")
      .eq("user_id", userId);

    if (error) {
      setFavoriteOfferIds([]);
      return;
    }

    setFavoriteOfferIds(
      (data || []).map((favorite) => Number(favorite.offer_id))
    );
  }, []);

  const loadOffers = useCallback(async (runMaintenance = true) => {
    // The maintenance RPC is a database write; run it on page load, not on
    // every live update (that made every open browser run it at once).
    // Fire-and-forget: the offers read below does not wait for it.
    if (runMaintenance) void processExpiredMarketplace();

    const { data, error } = await supabase
      .from("offers")
      .select("*, businesses(name, address, business_type)")
      .eq("active", true)
      .gt("quantity", 0)
      .order("id", { ascending: false })
      .limit(OFFERS_QUERY_LIMIT);

    if (error) {
      setMessageTone("error");
      setMessage("Offers could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const summaries = await loadBusinessRatingSummaries();
    setRatingSummaries(summaries);
    setOffers((data || []) as Offer[]);
    setLoading(false);
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // Small random delay spreads the reloads of many open browsers.
    refreshTimer.current = setTimeout(
      () => void loadOffers(false),
      300 + Math.random() * 1200
    );
  }, [loadOffers]);

  function openOfferDetails(offer: Offer) {
    router.push(`/offers/${offer.id}`);
  }

  async function toggleFavorite(offer: Offer) {
    // Synchronous guard: a double tap would otherwise send two inserts while
    // the auth check below is still pending.
    if (favoriteRequestsInFlight.current.has(offer.id)) return;

    favoriteRequestsInFlight.current.add(offer.id);

    try {
      await updateFavorite(offer);
    } finally {
      favoriteRequestsInFlight.current.delete(offer.id);
    }
  }

  async function updateFavorite(offer: Offer) {
    setMessage("");

    const authResult = await getConfirmedUser();

    if (authResult.status === "signed_out") {
      router.push("/login?redirect=/discover");
      return;
    }

    if (authResult.status === "unverified") {
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      return;
    }

    const userId = authResult.user.id;

    if (!canUseFavorites) {
      setMessageTone("warning");
      setMessage("Favorites are available for customer accounts.");
      return;
    }

    setUpdatingFavoriteId(offer.id);

    const isFavorite = favoriteOfferIds.includes(offer.id);

    if (isFavorite) {
      setFavoriteOfferIds((currentFavorites) =>
        currentFavorites.filter((offerId) => offerId !== offer.id)
      );

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("offer_id", offer.id);

      if (error) {
        setMessageTone("error");
        setMessage("Favorite could not be removed. Please try again.");
        await loadFavorites(userId);
      }

      setUpdatingFavoriteId(null);
      return;
    }

    setFavoriteOfferIds((currentFavorites) => [...currentFavorites, offer.id]);

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      offer_id: offer.id,
    });

    // 23505 = already saved (e.g. from another tab) — that's the goal state.
    if (error && error.code !== "23505") {
      setMessageTone("error");
      setMessage("Favorite could not be saved. Please try again.");
      await loadFavorites(userId);
    }

    setUpdatingFavoriteId(null);
  }

  useEffect(() => {
    // Homepage category chips link to /discover?category=Bakery etc.
    const initialCategory = window.setTimeout(() => {
      const requestedCategory = new URLSearchParams(window.location.search).get(
        "category"
      );

      if (
        requestedCategory &&
        (OFFER_CATEGORIES as readonly string[]).includes(requestedCategory)
      ) {
        setSelectedCategory(requestedCategory);
      }
    }, 0);

    return () => window.clearTimeout(initialCategory);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOffers(), 0);

    const channel = supabase
      .channel(uniqueChannelName("offers-live-updates"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_ratings" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoad);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [loadOffers, scheduleRefresh]);

  useEffect(() => {
    let active = true;

    async function initialiseFavorites() {
      const authResult = await getConfirmedUser();

      if (!active) return;

      if (authResult.status !== "confirmed") {
        setCurrentUserId(null);
        setCanUseFavorites(false);
        setFavoriteOfferIds([]);
        return;
      }

      const userId = authResult.user.id;
      const profile = await getProfileById(userId, 3);
      const isCustomer = profile?.role === "customer";

      if (!active) return;

      setCurrentUserId(userId);
      setCanUseFavorites(isCustomer);

      if (isCustomer) {
        await loadFavorites(userId);
      } else {
        setFavoriteOfferIds([]);
      }
    }

    void initialiseFavorites();

    return () => {
      active = false;
    };
  }, [loadFavorites]);

  useEffect(() => {
    if (!currentUserId || !canUseFavorites) return;

    const channel = supabase
      .channel(uniqueChannelName(`favorites-live-updates-${currentUserId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void loadFavorites(currentUserId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canUseFavorites, currentUserId, loadFavorites]);

  const filteredOffers = useMemo(() => {
    const matchingOffers = offers.filter((offer) => {
      const category = getOfferCategory(offer);
      const text =
        `${offer.title} ${category} ${getOfferCategoryLabel(category, "ka")} ${getOfferCategoryLabel(category, "en")} ${offer.businesses?.name} ${offer.businesses?.address} ${offer.businesses?.business_type} ${formatBusinessType(offer.businesses?.business_type, "ka")}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || category === selectedCategory;
      const matchesAvailability = !availableOnly || isOfferReservable(offer);
      const matchesPickup =
        pickupFilter === "all" || getOfferGroup(offer) === pickupFilter;
      const matchesPrice = matchesPriceFilter(offer, priceFilter);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability &&
        matchesPickup &&
        matchesPrice
      );
    });

    return [...matchingOffers].sort((firstOffer, secondOffer) => {
      const firstPrice = Number(firstOffer.price || 0);
      const secondPrice = Number(secondOffer.price || 0);
      const firstRating =
        ratingSummaries[firstOffer.business_id]?.average_rating || 0;
      const secondRating =
        ratingSummaries[secondOffer.business_id]?.average_rating || 0;

      if (offerSort === "price-asc") return firstPrice - secondPrice;
      if (offerSort === "price-desc") return secondPrice - firstPrice;
      if (offerSort === "savings-desc") {
        return getSavingsAmount(secondOffer) - getSavingsAmount(firstOffer);
      }
      if (offerSort === "rating-desc") {
        if (firstRating !== secondRating) return secondRating - firstRating;
      }
      return compareMarketplaceOffers(firstOffer, secondOffer, ratingSummaries);
    });
  }, [
    availableOnly,
    offerSort,
    offers,
    pickupFilter,
    priceFilter,
    ratingSummaries,
    search,
    selectedCategory,
  ]);

  const paginatedOffers = useMemo(
    () => paginateItems(filteredOffers, page, OFFERS_PAGE_SIZE),
    [filteredOffers, page]
  );

  const groupedOffers = useMemo<Record<OfferGroup, Offer[]>>(
    () => ({
      today: paginatedOffers.items.filter((offer) => getOfferGroup(offer) === "today"),
      tomorrow: paginatedOffers.items.filter(
        (offer) => getOfferGroup(offer) === "tomorrow"
      ),
      upcoming: paginatedOffers.items.filter(
        (offer) => getOfferGroup(offer) === "upcoming"
      ),
    }),
    [paginatedOffers.items]
  );

  // Day sections only make sense for the default order; with an explicit
  // sort (price, discount, ...) splitting into Today/Tomorrow put e.g. the
  // cheapest "tomorrow" box after pricier "today" ones.
  const offerSections =
    offerSort === "recommended"
      ? [
          { key: "today" as const, title: t("common.today"), offers: groupedOffers.today },
          {
            key: "tomorrow" as const,
            title: t("common.tomorrow"),
            offers: groupedOffers.tomorrow,
          },
          { key: "upcoming" as const, title: t("common.upcoming"), offers: groupedOffers.upcoming },
        ]
      : [
          {
            key: "today" as const,
            title: t("offers.heading"),
            offers: paginatedOffers.items,
          },
        ];

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(offers.map(getOfferCategory))).sort();
  }, [offers]);

  const filtersAreActive =
    search.trim() !== "" ||
    selectedCategory !== "all" ||
    offerSort !== "recommended" ||
    pickupFilter !== "all" ||
    priceFilter !== "all" ||
    !availableOnly;

  function resetFilters() {
    setSearch("");
    setSelectedCategory("all");
    setOfferSort("recommended");
    setPickupFilter("all");
    setPriceFilter("all");
    setAvailableOnly(true);
    setPage(1);
  }

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (offerSort !== "recommended" ? 1 : 0) +
    (pickupFilter !== "all" ? 1 : 0) +
    (priceFilter !== "all" ? 1 : 0) +
    (!availableOnly ? 1 : 0);

  return (
    <main className="app-shell">
      <Navbar />

      <section className="theme-forest relative overflow-hidden bg-page px-4 pb-4 pt-3 sm:px-5 md:px-12 md:pt-8">
        <LeafDecor className="-right-10 -top-8 h-56 w-56 text-brand-forest-2 lg:right-[6%] lg:h-96 lg:w-96" />
        <div className="relative mx-auto max-w-7xl">
          <h1 className="max-w-3xl font-serif text-[1.375rem] font-bold leading-[1.25] text-cream sm:text-3xl md:text-4xl">
            {t("offers.title")}
          </h1>

          <div className="mt-4 flex gap-2">
            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("offers.search")}
              label={t("offers.search")}
              className="w-full min-w-0 md:max-w-xl"
            />
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="discover-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className="premium-button-secondary flex min-h-11 shrink-0 items-center gap-2 px-4 md:hidden"
            >
              {t("native.home.filters")}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand-mint px-2 text-xs font-bold text-brand-forest">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div
            id="discover-filters"
            className={`${filtersOpen ? "grid" : "hidden"} mt-3 gap-3 md:grid`}
          >
            <div
              role="group"
              aria-label={
                isGeorgian
                  ? "შეთავაზებების ფილტრი კატეგორიით"
                  : "Filter offers by category"
              }
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5 md:mx-0 md:flex-wrap md:px-0"
            >
              {["all", ...categoryOptions].map((category) => {
                const selected = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedCategory(category);
                      setPage(1);
                    }}
                    className={`flex min-h-11 flex-none items-center rounded-full px-4 text-[13px] transition ${
                      category === "all"
                        ? "action-pill"
                        : `${getOfferCategoryTone(category)} bg-cat text-cat-ink`
                    } ${selected ? "font-bold outline outline-2 outline-offset-2 outline-brand-ground" : "font-medium"}`}
                  >
                    {category === "all"
                      ? t("offers.allCategories")
                      : getOfferCategoryLabel(category, language)}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto] xl:items-center">
              <select
                value={priceFilter}
                onChange={(event) => {
                  setPriceFilter(event.target.value as PriceFilter);
                  setPage(1);
                }}
                aria-label={
                  isGeorgian
                    ? "შეთავაზებების ფილტრი ფასით"
                    : "Filter offers by price"
                }
                className="premium-input w-full min-w-0 px-4 py-3"
              >
                <option value="all">
                  {isGeorgian ? "ყველა ფასი" : "All prices"}
                </option>
                <option value="under-5">
                  {isGeorgian ? "5 ₾ ან ნაკლები" : "₾ 5 or less"}
                </option>
                <option value="under-10">
                  {isGeorgian ? "10 ₾ ან ნაკლები" : "₾ 10 or less"}
                </option>
                <option value="under-15">
                  {isGeorgian ? "15 ₾ ან ნაკლები" : "₾ 15 or less"}
                </option>
              </select>

              <select
                value={pickupFilter}
                onChange={(event) => {
                  setPickupFilter(event.target.value as PickupFilter);
                  setPage(1);
                }}
                aria-label={
                  isGeorgian
                    ? "შეთავაზებების ფილტრი წაღების თარიღით"
                    : "Filter offers by pickup date"
                }
                className="premium-input w-full min-w-0 px-4 py-3"
              >
                <option value="all">
                  {isGeorgian ? "ნებისმიერი დღე" : "Any day"}
                </option>
                <option value="today">{t("common.today")}</option>
                <option value="tomorrow">{t("common.tomorrow")}</option>
                <option value="upcoming">{t("common.upcoming")}</option>
              </select>

              <select
                value={offerSort}
                onChange={(event) => {
                  setOfferSort(event.target.value as OfferSort);
                  setPage(1);
                }}
                aria-label={
                  isGeorgian ? "შეთავაზებების დალაგება" : "Sort offers"
                }
                className="premium-input w-full min-w-0 px-4 py-3"
              >
                <option value="recommended">
                  {isGeorgian ? "რეკომენდებული" : "Recommended"}
                </option>
                <option value="price-asc">{t("offers.sortLowest")}</option>
                <option value="price-desc">{t("offers.sortHighest")}</option>
                <option value="savings-desc">
                  {isGeorgian ? "დიდი დანაზოგი" : "Biggest savings"}
                </option>
                <option value="rating-desc">
                  {isGeorgian ? "მაღალი შეფასება" : "Top rated"}
                </option>
              </select>

              <label className="ui-well flex min-h-12 items-center justify-center gap-3 rounded-2xl px-5 py-3 font-semibold text-cream md:justify-start">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => {
                    setAvailableOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="h-5 w-5 accent-mint"
                />
                {t("offers.availableOnly")}
              </label>

              {filtersAreActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="premium-button-secondary min-h-12 px-6 py-3"
                >
                  {t("offers.reset")}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <WaveEdge />

      <section className="px-4 pb-6 pt-2 sm:px-5 md:px-12">
        <div className="mx-auto max-w-7xl">
          {message && (
            <div className="mt-5 sm:mt-6">
              <Notice tone={messageTone}>
                {translateUserMessage(message, language)}
              </Notice>
            </div>
          )}

          {loading && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[360px] animate-pulse rounded-[22px] bg-well"
                />
              ))}
            </div>
          )}

          {!loading && filteredOffers.length === 0 && (
            <div className="ui-card mt-6 rounded-[22px] px-5 py-10 text-center sm:px-8">
              <h2 className="text-xl font-semibold text-cream">
                {offers.length === 0
                  ? t("home.noSurpriseBags")
                  : t("offers.noMatching")}
              </h2>
              {filtersAreActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="premium-button mt-6 px-7 py-3"
                >
                  {t("offers.clearFilters")}
                </button>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-8 sm:gap-10">
            {offerSections.map((section, sectionIndex) => {
              if (section.offers.length === 0) return null;

              return (
                <section key={section.key}>
                  {offerSort === "recommended" && (
                    <h2 className="font-serif text-xl font-bold text-cream sm:text-2xl">
                      {section.title}
                    </h2>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {section.offers.map((offer, offerIndex) => {
                      const discount = getDiscountPercent(offer);
                      const originalPrice = getOriginalPrice(offer);
                      const reservable = isOfferReservable(offer);
                      const isFavorite = favoriteOfferIds.includes(offer.id);

                      return (
                        <div
                          key={offer.id}
                          className={`${getOfferCategoryTone(offer.category)} group relative flex flex-col rounded-[28px] bg-cat p-4 transition hover:-translate-y-1`}
                        >
                          <div className="relative">
                            <div className="photo-frame relative isolate h-48 overflow-hidden sm:h-56">
                              <OfferImage
                                src={offer.image_url}
                                alt={offer.title}
                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                priority={sectionIndex === 0 && offerIndex === 0}
                                className="transition duration-500 group-hover:scale-105"
                              />
                            </div>

                            {discount !== null && (
                              <div className="discount-sticker pointer-events-none absolute -left-1 -top-1">
                                -{discount}%
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleFavorite(offer)}
                              disabled={updatingFavoriteId !== null}
                              aria-label={
                                isFavorite
                                  ? `${t("offers.removeFavorite")} - ${offer.title}`
                                  : `${t("offers.addFavorite")} - ${offer.title}`
                              }
                              aria-pressed={isFavorite}
                              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-brand-ground text-brand-ink disabled:opacity-60"
                            >
                              <HeartIcon className="h-5 w-5" strokeWidth={2} filled={isFavorite} />
                            </button>
                          </div>

                          <div className="flex flex-1 flex-col pt-4">
                            <h3 className="font-serif text-xl font-bold leading-[1.25] text-cream">
                              {offer.title}
                            </h3>
                            <p className="mt-1 truncate text-sm text-body">
                              {[offer.businesses?.name, offer.businesses?.address]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>

                            <div className="mt-3 flex items-end justify-between gap-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold text-mint">
                                  {formatMoney(offer.price)}
                                </span>
                                {originalPrice !== null && (
                                  <span className="text-sm font-medium text-muted line-through">
                                    {formatMoney(originalPrice)}
                                  </span>
                                )}
                              </div>
                              <p className="flex items-center gap-1.5 text-right text-xs font-semibold text-muted">
                                <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                                {getOfferDateLabel(offer, language)}{" "}
                                {formatPickupTimeRange(offer, language)}
                              </p>
                            </div>

                            <button
                              onClick={() => openOfferDetails(offer)}
                              className="premium-button mt-4 min-h-12 w-full px-6 py-3"
                            >
                              {reservable
                                ? t("common.viewDetails")
                                : Number(offer.quantity || 0) <= 0
                                ? t("common.soldOut")
                                : t("common.unavailable")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <Pagination
            className="mt-8"
            page={paginatedOffers.page}
            totalItems={filteredOffers.length}
            pageSize={OFFERS_PAGE_SIZE}
            label={t("nav.offers")}
            onPageChange={setPage}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default withNativeScreen(DiscoverClient, NativeHomeScreen);
