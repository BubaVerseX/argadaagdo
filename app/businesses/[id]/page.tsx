"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { HelpCard } from "@/components/help/HelpCard";
import { InfoBanner } from "@/components/help/InfoBanner";
import { SupportLink } from "@/components/help/SupportLink";
import { TrustBadge } from "@/components/help/TrustBadge";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { normalizeOfferCategory } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupWindow,
  formatReviewDate,
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
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function isApprovedBusiness(value: boolean | string | null | undefined) {
  return value === true || String(value) === "true";
}

function getBusinessInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "A";
}

export default function BusinessProfilePage() {
  const params = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [reviews, setReviews] = useState<PublicBusinessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const notFoundMessage = t("businessProfile.notFound");

  useEffect(() => {
    let active = true;

    async function loadBusiness() {
      const businessId = Number(params.id);

      if (!Number.isFinite(businessId)) {
        setMessage(notFoundMessage);
        setLoading(false);
        return;
      }

      await processExpiredMarketplace();

      const [businessResult, offerResult, summaries, businessReviews] =
        await Promise.all([
          supabase
            .from("businesses")
            .select("*")
            .eq("id", businessId)
            .maybeSingle(),
          supabase
            .from("offers")
            .select("*, businesses(name, address, business_type)")
            .eq("business_id", businessId)
            .eq("active", true)
            .eq("status", "active")
            .gt("quantity", 0)
            .order("id", { ascending: false }),
          loadBusinessRatingSummaries(),
          loadPublicBusinessReviews(businessId),
        ]);

      if (!active) return;

      if (businessResult.error || !businessResult.data) {
        setMessage(notFoundMessage);
        setLoading(false);
        return;
      }

      setBusiness(businessResult.data as Business);
      setOffers((offerResult.data || []) as Offer[]);
      setRatingSummaries(summaries);
      setReviews(businessReviews);
      setLoading(false);
    }

    void loadBusiness();

    return () => {
      active = false;
    };
  }, [params.id, notFoundMessage]);

  const rating = business ? ratingSummaries[business.id] : undefined;
  const heroOffer = offers.find((offer) => offer.image_url) || offers[0];
  const isVerified = isApprovedBusiness(business?.approved);
  const reviewCount = rating?.rating_count || reviews.length;
  const averageRating =
    rating && rating.rating_count > 0 ? rating.average_rating.toFixed(1) : null;
  const joinedDate = business?.created_at
    ? formatReviewDate(business.created_at, language)
    : "Tbilisi pilot";
  const businessDescription =
    business?.description?.trim() ||
    `Verified ${
      business?.business_type || "food"
    } business offering pickup-only surprise bags in Tbilisi.`;
  const completedPickupSignal =
    reviewCount > 0 ? `${reviewCount}+` : "Not published yet";

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/offers"
            className="premium-button-secondary px-5 py-2.5"
          >
            ← {t("businessProfile.back")}
          </Link>

          {loading && (
            <div className="mt-6 h-96 animate-pulse rounded-[2rem] bg-white" />
          )}

          {!loading && message && (
            <div className="mt-6">
              <Notice tone="error">{message}</Notice>
            </div>
          )}

          {!loading && business && (
            <>
              <div className="premium-card mt-6 overflow-hidden rounded-[2rem]">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative h-72 bg-[#eef1e8] sm:h-96 lg:h-full">
                    {heroOffer ? (
                      <OfferImage
                        src={heroOffer.image_url}
                        alt={business.name}
                        sizes="(max-width: 1024px) 100vw, 45vw"
                      />
                    ) : (
                      <div className="flex h-full min-h-72 items-center justify-center">
                        <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white text-4xl font-black text-[#1a1815] shadow-[var(--shadow-soft)]">
                          {getBusinessInitials(business.name)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-8 md:p-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c]">
                        {t("businessProfile.title")}
                      </p>
                      {isVerified && <TrustBadge label={t("businessProfile.verified")} />}
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#eef1e8] text-2xl font-black text-[#1a1815]">
                        {getBusinessInitials(business.name)}
                      </div>
                      <div>
                        <h1 className="text-3xl font-black sm:text-5xl">
                          {business.name}
                        </h1>
                        <p className="mt-2 font-semibold leading-7 text-[#6b6558]">
                          {businessDescription}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 premium-muted-card rounded-3xl p-4 font-semibold text-[#6b6558]">
                      <p>
                        <span className="font-black text-[#1a1815]">
                          {t("businessProfile.businessType")}:
                        </span>{" "}
                        {business.business_type || t("common.food")}
                      </p>
                      <p>
                        <span className="font-black text-[#1a1815]">
                          {t("businessProfile.address")}:
                        </span>{" "}
                        {business.address || t("common.addressUnavailable")}
                      </p>
                      <p>
                        <span className="font-black text-[#1a1815]">
                          Phone:
                        </span>{" "}
                        {business.phone || "Contact through ArGadaagdo support"}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <HelpCard
                        title={t("businessProfile.localBusinessTitle")}
                        text={t("businessProfile.localBusinessText")}
                        icon="B"
                      />
                      <HelpCard
                        title={t("businessProfile.pickupOnlyTitle")}
                        text={t("businessProfile.pickupOnlyText")}
                        icon="P"
                      />
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          {t("common.rating")}
                        </p>
                        <p className="mt-2 text-3xl font-black text-[#1a1815]">
                          {averageRating ? `${averageRating}/5` : t("common.noRatings")}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          {averageRating
                            ? t("businessProfile.outOfFive")
                            : t("common.noRatings")}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          {t("common.reviews")}
                        </p>
                        <p className="mt-2 text-3xl font-black text-[#1a1815]">
                          {reviewCount}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          {t("businessProfile.customerReviews")}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          Completed pickups
                        </p>
                        <p className="mt-2 text-3xl font-black text-[#1a1815]">
                          {completedPickupSignal}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          Public signal from completed rated pickups
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          {t("businessProfile.activeOffers")}
                        </p>
                        <p className="mt-2 text-3xl font-black">
                          {offers.length}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          {t("businessProfile.activeOffersHint")}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          Joined
                        </p>
                        <p className="mt-2 text-2xl font-black text-[#1a1815]">
                          {joinedDate || "Tbilisi pilot"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          Approved local marketplace member
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          Response rate
                        </p>
                        <p className="mt-2 text-2xl font-black text-[#1a1815]">
                          Pilot support
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          Support requests are handled by ArGadaagdo
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                        <p className="text-sm font-black text-[#6b6558]">
                          Opening hours
                        </p>
                        <p className="mt-2 text-2xl font-black text-[#1a1815]">
                          See each offer
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#6b6558]">
                          Pickup windows are shown on active offers
                        </p>
                      </div>
                    </div>

                    {isVerified && (
                      <div className="mt-6">
                        <InfoBanner
                          title={t("businessProfile.trustTitle")}
                          text={t("businessProfile.trustMessage")}
                        >
                          <div className="flex flex-wrap gap-2">
                            <TrustBadge label="Pickup code verification" />
                            <TrustBadge label="Customer ratings" tone="yellow" />
                            <TrustBadge label="Local Tbilisi business" />
                          </div>
                        </InfoBanner>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="premium-card mt-6 rounded-[2rem] p-5 sm:p-8">
                <h2 className="text-2xl font-black">
                  {t("businessProfile.activeOffers")}
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {offers.length === 0 && (
                    <HelpCard
                      title={t("businessProfile.noActiveOffers")}
                      text={t("businessProfile.noActiveOffersHint")}
                      icon="A"
                      href="/offers"
                      actionLabel={t("common.browseOffers")}
                    />
                  )}

                  {offers.map((offer) => {
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
                      <Link
                        key={offer.id}
                        href={`/offers/${offer.id}`}
                        className="premium-card overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                      >
                        <div className="relative h-48 bg-[#eef1e8]">
                          <OfferImage
                            src={offer.image_url}
                            alt={offer.title}
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-black text-[#5c7a5c] shadow-sm">
                            {normalizeOfferCategory(offer.category)}
                          </span>
                          {discount && (
                            <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-black text-[#1a1815] shadow-[var(--shadow-soft)]">
                              Save {discount}%
                            </span>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="text-xl font-black">{offer.title}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#1a1815] shadow-[var(--shadow-soft)]">
                              {formatPickupWindow(offer, language)}
                            </span>
                            <span className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#6b6558]">
                              {t("common.quantity")}: {offer.quantity}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-2xl font-black text-[#5c7a5c]">
                              {formatMoney(offer.price)}
                            </p>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#6b6558] shadow-[var(--shadow-soft)]">
                              {isOfferReservable(offer)
                                ? t("common.available")
                                : t("common.unavailable")}
                            </span>
                          </div>
                          <p className="premium-button mt-4 inline-flex min-h-10 px-4 py-2 text-sm">
                            {t("common.viewDetails")}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="premium-card mt-6 rounded-[2rem] p-5 sm:p-8">
                <h2 className="text-2xl font-black">
                  {t("businessProfile.customerReviews")}
                </h2>
                <p className="mt-2 max-w-2xl font-semibold leading-7 text-[#6b6558]">
                  {t("businessProfile.reviewsIntro")}
                </p>

                <div className="mt-5 grid gap-4">
                  {reviews.length === 0 && (
                    <div className="rounded-3xl bg-[#ece7da] p-6 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
                        R
                      </div>
                      <p className="mt-4 text-lg font-black text-[#1a1815]">
                        {t("common.noReviews")}
                      </p>
                      <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-[#6b6558]">
                        {t("businessProfile.noReviewsHint")}
                      </p>
                      <div className="mt-5 flex justify-center">
                        <SupportLink label="How ratings work" />
                      </div>
                    </div>
                  )}

                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-3xl bg-[#ece7da] p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-black text-[#1a1815]">
                          {review.rating}/5
                        </p>
                        {formatReviewDate(review.created_at, language) && (
                          <p className="text-sm font-bold text-[#6b6558]">
                            {formatReviewDate(review.created_at, language)}
                          </p>
                        )}
                      </div>
                      <p className="mt-2 font-semibold text-[#6b6558]">
                        {review.review?.trim() || t("common.noWrittenReview")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
