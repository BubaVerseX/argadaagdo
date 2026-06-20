"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
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

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/offers"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 font-black text-green-800 shadow-sm"
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
              <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative h-72 bg-gradient-to-br from-green-100 to-yellow-100 sm:h-96 lg:h-full">
                    {heroOffer ? (
                      <OfferImage
                        src={heroOffer.image_url}
                        alt={business.name}
                        sizes="(max-width: 1024px) 100vw, 45vw"
                      />
                    ) : (
                      <div className="flex h-full min-h-72 items-center justify-center text-6xl">
                        🥡
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-8 md:p-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-widest text-green-700">
                        {t("businessProfile.title")}
                      </p>
                      {isVerified && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-800">
                          {t("businessProfile.verified")}
                        </span>
                      )}
                    </div>

                    <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                      {business.name}
                    </h1>

                    <div className="mt-5 grid gap-3 rounded-3xl bg-[#F7F6EF] p-4 font-semibold text-gray-700">
                      <p>
                        <span className="font-black text-gray-950">
                          {t("businessProfile.businessType")}:
                        </span>{" "}
                        {business.business_type || t("common.food")}
                      </p>
                      <p>
                        <span className="font-black text-gray-950">
                          {t("businessProfile.address")}:
                        </span>{" "}
                        {business.address || t("common.addressUnavailable")}
                      </p>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl bg-yellow-50 p-5">
                        <p className="text-sm font-black text-yellow-700">
                          {t("common.rating")}
                        </p>
                        <p className="mt-2 text-3xl font-black text-gray-950">
                          {averageRating ? `⭐ ${averageRating}` : "⭐"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-600">
                          {averageRating
                            ? t("businessProfile.outOfFive")
                            : t("common.noRatings")}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-orange-50 p-5">
                        <p className="text-sm font-black text-orange-700">
                          {t("common.reviews")}
                        </p>
                        <p className="mt-2 text-3xl font-black text-gray-950">
                          {reviewCount}
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-600">
                          {t("businessProfile.customerReviews")}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-green-50 p-5">
                        <p className="text-sm font-black text-green-700">
                          {t("businessProfile.activeOffers")}
                        </p>
                        <p className="mt-2 text-3xl font-black">
                          {offers.length}
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-600">
                          {t("businessProfile.activeOffersHint")}
                        </p>
                      </div>
                    </div>

                    {isVerified && (
                      <div className="mt-6 rounded-3xl border border-green-100 bg-green-50 p-5">
                        <p className="font-black text-green-800">
                          {t("businessProfile.trustTitle")}
                        </p>
                        <p className="mt-2 font-semibold leading-7 text-green-900">
                          {t("businessProfile.trustMessage")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                <h2 className="text-2xl font-black">
                  {t("businessProfile.activeOffers")}
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {offers.length === 0 && (
                    <div className="rounded-3xl bg-[#F7F6EF] p-6">
                      <p className="text-lg font-black text-gray-950">
                        {t("businessProfile.noActiveOffers")}
                      </p>
                      <p className="mt-2 font-semibold leading-7 text-gray-600">
                        {t("businessProfile.noActiveOffersHint")}
                      </p>
                    </div>
                  )}

                  {offers.map((offer) => (
                    <Link
                      key={offer.id}
                      href={`/offers/${offer.id}`}
                      className="overflow-hidden rounded-3xl bg-[#F7F6EF] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative h-48 bg-green-100">
                        <OfferImage
                          src={offer.image_url}
                          alt={offer.title}
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-black text-green-700 shadow-sm">
                          {normalizeOfferCategory(offer.category)}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="text-xl font-black">{offer.title}</h3>
                        <p className="mt-2 font-semibold text-gray-600">
                          {formatPickupWindow(offer, language)}
                        </p>
                        <p className="mt-2 text-sm font-bold text-gray-500">
                          {t("common.quantity")}: {offer.quantity}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="text-2xl font-black text-green-700">
                            {formatMoney(offer.price)}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-green-700">
                            {isOfferReservable(offer)
                              ? t("common.available")
                              : t("common.unavailable")}
                          </span>
                        </div>
                        <p className="mt-4 inline-flex min-h-10 items-center rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white">
                          {t("common.viewDetails")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                <h2 className="text-2xl font-black">
                  {t("businessProfile.customerReviews")}
                </h2>

                <div className="mt-5 grid gap-4">
                  {reviews.length === 0 && (
                    <div className="rounded-3xl bg-[#F7F6EF] p-6">
                      <p className="text-lg font-black text-gray-950">
                        {t("common.noReviews")}
                      </p>
                      <p className="mt-2 font-semibold leading-7 text-gray-600">
                        {t("businessProfile.noReviewsHint")}
                      </p>
                    </div>
                  )}

                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-3xl bg-[#F7F6EF] p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-black text-yellow-700">
                          {review.rating} ⭐
                        </p>
                        {formatReviewDate(review.created_at, language) && (
                          <p className="text-sm font-bold text-gray-500">
                            {formatReviewDate(review.created_at, language)}
                          </p>
                        )}
                      </div>
                      <p className="mt-2 font-semibold text-gray-700">
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
