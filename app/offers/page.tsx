"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { getProfileById } from "@/lib/auth";
import { createMapsSearchUrl } from "@/lib/maps";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PriceSort = "newest" | "price-asc" | "price-desc";

function getOfferCategory(offer: Offer) {
  return offer.category || offer.businesses?.business_type || "Food";
}

export default function OffersPage() {
  const router = useRouter();
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
    const { data, error } = await supabase
      .from("offers")
      .select("*, businesses(name, address, business_type)")
      .eq("active", true)
      .order("id", { ascending: false });

    if (error) {
      setMessageTone("error");
      setMessage("Offers could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    setOffers((data || []) as Offer[]);
    setLoading(false);
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void loadOffers(), 150);
  }, [loadOffers]);

  function openCheckout(offer: Offer) {
    router.push(`/checkout/${offer.id}`);
  }


  async function toggleFavorite(offer: Offer) {
    setMessage("");

    if (!currentUserId) {
      router.push("/login");
      return;
    }

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
        .eq("user_id", currentUserId)
        .eq("offer_id", offer.id);

      if (error) {
        setMessageTone("error");
        setMessage("Favorite could not be removed. Please try again.");
        await loadFavorites(currentUserId);
      }

      setUpdatingFavoriteId(null);
      return;
    }

    setFavoriteOfferIds((currentFavorites) => [...currentFavorites, offer.id]);

    const { error } = await supabase.from("favorites").insert({
      user_id: currentUserId,
      offer_id: offer.id,
    });

    if (error) {
      setMessageTone("error");
      setMessage("Favorite could not be saved. Please try again.");
      await loadFavorites(currentUserId);
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
      const { data: userData } = await supabase.auth.getUser();

      if (!active) return;

      if (!userData.user) {
        setCurrentUserId(null);
        setCanUseFavorites(false);
        setFavoriteOfferIds([]);
        return;
      }

      const profile = await getProfileById(userData.user.id, 3);
      const isCustomer = profile?.role === "customer";

      if (!active) return;

      setCurrentUserId(userData.user.id);
      setCanUseFavorites(isCustomer);

      if (isCustomer) {
        await loadFavorites(userData.user.id);
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
      const matchesAvailability =
        !availableOnly || Number(offer.quantity || 0) > 0;

      return matchesSearch && matchesCategory && matchesAvailability;
    });

    return [...matchingOffers].sort((firstOffer, secondOffer) => {
      const firstPrice = Number(firstOffer.price || 0);
      const secondPrice = Number(secondOffer.price || 0);

      if (priceSort === "price-asc") return firstPrice - secondPrice;
      if (priceSort === "price-desc") return secondPrice - firstPrice;
      return secondOffer.id - firstOffer.id;
    });
  }, [availableOnly, offers, priceSort, search, selectedCategory]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(offers.map(getOfferCategory))).sort();
  }, [offers]);

  const totalAvailable = offers.reduce(
    (total, offer) => total + Number(offer.quantity || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="relative overflow-hidden px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-6 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 md:text-sm">
              Live offers in Tbilisi
            </p>

            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl md:text-7xl">
              Rescue food boxes near you.
            </h1>

            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-green-50 md:text-lg">
              Search live rescue deals, reserve online, and pick up in store.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-7 md:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food, business, address..."
                className="min-h-12 w-full rounded-2xl bg-white p-3 font-bold text-gray-950 outline-none sm:p-4 md:max-w-xl"
              />

              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setPriceSort("newest");
                  setAvailableOnly(true);
                }}
                className="min-h-12 rounded-2xl bg-white/15 px-6 py-3 font-black text-white hover:bg-white/20 sm:py-4"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                aria-label="Filter offers by category"
                className="min-h-12 rounded-2xl bg-white p-3 font-bold text-gray-950 outline-none sm:p-4"
              >
                <option value="all">All categories</option>
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
                <option value="newest">Newest first</option>
                <option value="price-asc">Lowest price</option>
                <option value="price-desc">Highest price</option>
              </select>

              <label className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-white/15 px-5 py-3 font-black text-white md:justify-start">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                  className="h-5 w-5 accent-green-600"
                />
                Available only
              </label>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-3">
              <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
                <p className="text-sm font-black text-green-100">Offers</p>
                <h2 className="text-3xl font-black sm:text-4xl">{offers.length}</h2>
              </div>

              <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
                <p className="text-sm font-black text-green-100">Boxes left</p>
                <h2 className="text-3xl font-black sm:text-4xl">{totalAvailable}</h2>
              </div>

              <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
                <p className="text-sm font-black text-green-100">Pickup</p>
                <h2 className="text-3xl font-black sm:text-4xl">100%</h2>
              </div>
            </div>
          </div>

          {message && (
            <div className="mt-5 sm:mt-6">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          <div className="mt-8 sm:mt-10">
            <h2 className="text-2xl font-black sm:text-3xl md:text-4xl">
              Food rescue offers
            </h2>
            <p className="mt-2 font-semibold text-gray-700">
              {filteredOffers.length} offer(s) match your filters.
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
            <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                🥡
              </div>
              <h3 className="mt-5 text-3xl font-black">
                {offers.length === 0 ? "No offers found" : "No matching offers"}
              </h3>
              <p className="mt-3 font-semibold text-gray-600">
                {offers.length === 0
                  ? "Check back later for new rescue boxes."
                  : "Try changing the category, price sort, or availability filter."}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredOffers.map((offer) => {
              const businessAddress = offer.businesses?.address || "Tbilisi";
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
                      {offer.businesses?.business_type || "Food"}
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
                      </div>

                      <div className="rounded-2xl bg-green-50 px-4 py-3 text-center">
                        <p className="text-xs font-black text-green-700">
                          LEFT
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
                        aria-label={`Open map for ${offer.businesses?.name || offer.title}`}
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                      >
                        Open map
                      </a>
                    </div>

                    <p className="mt-2 font-semibold text-gray-600">
                      ⏰ {offer.pickup_start} - {offer.pickup_end}
                    </p>

                    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-4xl font-black text-green-700">
                          ₾{offer.price}
                        </span>

                        {offer.old_price && (
                          <span className="ml-3 font-bold text-gray-400 line-through">
                            ₾{offer.old_price}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => toggleFavorite(offer)}
                          disabled={updatingFavoriteId !== null}
                          className="min-h-12 w-full rounded-full border border-green-200 bg-green-50 px-6 py-3 font-black text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {updatingFavoriteId === offer.id
                            ? "Saving..."
                            : favoriteOfferIds.includes(offer.id)
                            ? "Saved"
                            : "Save"}
                        </button>

                        <button
                          onClick={() => openCheckout(offer)}
                          disabled={Number(offer.quantity || 0) <= 0}
                          className="min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {Number(offer.quantity || 0) <= 0
                            ? "Sold out"
                            : "Reserve"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
