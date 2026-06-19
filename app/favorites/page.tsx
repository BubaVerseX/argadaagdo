"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import StatCard from "@/components/StatCard";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import type { TranslationKey } from "@/lib/i18n";
import {
  formatMoney,
  formatPickupTimeRange,
  getEffectiveOfferStatus,
  getOfferDateLabel,
  isOfferReservable,
} from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { Favorite, Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getSavingsAmount(offer: Offer) {
  const currentPrice = toNumber(offer.price);
  const originalPrice = toNumber(offer.old_price);
  return originalPrice > currentPrice ? originalPrice - currentPrice : 0;
}

function getFavoriteAvailability(
  offer: Offer | null | undefined,
  t: (key: TranslationKey) => string
) {
  if (!offer) {
    return {
      label: t("common.unavailable"),
      className: "bg-gray-100 text-gray-700",
    };
  }

  const status = getEffectiveOfferStatus(offer);

  if (status === "active") {
    return {
      label: t("common.available"),
      className: "bg-green-50 text-green-700",
    };
  }

  if (status === "sold_out") {
    return {
      label: t("common.soldOut"),
      className: "bg-yellow-100 text-yellow-800",
    };
  }

  if (status === "expired") {
    return {
      label: t("common.expired"),
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: t("common.unavailable"),
    className: "bg-gray-100 text-gray-700",
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [removingFavoriteId, setRemovingFavoriteId] = useState<number | null>(
    null
  );

  const loadFavorites = useCallback(
    async (userId: string) => {
      await processExpiredMarketplace();

      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          id,
          user_id,
          offer_id,
          created_at,
          offers(
            id,
            business_id,
            title,
            category,
            price,
            old_price,
            quantity,
            pickup_date,
            pickup_start,
            pickup_end,
            active,
            status,
            image_url,
            businesses(name, address, business_type)
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setMessageTone("error");
        setMessage("Favorites could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      setFavorites((data || []) as unknown as Favorite[]);
      setLoading(false);
    },
    []
  );

  async function removeFavorite(favorite: Favorite) {
    if (!currentUserId) return;

    setRemovingFavoriteId(favorite.id);
    setMessage("");
    setFavorites((currentFavorites) =>
      currentFavorites.filter((item) => item.id !== favorite.id)
    );

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", favorite.id)
      .eq("user_id", currentUserId);

    if (error) {
      setMessageTone("error");
      setMessage("Favorite could not be removed. Please try again.");
      await loadFavorites(currentUserId);
    }

    setRemovingFavoriteId(null);
  }

  useEffect(() => {
    let active = true;

    async function initialiseFavorites() {
      const authResult = await getConfirmedUser();

      if (!active) return;

      if (authResult.status === "signed_out") {
        router.replace("/login?redirect=favorites");
        return;
      }

      if (authResult.status === "unverified") {
        setCurrentUserId(null);
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        setLoading(false);
        return;
      }

      const userId = authResult.user.id;
      const profile = await getProfileById(userId, 4);

      if (!active) return;

      setCurrentUserId(userId);

      if (profile?.role !== "customer") {
        setMessageTone("warning");
        setMessage("Favorites are available for customer accounts.");
        setLoading(false);
        return;
      }

      await loadFavorites(userId);
    }

    void initialiseFavorites();

    return () => {
      active = false;
    };
  }, [loadFavorites, router]);

  const availableFavorites = favorites.filter(
    (favorite) => favorite.offers && isOfferReservable(favorite.offers)
  );
  const unavailableFavorites = favorites.length - availableFavorites.length;

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
          <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
            {t("favorites.badge")}
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            {t("favorites.title")}
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:text-lg">
            {t("favorites.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
            <StatCard title={t("favorites.saved")} value={favorites.length} />
            <StatCard
              title={t("common.available")}
              value={availableFavorites.length}
              tone="green"
            />
            <StatCard
              title={t("common.unavailable")}
              value={unavailableFavorites}
              tone="yellow"
            />
          </div>
        </div>

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
            <p className="font-semibold text-gray-600">
              {t("favorites.loading")}
            </p>
          </div>
        )}

        {!loading && favorites.length === 0 && !message && (
          <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              ♥
            </div>

            <p className="mt-5 text-sm font-black uppercase tracking-widest text-green-700">
              {t("favorites.emptyTitle")}
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {t("favorites.educationTitle")}
            </h2>

            <p className="mx-auto mt-3 max-w-xl font-medium leading-7 text-gray-600">
              {t("favorites.educationText")}
            </p>

            <p className="mt-4 text-sm font-bold text-gray-500">
              {t("favorites.emptyHint")}
            </p>

            <Link
              href="/offers"
              className="mt-6 inline-block min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white sm:py-4"
            >
              {t("common.browseOffers")}
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="mt-6 rounded-3xl border border-green-100 bg-white p-5 shadow-sm sm:p-6">
            <p className="font-black text-green-800">
              {t("favorites.trustReminder")}
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => {
            const offer = favorite.offers;
            const availability = getFavoriteAvailability(offer, t);
            const savings = offer ? getSavingsAmount(offer) : 0;
            const mapsUrl = offer
              ? createMapsSearchUrl(
                  offer.businesses?.address,
                  offer.businesses?.name
                )
              : "";

            return (
              <div
                key={favorite.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm sm:rounded-[2rem]"
              >
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-green-100 to-yellow-100 sm:h-56">
                  {offer ? (
                    <OfferImage
                      src={offer.image_url}
                      alt={offer.title}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-xl font-black text-green-800">
                      {t("common.offerUnavailable")}
                    </div>
                  )}

                  <div
                    className={`absolute left-4 top-4 rounded-full px-4 py-2 text-sm font-black shadow-sm ${availability.className}`}
                  >
                    {availability.label}
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                  <h2 className="text-xl font-black leading-tight sm:text-2xl">
                    {offer?.title || "Offer no longer available"}
                  </h2>

                  <p className="mt-2 text-lg font-bold text-gray-800">
                    {offer?.businesses?.name || t("common.businessUnavailable")}
                  </p>

                  <div className="mt-4 grid gap-3 font-semibold text-gray-600">
                    <div className="grid gap-3 rounded-3xl bg-[#F7F6EF] p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            {t("offerDetail.pickupDate")}
                          </p>
                          <p className="mt-1 font-black text-gray-950">
                            {offer
                              ? getOfferDateLabel(offer, language)
                              : t("common.unavailable")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            {t("offerDetail.pickupTime")}
                          </p>
                          <p className="mt-1 font-black text-gray-950">
                            {offer
                              ? formatPickupTimeRange(offer, language)
                              : t("common.unavailable")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                          {offer?.businesses?.address ||
                            "This offer may have ended or become private."}
                        </p>

                        {offer?.businesses?.address && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${t("common.openMap")} ${
                              offer.businesses?.name || offer.title
                            }`}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                          >
                            {t("common.openMap")}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    <div className="rounded-3xl bg-green-50 p-4">
                      {offer && (
                        <>
                          <p className="text-xs font-black uppercase tracking-wide text-green-700">
                            {t("common.price")}
                          </p>
                          <div className="mt-1 flex flex-wrap items-end gap-3">
                            <span className="text-4xl font-black text-green-700">
                              {formatMoney(offer.price)}
                            </span>

                            {offer.old_price && (
                              <span className="pb-1 font-bold text-gray-400 line-through">
                                {formatMoney(offer.old_price)}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-black text-green-800">
                            {t("offerDetail.savings")}:{" "}
                            {savings > 0
                              ? formatMoney(savings)
                              : t("offerDetail.noSavingsListed")}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => removeFavorite(favorite)}
                        disabled={removingFavoriteId !== null}
                        aria-label={`Remove ${offer?.title || "offer"} from favorites`}
                        className="min-h-12 rounded-full border border-red-200 bg-red-50 px-5 py-3 font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingFavoriteId === favorite.id
                          ? "Removing..."
                          : t("offers.removeFavorite")}
                      </button>

                      {offer && (
                        <Link
                          href={`/offers/${offer.id}`}
                          className="min-h-12 rounded-full bg-green-700 px-5 py-3 text-center font-black text-white transition hover:bg-green-800"
                        >
                          {t("favorites.viewOffer")}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
