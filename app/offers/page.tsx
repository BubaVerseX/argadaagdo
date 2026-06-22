"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
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
  getOfferGroup,
  getRatingLabel,
  isOfferReservable,
  type OfferGroup,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PriceSort = "newest" | "price-asc" | "price-desc";

function getOfferCategory(offer: Offer) {
  return normalizeOfferCategory(offer.category);
}

function formatOfferMatches(count: number, language: "en" | "ka") {
  if (language === "ka") return `${count} შეთავაზება ემთხვევა ფილტრებს.`;
  return `${count} ${count === 1 ? "offer matches" : "offers match"} your filters.`;
}

function formatAvailableOfferCount(count: number, language: "en" | "ka") {
  if (language === "ka") return `${count} ხელმისაწვდომი შეთავაზება`;
  return `${count} ${count === 1 ? "available offer" : "available offers"}`;
}

export default function OffersPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceSort, setPriceSort] = useState<PriceSort>("newest");
  const [availableOnly, setAvailableOnly] = useState(true);
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
      .order("id", { ascending: false });

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

      return matchesSearch && matchesCategory && matchesAvailability;
    });

    return [...matchingOffers].sort((firstOffer, secondOffer) => {
      const firstPrice = Number(firstOffer.price || 0);
      const secondPrice = Number(secondOffer.price || 0);

      if (priceSort === "price-asc") return firstPrice - secondPrice;
      if (priceSort === "price-desc") return secondPrice - firstPrice;
      return compareMarketplaceOffers(firstOffer, secondOffer, ratingSummaries);
    });
  }, [availableOnly, offers, priceSort, ratingSummaries, search, selectedCategory]);

  const groupedOffers = useMemo<Record<OfferGroup, Offer[]>>(
    () => ({
      today: filteredOffers.filter((offer) => getOfferGroup(offer) === "today"),
      tomorrow: filteredOffers.filter(
        (offer) => getOfferGroup(offer) === "tomorrow"
      ),
      upcoming: filteredOffers.filter(
        (offer) => getOfferGroup(offer) === "upcoming"
      ),
    }),
    [filteredOffers]
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
    priceSort !== "newest" ||
    !availableOnly;

  function resetFilters() {
    setSearch("");
    setSelectedCategory("all");
    setPriceSort("newest");
    setAvailableOnly(true);
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="relative overflow-hidden px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-6 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 md:text-sm">
              {t("offers.badge")}
            </p>

            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl md:text-7xl">
              {t("offers.title")}
            </h1>

            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-green-50 md:text-lg">
              {t("offers.subtitle")}
            </p>

            <p className="mt-4 max-w-2xl text-sm font-black text-green-100">
              {t("offers.filterHint")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-7 md:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("offers.search")}
                className="min-h-12 w-full rounded-2xl bg-white p-3 font-bold text-gray-950 outline-none sm:p-4 md:max-w-xl"
              />

              <button
                onClick={resetFilters}
                className="min-h-12 rounded-2xl bg-white/15 px-6 py-3 font-black text-white hover:bg-white/20 sm:py-4"
              >
                {t("offers.reset")}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                aria-label="Filter offers by category"
                className="min-h-12 rounded-2xl bg-white p-3 font-bold text-gray-950 outline-none sm:p-4"
              >
                <option value="all">{t("offers.allCategories")}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={priceSort}
                onChange={(event) => setPriceSort(event.target.value as PriceSort)}
                aria-label="Sort offers by price"
                className="min-h-12 rounded-2xl bg-white p-3 font-bold text-gray-950 outline-none sm:p-4"
              >
                <option value="newest">{t("offers.sortNewest")}</option>
                <option value="price-asc">{t("offers.sortLowest")}</option>
                <option value="price-desc">{t("offers.sortHighest")}</option>
              </select>

              <label className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-white/15 px-5 py-3 font-black text-white md:justify-start">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                  className="h-5 w-5 accent-green-600"
                />
                {t("offers.availableOnly")}
              </label>
            </div>

          </div>

          <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:mt-8 sm:p-6">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("offers.surpriseBagTitle")}
            </p>
            <p className="mt-3 max-w-3xl font-semibold leading-7 text-gray-700">
              {t("offers.surpriseBagText")}
            </p>
          </div>

          {message && (
            <div className="mt-5 sm:mt-6">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          <div className="mt-8 sm:mt-10">
            <h2 className="text-2xl font-black sm:text-3xl md:text-4xl">
              {t("offers.heading")}
            </h2>
            <p className="mt-2 font-semibold text-gray-700">
              {formatOfferMatches(filteredOffers.length, language)}
            </p>
          </div>

          {loading && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[430px] animate-pulse rounded-[2rem] bg-white shadow-sm"
                />
              ))}
            </div>
          )}

          {!loading && filteredOffers.length === 0 && (
            <div className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-sm">
              <div className="bg-gradient-to-br from-green-50 via-white to-yellow-50 px-5 py-10 text-center sm:px-8 sm:py-12">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl shadow-sm">
                  🥡
                </div>

                <h3 className="mt-5 text-2xl font-black text-gray-950 sm:text-3xl">
                  {offers.length === 0
                    ? t("offers.noOffers")
                    : t("offers.noMatching")}
                </h3>

                <p className="mx-auto mt-3 max-w-xl text-base font-semibold leading-7 text-gray-600 sm:text-lg">
                  {offers.length === 0
                    ? t("offers.noOffersHint")
                    : t("offers.noMatchingHint")}
                </p>

                {offers.length === 0 && (
                  <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-green-700 sm:text-base">
                    {t("offers.checkBackSoon")}
                  </p>
                )}

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  {filtersAreActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="min-h-12 rounded-full bg-green-700 px-7 py-3 font-black text-white transition hover:bg-green-800"
                    >
                      {t("offers.clearFilters")}
                    </button>
                  )}

                  <Link
                    href="/"
                    className="min-h-12 rounded-full border border-green-200 bg-white px-7 py-3 text-center font-black text-green-800 transition hover:bg-green-50"
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
                      <h3 className="text-xl font-black sm:text-2xl">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
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

                      return (
                        <div
                          key={offer.id}
                          className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-[2rem]"
                        >
                          <div className="relative h-52 overflow-hidden bg-gradient-to-br from-green-100 to-yellow-100 sm:h-56 md:h-60">
                            <OfferImage
                              src={offer.image_url}
                              alt={offer.title}
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="transition duration-500 group-hover:scale-105"
                            />

                            <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-green-700 shadow-sm">
                              {getOfferCategory(offer)}
                            </div>

                            {discount && (
                              <div className="absolute right-4 top-4 rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm">
                                -{discount}%
                              </div>
                            )}
                          </div>

                          <div className="p-4 sm:p-5 md:p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-xl font-black leading-tight sm:text-2xl">
                                  {offer.title}
                                </h4>

                                <p className="mt-2 text-lg font-bold text-gray-800">
                                  {offer.businesses?.name}
                                </p>

                                <p className="mt-1 text-sm font-black text-yellow-700">
                                  ⭐ {getRatingLabel(rating, language)}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-green-50 px-4 py-3 text-center">
                                <p className="text-xs font-black text-green-700">
                                  {t("offers.boxesLeft")}
                                </p>
                                <p className="text-2xl font-black text-green-800">
                                  {offer.quantity}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-semibold text-gray-600">
                                📍 {businessAddress}
                              </p>

                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${t("common.openMap")} ${offer.businesses?.name || offer.title}`}
                                className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                              >
                                {t("common.openMap")}
                              </a>
                            </div>

                            <p className="mt-2 font-semibold text-gray-600">
                              ⏰ {formatPickupWindow(offer, language)}
                            </p>

                            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <span className="text-4xl font-black text-green-700">
                                  {formatMoney(offer.price)}
                                </span>

                                {offer.old_price && (
                                  <span className="ml-3 font-bold text-gray-400 line-through">
                                    {formatMoney(offer.old_price)}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                  onClick={() => toggleFavorite(offer)}
                                  disabled={updatingFavoriteId !== null}
                                  aria-label={
                                    favoriteOfferIds.includes(offer.id)
                                      ? `Remove ${offer.title} from favorites`
                                      : `Add ${offer.title} to favorites`
                                  }
                                  className="min-h-12 w-full rounded-full border border-green-200 bg-green-50 px-6 py-3 font-black text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                  {updatingFavoriteId === offer.id
                                    ? t("offers.updatingFavorite")
                                    : favoriteOfferIds.includes(offer.id)
                                    ? t("offers.removeFavorite")
                                    : t("offers.addFavorite")}
                                </button>

                                <button
                                  onClick={() => openOfferDetails(offer)}
                                  className="min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
