"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeOfferScreen } from "@/components/native/screens";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { LeafDecor, WaveEdge } from "@/components/design/Decor";
import {
  ReviewReportControl,
  useReviewReporterId,
} from "@/components/reviews/ReviewReportControl";
import { ArrowLeftIcon, ChevronDownIcon, ClockIcon, HeartIcon, MapPinIcon } from "@/components/icons";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import { translateUserMessage } from "@/lib/messageTranslations";
import { formatBagsLeft } from "@/lib/greenBag";
import { getGreenBagLabel, getOfferCategoryTone } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupTimeRange,
  formatReviewDate,
  getDiscountPercent,
  getOfferDateLabel,
  isOfferReservable,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import {
  loadBusinessRatingSummaries,
  loadPublicBusinessReviews,
} from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, PublicBusinessReview } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type OfferDetail = Offer & {
  businesses?: Business | null;
};

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function OfferDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [reviews, setReviews] = useState<PublicBusinessReview[]>([]);
  const reviewReporterId = useReviewReporterId();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const notFoundMessage = t("offerDetail.notFound");
  const [canUseFavorites, setCanUseFavorites] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteUpdating, setFavoriteUpdating] = useState(false);
  const favoriteRequestInFlight = useRef(false);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [favoriteMessageTone, setFavoriteMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");

  useEffect(() => {
    let active = true;

    async function loadOffer() {
      const offerId = Number(params.id);

      if (!Number.isFinite(offerId)) {
        setMessage(notFoundMessage);
        setLoading(false);
        return;
      }

      // Tidies expired offers in the background; the read below does not wait.
      void processExpiredMarketplace();

      const [{ data, error }, summaries] = await Promise.all([
        supabase
          .from("offers")
          .select("*, businesses(id, owner_id, name, business_type, address, phone, approved)")
          .eq("id", offerId)
          .maybeSingle(),
        loadBusinessRatingSummaries(),
      ]);

      if (!active) return;

      if (error || !data) {
        setMessage(notFoundMessage);
        setLoading(false);
        return;
      }

      const currentOffer = data as OfferDetail;
      const businessReviews = await loadPublicBusinessReviews(
        currentOffer.business_id
      );

      if (!active) return;

      setOffer(currentOffer);
      setRatingSummaries(summaries);
      setReviews(businessReviews);
      setLoading(false);
    }

    void loadOffer();

    return () => {
      active = false;
    };
  }, [params.id, notFoundMessage]);

  useEffect(() => {
    let active = true;

    async function initialiseFavoriteState() {
      const offerId = Number(params.id);
      if (!Number.isFinite(offerId)) return;

      const authResult = await getConfirmedUser();
      if (!active) return;

      if (authResult.status !== "confirmed") {
        setCanUseFavorites(false);
        setIsFavorite(false);
        return;
      }

      const userId = authResult.user.id;
      const profile = await getProfileById(userId, 3);
      const isCustomer = profile?.role === "customer";

      if (!active) return;

      setCanUseFavorites(isCustomer);

      if (!isCustomer) {
        setIsFavorite(false);
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("offer_id", offerId)
        .maybeSingle();

      if (!active) return;
      if (!error) setIsFavorite(Boolean(data));
    }

    void initialiseFavoriteState();

    return () => {
      active = false;
    };
  }, [params.id]);

  async function toggleFavorite() {
    // Synchronous guard against double taps while the auth check is pending.
    if (favoriteRequestInFlight.current) return;

    favoriteRequestInFlight.current = true;

    try {
      await updateFavorite();
    } finally {
      favoriteRequestInFlight.current = false;
    }
  }

  async function updateFavorite() {
    if (!offer) return;

    setFavoriteMessage("");

    const authResult = await getConfirmedUser();

    if (authResult.status === "signed_out") {
      router.push(`/login?redirect=${encodeURIComponent(`/offers/${offer.id}`)}`);
      return;
    }

    if (authResult.status === "unverified") {
      setFavoriteMessageTone("warning");
      setFavoriteMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      return;
    }

    const userId = authResult.user.id;

    if (!canUseFavorites) {
      setFavoriteMessageTone("warning");
      setFavoriteMessage("Favorites are available for customer accounts.");
      return;
    }

    setFavoriteUpdating(true);

    if (isFavorite) {
      setIsFavorite(false);

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("offer_id", offer.id);

      if (error) {
        setIsFavorite(true);
        setFavoriteMessageTone("error");
        setFavoriteMessage("Favorite could not be removed. Please try again.");
      }

      setFavoriteUpdating(false);
      return;
    }

    setIsFavorite(true);

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      offer_id: offer.id,
    });

    // 23505 = already saved (e.g. from another tab) — that's the goal state.
    if (error && error.code !== "23505") {
      setIsFavorite(false);
      setFavoriteMessageTone("error");
      setFavoriteMessage("Favorite could not be saved. Please try again.");
    }

    setFavoriteUpdating(false);
  }

  const rating = offer ? ratingSummaries[offer.business_id] : undefined;
  const offerCategory = offer ? getGreenBagLabel(offer, language) : "";
  const mapsUrl = offer
    ? createMapsSearchUrl(offer.businesses?.address, offer.businesses?.name)
    : "";
  const reservable = offer ? isOfferReservable(offer) : false;
  const currentPrice = offer ? toNumber(offer.price) : 0;
  const originalPrice = offer ? toNumber(offer.old_price) : 0;
  const reviewCount = rating?.rating_count || reviews.length;
  const averageRating =
    rating && rating.rating_count > 0 ? rating.average_rating.toFixed(1) : null;
  const businessName = offer?.businesses?.name || t("common.business");
  const categoryTone = getOfferCategoryTone(offer?.category);
  const discountPercent = offer ? getDiscountPercent(offer) : null;

  return (
    <main className="app-shell">
      <Navbar hideBottomNav />

      {!message && (
        <div className={categoryTone}>
          <section className="relative overflow-hidden bg-cat px-4 pb-2 pt-4">
            <span
              aria-hidden="true"
              className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-cat-soft"
            />
            <LeafDecor className="-right-8 -top-6 h-48 w-48 text-cat-soft lg:right-[12%] lg:h-72 lg:w-72" />

            <div className="relative mx-auto flex max-w-6xl justify-center">
              <Link
                href="/discover"
                aria-label={t("offerDetail.back")}
                className="absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-brand-ground text-brand-ink transition hover:bg-brand-border"
              >
                <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
              </Link>

              {offer && (
                <button
                  type="button"
                  onClick={() => void toggleFavorite()}
                  disabled={favoriteUpdating}
                  aria-label={
                    isFavorite
                      ? `${t("offers.removeFavorite")} - ${offer.title}`
                      : `${t("offers.addFavorite")} - ${offer.title}`
                  }
                  aria-pressed={isFavorite}
                  className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-brand-ground text-brand-ink transition hover:bg-brand-border focus:outline-none focus-visible:ring-2 focus-visible:ring-mint disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <HeartIcon className="h-5 w-5" strokeWidth={2} filled={isFavorite} />
                </button>
              )}

              <div className="relative mt-3 h-44 w-44 sm:h-60 sm:w-60">
                <div className="photo-hero relative isolate h-full w-full overflow-hidden">
                  {offer ? (
                    <OfferImage
                      src={offer.image_url}
                      alt={offer.title}
                      sizes="240px"
                      priority
                    />
                  ) : (
                    <div className="photo-fallback h-full w-full" />
                  )}
                </div>

                {discountPercent !== null && (
                  <div className="discount-sticker pointer-events-none absolute -bottom-3 -right-8 h-[4.625rem] w-[4.625rem] border-4 border-brand-ground text-[1.0625rem]">
                    −{discountPercent}%
                  </div>
                )}
              </div>
            </div>
          </section>
          <WaveEdge fill="var(--cat)" />
        </div>
      )}

      <section className="px-4 pb-6 pt-2 sm:px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          {loading && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="h-80 animate-pulse rounded-[22px] bg-well" />
              <div className="h-80 animate-pulse rounded-[22px] bg-well" />
            </div>
          )}

          {!loading && message && (
            <div className="mt-8 rounded-[22px] bg-well p-8 text-center">
              <p className="font-serif text-xl font-bold">{message}</p>
              <Link
                href="/discover"
                className="premium-button mt-5 w-full rounded-2xl px-6 py-3 font-bold sm:w-auto"
              >
                {t("native.orders.emptyAction")}
              </Link>
            </div>
          )}

          {!loading && offer && (
            <div className="mx-auto max-w-xl pb-24 lg:pb-0">
              <h1 className="font-serif text-2xl font-bold leading-[1.25] sm:text-4xl">
                {offer.title}
              </h1>
              <Link
                href={`/businesses/${offer.business_id}`}
                className="mt-1 block truncate text-sm text-body transition hover:text-mint"
              >
                {[businessName, offer.businesses?.address].filter(Boolean).join(" · ")}
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-mint">
                    {formatMoney(offer.price)}
                  </span>
                  {originalPrice > currentPrice && (
                    <span className="text-sm text-body line-through">
                      {formatMoney(offer.old_price)}
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1.5 rounded-full bg-well px-3 py-1.5 font-semibold text-cream">
                  <ClockIcon className="h-4 w-4 shrink-0 text-mint" strokeWidth={1.8} />
                  {getOfferDateLabel(offer, language)} {formatPickupTimeRange(offer, language)}
                </p>
              </div>

              {favoriteMessage && (
                <div className="mt-4">
                  <Notice tone={favoriteMessageTone}>
                    {translateUserMessage(favoriteMessage, language)}
                  </Notice>
                </div>
              )}

              <details className="group mt-5 rounded-[22px] bg-well">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold text-cream [&::-webkit-details-marker]:hidden">
                  {t("native.offer.details")}
                  <ChevronDownIcon
                    className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
                    strokeWidth={2}
                  />
                </summary>
                <div className="grid gap-3 px-5 pb-5 leading-7 text-body">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mint">
                    {offerCategory} · {formatBagsLeft(offer, language)}
                  </p>
                  {offer.description && <p>{offer.description}</p>}
                  <p>
                    <span className="font-semibold text-cream">
                      {t("offerDetail.allergens")}:{" "}
                    </span>
                    {offer.allergens || t("offerDetail.allergensAsk")}
                  </p>
                  <p>{t("native.offer.contents")}</p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 font-semibold text-cream hover:text-mint"
                  >
                    <MapPinIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                    {t("common.openMap")}
                  </a>
                  <p className="font-semibold text-cream">
                    {averageRating
                      ? `${t("offerDetail.reviewsTitle")} · ★ ${averageRating} (${reviewCount})`
                      : t("offerDetail.reviewsTitle")}
                  </p>
                  {reviews.length === 0 && <p>{t("common.noReviews")}</p>}
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl bg-page p-4">
                      <p className="flex justify-between gap-3 font-semibold text-cream">
                        <span>★ {review.rating}</span>
                        <span className="text-sm font-normal text-body">
                          {formatReviewDate(review.created_at, language)}
                        </span>
                      </p>
                      <p className="mt-1">
                        {review.review?.trim() || t("common.noWrittenReview")}
                      </p>
                      <ReviewReportControl
                        reviewId={review.id}
                        reporterId={reviewReporterId}
                      />
                    </div>
                  ))}
                  <Link
                    href="/support"
                    className="inline-flex min-h-11 items-center font-semibold text-cream hover:text-mint"
                  >
                    {t("native.offer.help")}
                  </Link>
                </div>
              </details>

              <div className="theme-forest fixed inset-x-3 bottom-[calc(0.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] z-40 flex items-center rounded-3xl bg-page p-3 lg:static lg:mt-5">
                {reservable ? (
                  <Link
                    href={`/checkout/${offer.id}`}
                    className="premium-button min-w-0 flex-1 rounded-2xl px-4 py-3 text-center font-bold"
                  >
                    {t("native.offer.reserve")}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="premium-button min-w-0 flex-1 rounded-2xl px-4 py-3 font-bold"
                  >
                    {t("common.unavailable")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default withNativeScreen(OfferDetailPage, NativeOfferScreen);
