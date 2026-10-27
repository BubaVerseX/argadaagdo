"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import StatCard from "@/components/StatCard";
import { HeartIcon, MapPinIcon } from "@/components/icons";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import { translateUserMessage } from "@/lib/messageTranslations";
import type { TranslationKey } from "@/lib/i18n";
import { getOfferCategoryLabel } from "@/lib/offerCategories";
import {
  formatMoney,
  getOriginalPrice,
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

type FavoriteOfferDetails = {
  favorite_id: number;
  offer_id: number;
  business_id: number;
  title: string;
  category: string | null;
  price: number | string;
  old_price: number | string | null;
  quantity: number | null;
  pickup_date: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
  active: boolean | null;
  status: string | null;
  image_url: string | null;
  business_name: string | null;
  business_address: string | null;
  business_type: string | null;
};

function getFavoriteAvailability(
  offer: Offer | null | undefined,
  t: (key: TranslationKey) => string
) {
  if (!offer) {
    return {
      label: t("common.unavailable"),
      className: "ui-card text-body",
    };
  }

  const status = getEffectiveOfferStatus(offer);

  if (status === "active") {
    return {
      label: t("common.available"),
      className: "ui-card text-mint",
    };
  }

  if (status === "sold_out") {
    return {
      label: t("common.soldOut"),
      className: "bg-warning-soft text-warning",
    };
  }

  if (status === "expired") {
    return {
      label: t("common.expired"),
      className: "bg-danger-soft text-danger",
    };
  }

  return {
    label: t("common.unavailable"),
    className: "ui-card text-body",
  };
}

function getLoginRedirectUrl(path: string) {
  return `/login?redirect=${encodeURIComponent(path)}`;
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

      const loadedFavorites = (data || []) as unknown as Favorite[];

      // The offers policy only exposes active offers, so a sold-out or
      // expired favorite came back with offers = null (a blank card). Fill
      // those in from get_my_favorite_offers(); until that database function
      // exists the call fails and the page behaves as before.
      if (loadedFavorites.some((favorite) => !favorite.offers)) {
        const { data: details, error: detailsError } = await supabase.rpc(
          "get_my_favorite_offers"
        );

        if (!detailsError && Array.isArray(details)) {
          const offersByFavoriteId = new Map<number, Offer>(
            (details as FavoriteOfferDetails[]).map((row) => [
              row.favorite_id,
              {
                id: row.offer_id,
                business_id: row.business_id,
                title: row.title,
                category: row.category,
                price: row.price,
                old_price: row.old_price,
                quantity: row.quantity,
                pickup_date: row.pickup_date,
                pickup_start: row.pickup_start,
                pickup_end: row.pickup_end,
                active: row.active,
                status: row.status,
                image_url: row.image_url,
                businesses: {
                  name: row.business_name,
                  address: row.business_address,
                  business_type: row.business_type,
                },
              } as Offer,
            ])
          );

          for (const favorite of loadedFavorites) {
            if (!favorite.offers) {
              favorite.offers = offersByFavoriteId.get(favorite.id) || null;
            }
          }
        }
      }

      setFavorites(loadedFavorites);
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
        router.replace(getLoginRedirectUrl("/favorites"));
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
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="premium-surface rounded-3xl p-5 sm:rounded-[22px] sm:p-8 md:rounded-3xl md:p-12">
          <p className="premium-badge px-4 py-2">
            {t("favorites.badge")}
          </p>

          <h1 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl md:text-6xl">
            {t("favorites.title")}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-body sm:text-lg">
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
            <Notice tone={messageTone}>
              {translateUserMessage(message, language)}
            </Notice>
          </div>
        )}

        {loading && (
          <div className="mt-8 premium-card rounded-3xl p-8">
            <p className="text-body">
              {t("favorites.loading")}
            </p>
          </div>
        )}

        {!loading && favorites.length === 0 && !message && (
          <div className="mt-8 premium-card rounded-[22px] p-10 text-center">
            <div className="ui-well mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <HeartIcon className="h-9 w-9 text-mint" strokeWidth={1.6} />
            </div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-mint">
              {t("favorites.emptyTitle")}
            </p>

            <h2 className="mt-2 text-3xl font-semibold text-cream">
              {t("favorites.educationTitle")}
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-body">
              {t("favorites.educationText")}
            </p>

            <p className="mt-4 text-sm text-body">
              {t("favorites.emptyHint")}
            </p>

            <Link
              href="/offers"
              className="mt-6 premium-button px-8 py-3 sm:py-4"
            >
              {t("common.browseOffers")}
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="mt-6 premium-muted-card rounded-3xl p-5 sm:p-6">
            <p className="font-semibold text-cream">
              {t("favorites.trustReminder")}
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite, index) => {
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
                className="ui-card rounded-[22px] p-4"
              >
                <div className="relative">
                  <div
                    className="photo-frame relative isolate h-52 sm:h-56"
                  >
                    {offer ? (
                      <OfferImage
                        src={offer.image_url}
                        alt={offer.title}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-center text-xl font-semibold text-cream">
                        {t("common.offerUnavailable")}
                      </div>
                    )}
                  </div>

                  <div
                    className={`absolute left-2 top-2 rounded-full px-4 py-2 text-sm font-semibold ${availability.className}`}
                  >
                    {availability.label}
                  </div>

                  {offer && (
                    <div className="ui-card absolute right-2 top-2 rounded-full px-4 py-2 text-sm font-semibold text-cream">
                      {getOfferCategoryLabel(offer.category, language)}
                    </div>
                  )}
                </div>

                <div className="pt-5">
                  <h2 className="text-xl font-semibold leading-tight text-cream sm:text-2xl">
                    {offer?.title || t("favorites.offerUnavailable")}
                  </h2>

                  <p className="mt-2 text-lg font-semibold text-cream">
                    {offer?.businesses?.name || t("common.businessUnavailable")}
                  </p>

                  <div className="mt-4 grid gap-3 font-semibold text-body">
                    <div className="grid gap-3 rounded-3xl bg-well p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-well p-4">
                          <p className="text-xs uppercase tracking-wide text-body">
                            {t("offerDetail.pickupDate")}
                          </p>
                          <p className="mt-1 font-semibold text-cream">
                            {offer
                              ? getOfferDateLabel(offer, language)
                              : t("common.unavailable")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-well p-4">
                          <p className="text-xs uppercase tracking-wide text-body">
                            {t("offerDetail.pickupTime")}
                          </p>
                          <p className="mt-1 font-semibold text-cream">
                            {offer
                              ? formatPickupTimeRange(offer, language)
                              : t("common.unavailable")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} />
                          {offer?.businesses?.address ||
                            t("favorites.offerEndedHint")}
                        </p>

                        {offer?.businesses?.address && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${t("common.openMap")} ${
                              offer.businesses?.name || offer.title
                            }`}
                            className="ui-card inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-cream transition hover:text-mint sm:w-auto"
                          >
                            {t("common.openMap")}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    <div className="ui-card rounded-3xl p-4">
                      {offer && (
                        <>
                          <p className="text-xs uppercase tracking-wide text-body">
                            {t("common.price")}
                          </p>
                          <div className="mt-1 flex flex-wrap items-end gap-3">
                            <span className="text-4xl font-semibold text-mint">
                              {formatMoney(offer.price)}
                            </span>

                            {getOriginalPrice(offer) !== null && (
                              <span className="pb-1 font-medium text-body line-through">
                                {formatMoney(getOriginalPrice(offer))}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-body">
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
                        aria-label={
                          language === "ka"
                            ? `რჩეულებიდან წაშლა: ${offer?.title || "შეთავაზება"}`
                            : `Remove ${offer?.title || "offer"} from favorites`
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-danger-soft px-5 py-3 font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HeartIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} filled />
                        {removingFavoriteId === favorite.id
                          ? language === "ka"
                            ? "იშლება..."
                            : "Removing..."
                          : t("offers.removeFavorite")}
                      </button>

                      {offer && isOfferReservable(offer) && (
                        <Link
                          href={`/offers/${offer.id}`}
                          className="premium-button min-h-12 px-5 py-3 text-center"
                        >
                          {t("favorites.viewOffer")}
                        </Link>
                      )}

                      {/* A sold-out/expired offer's own page isn't public any
                          more; point to the business's current offers. */}
                      {offer && !isOfferReservable(offer) && (
                        <Link
                          href={`/businesses/${offer.business_id}`}
                          className="premium-button-secondary min-h-12 px-5 py-3 text-center"
                        >
                          {language === "ka"
                            ? "ბიზნესის სხვა შეთავაზებები"
                            : "More from this business"}
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
