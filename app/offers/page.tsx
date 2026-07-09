"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { Pagination } from "@/components/Pagination";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import { normalizeOfferCategory } from "@/lib/offerCategories";
import {
  compareMarketplaceOffers,
  formatMoney,
  formatPickupWindow,
  getOfferDateLabel,
  getOfferGroup,
  getRatingLabel,
  isOfferReservable,
  type OfferGroup,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { paginateItems } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
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

function formatAvailableOfferCount(count: number, language: "en" | "ka") {
  if (language === "ka") return `${count} ხელმისაწვდომი შეთავაზება`;
  return `${count} ${count === 1 ? "available offer" : "available offers"}`;
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

export default function OffersPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
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

  const loadOffers = useCallback(async () => {
    await processExpiredMarketplace();

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
    refreshTimer.current = setTimeout(() => void loadOffers(), 150);
  }, [loadOffers]);

  function openOfferDetails(offer: Offer) {
    router.push(`/offers/${offer.id}`);
  }

  async function toggleFavorite(offer: Offer) {
    setMessage("");

    const authResult = await getConfirmedUser();

    if (authResult.status === "signed_out") {
      router.push("/login");
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

    if (error) {
      setMessageTone("error");
      setMessage("Favorite could not be saved. Please try again.");
      await loadFavorites(userId);
    }

    setUpdatingFavoriteId(null);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOffers(), 0);

    const channel = supabase
      .channel("offers-live-updates")
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
      .channel(`favorites-live-updates-${currentUserId}`)
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
        `${offer.title} ${category} ${offer.businesses?.name} ${offer.businesses?.address} ${offer.businesses?.business_type}`.toLowerCase();

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

  const offerSections = [
    { key: "today" as const, title: t("common.today"), offers: groupedOffers.today },
    {
      key: "tomorrow" as const,
      title: t("common.tomorrow"),
      offers: groupedOffers.tomorrow,
    },
    { key: "upcoming" as const, title: t("common.upcoming"), offers: groupedOffers.upcoming },
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

  return (
    <main className="min-h-screen bg-[#d9d5cb] text-[#1a1815]">
      <Navbar />

      <section className="relative overflow-hidden px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-[1.75rem] bg-[#f2efe6] p-5 shadow-[var(--shadow-soft)] sm:p-6 md:rounded-[2rem] md:p-10">
            <p className="premium-badge px-4 py-2">
              {t("offers.badge")}
            </p>

            <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-[-0.03em] text-[#1a1815] sm:text-4xl md:text-6xl">
              {t("offers.title")}
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-[1.55] text-[#6b6558] md:text-lg">
              {t("offers.subtitle")}
            </p>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t("offers.search")}
                aria-label={t("offers.search")}
                className="premium-input w-full px-4 py-3 md:max-w-xl"
              />

              <button
                onClick={resetFilters}
                className="premium-button-secondary px-6 py-3"
              >
                {t("offers.reset")}
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-center">
              <select
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter offers by category"
                className="premium-input px-4 py-3"
              >
                <option value="all">{t("offers.allCategories")}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={priceFilter}
                onChange={(event) => {
                  setPriceFilter(event.target.value as PriceFilter);
                  setPage(1);
                }}
                aria-label="Filter offers by price"
                className="premium-input px-4 py-3"
              >
                <option value="all">All prices</option>
                <option value="under-5">₾ 5 or less</option>
                <option value="under-10">₾ 10 or less</option>
                <option value="under-15">₾ 15 or less</option>
              </select>

              <select
                value={pickupFilter}
                onChange={(event) => {
                  setPickupFilter(event.target.value as PickupFilter);
                  setPage(1);
                }}
                aria-label="Filter offers by pickup date"
                className="premium-input px-4 py-3"
              >
                <option value="all">Any pickup date</option>
                <option value="today">Pickup today</option>
                <option value="tomorrow">Pickup tomorrow</option>
                <option value="upcoming">Upcoming</option>
              </select>

              <select
                value={offerSort}
                onChange={(event) => {
                  setOfferSort(event.target.value as OfferSort);
                  setPage(1);
                }}
                aria-label="Sort offers"
                className="premium-input px-4 py-3"
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">{t("offers.sortLowest")}</option>
                <option value="price-desc">{t("offers.sortHighest")}</option>
                <option value="savings-desc">Highest savings</option>
                <option value="rating-desc">Highest rated businesses</option>
              </select>

              <label className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 font-semibold text-[#1a1815] shadow-[var(--shadow-soft)] md:justify-start">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => {
                    setAvailableOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="h-5 w-5 accent-[#5c7a5c]"
                />
                {t("offers.availableOnly")}
              </label>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-5 text-sm leading-6 text-[#6b6558] shadow-[var(--shadow-soft)]">
              <span className="font-semibold text-[#1a1815]">
                {t("offers.surpriseBagTitle")}
              </span>{" "}
              {t("offers.surpriseBagText")}
            </div>
          </div>

          {message && (
            <div className="mt-5 sm:mt-6">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          <div className="mt-8 sm:mt-10">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
              {t("offers.heading")}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#6b6558]">
              {formatAvailableOfferCount(filteredOffers.length, language)}
            </p>
          </div>

          {loading && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[430px] animate-pulse rounded-[1.75rem] bg-[#f2efe6]"
                />
              ))}
            </div>
          )}

          {!loading && filteredOffers.length === 0 && (
            <div className="mt-8 overflow-hidden rounded-[1.75rem] bg-[#f2efe6] shadow-[var(--shadow-soft)]">
              <div className="px-5 py-10 text-center sm:px-8 sm:py-12">
                <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-[#5c7a5c]" />
                <h3 className="mt-5 text-2xl font-extrabold text-[#1a1815] sm:text-3xl">
                  {offers.length === 0
                    ? t("offers.noOffers")
                    : t("offers.noMatching")}
                </h3>

                <p className="mx-auto mt-3 max-w-xl text-base leading-[1.55] text-[#6b6558] sm:text-lg">
                  {offers.length === 0
                    ? t("offers.noOffersHint")
                    : t("offers.noMatchingHint")}
                </p>

                {offers.length === 0 && (
                  <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[#5c7a5c] sm:text-base">
                    {t("offers.checkBackSoon")}
                  </p>
                )}

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  {filtersAreActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="premium-button px-7 py-3"
                    >
                      {t("offers.clearFilters")}
                    </button>
                  )}

                  <Link
                    href="/"
                    className="premium-button-secondary px-7 py-3"
                  >
                    {t("offers.backHome")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10">
            {offerSections.map((section) => {
              if (section.offers.length === 0) return null;

              return (
                <section key={section.key}>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-[#6b6558]">
                        {formatAvailableOfferCount(section.offers.length, language)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {section.offers.map((offer) => {
                      const businessAddress =
                        offer.businesses?.address || "Tbilisi";
                      const mapsUrl = createMapsSearchUrl(
                        offer.businesses?.address,
                        offer.businesses?.name
                      );
                      const discount =
                        offer.old_price &&
                        Number(offer.old_price) > Number(offer.price)
                          ? Math.round(
                              ((Number(offer.old_price) - Number(offer.price)) /
                                Number(offer.old_price)) *
                                100
                            )
                          : null;
                      const rating = ratingSummaries[offer.business_id];
                      const reservable = isOfferReservable(offer);
                      const isFavorite = favoriteOfferIds.includes(offer.id);

                      return (
                        <div
                          key={offer.id}
                          className="group overflow-hidden rounded-[1.75rem] bg-[#f2efe6] shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-hero)]"
                        >
                          <div className="photo-warm-overlay relative h-52 overflow-hidden sm:h-56 md:h-60">
                            <OfferImage
                              src={offer.image_url}
                              alt={offer.title}
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="transition duration-500 group-hover:scale-105"
                            />

                            {discount && (
                              <div className="premium-discount-badge pointer-events-none absolute left-4 top-4 px-3 py-1.5">
                                -{discount}%
                              </div>
                            )}

                            <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1a1815] shadow-sm">
                              {getOfferCategory(offer)}
                            </div>
                          </div>

                          <div className="p-4 sm:p-5 md:p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h4 className="text-xl font-bold leading-tight tracking-tight text-[#1a1815]">
                                  {offer.title}
                                </h4>
                                <p className="mt-1.5 truncate text-sm font-medium text-[#6b6558]">
                                  {offer.businesses?.name} · {businessAddress}
                                </p>
                              </div>

                              <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                                <p className="text-xl font-bold text-[#1a1815]">
                                  {offer.quantity}
                                </p>
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#8a8272]">
                                  {t("offers.boxesLeft")}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold tracking-tight text-[#5c7a5c]">
                                  {formatMoney(offer.price)}
                                </span>
                                {offer.old_price && (
                                  <span className="text-sm font-medium text-[#8a8272] line-through">
                                    {formatMoney(offer.old_price)}
                                  </span>
                                )}
                              </div>
                              <p className="text-right text-xs font-semibold leading-5 text-[#8a8272]">
                                {getOfferDateLabel(offer, language)}
                                <br />
                                {formatPickupWindow(offer, language)}
                              </p>
                            </div>

                            <p className="mt-4 truncate text-xs font-semibold text-[#8a8272]">
                              {getRatingLabel(rating, language)}
                            </p>

                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${t("common.openMap")} ${offer.businesses?.name || offer.title}`}
                              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1a1815] shadow-sm transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                            >
                              {t("common.openMap")}
                            </a>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <button
                                onClick={() => toggleFavorite(offer)}
                                disabled={updatingFavoriteId !== null}
                                aria-label={
                                  isFavorite
                                    ? `Remove ${offer.title} from favorites`
                                    : `Add ${offer.title} to favorites`
                                }
                                aria-pressed={isFavorite}
                                className="premium-button-secondary min-h-12 w-full px-6 py-3"
                              >
                                {updatingFavoriteId === offer.id
                                  ? t("offers.updatingFavorite")
                                  : isFavorite
                                  ? t("offers.removeFavorite")
                                  : t("offers.addFavorite")}
                              </button>

                              <button
                                onClick={() => openOfferDetails(offer)}
                                className="premium-button min-h-12 w-full px-6 py-3"
                              >
                                {reservable
                                  ? t("common.viewDetails")
                                  : Number(offer.quantity || 0) <= 0
                                  ? t("common.soldOut")
                                  : t("common.unavailable")}
                              </button>
                            </div>
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
            label="Offers"
            onPageChange={setPage}
          />
        </div>
      </section>
    </main>
  );
}
