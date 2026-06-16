"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import {
  formatPickupWindow,
  getRatingLabel,
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

type OfferDetail = Offer & {
  businesses?: Business | null;
};

export default function OfferDetailPage() {
  const params = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [reviews, setReviews] = useState<PublicBusinessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const notFoundMessage = t("offerDetail.notFound");

  useEffect(() => {
    let active = true;

    async function loadOffer() {
      const offerId = Number(params.id);

      if (!Number.isFinite(offerId)) {
        setMessage(notFoundMessage);
        setLoading(false);
        return;
      }

      await processExpiredMarketplace();

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

  const rating = offer ? ratingSummaries[offer.business_id] : undefined;
  const mapsUrl = offer
    ? createMapsSearchUrl(offer.businesses?.address, offer.businesses?.name)
    : "";
  const reservable = offer ? isOfferReservable(offer) : false;

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/offers"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 font-black text-green-800 shadow-sm"
          >
            ← {t("offerDetail.back")}
          </Link>

          {loading && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
              <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
            </div>
          )}

          {!loading && message && (
            <div className="mt-6">
              <Notice tone="error">{message}</Notice>
            </div>
          )}

          {!loading && offer && (
            <>
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                  <div className="relative h-72 bg-green-100 sm:h-96">
                    <OfferImage
                      src={offer.image_url}
                      alt={offer.title}
                      sizes="(max-width: 1024px) 100vw, 55vw"
                    />
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                  <p className="text-xs font-black uppercase tracking-widest text-green-700">
                    {t("offerDetail.title")}
                  </p>

                  <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                    {offer.title}
                  </h1>

                  <p className="mt-3 text-lg font-bold text-gray-800">
                    {offer.businesses?.name || t("common.business")}
                  </p>

                  <p className="mt-2 font-black text-yellow-700">
                    ⭐ {getRatingLabel(rating, language)}
                  </p>

                  <div className="mt-5 grid gap-3 rounded-3xl bg-[#F7F6EF] p-4 font-semibold text-gray-700">
                    <p>
                      {t("common.pickup")}: {formatPickupWindow(offer, language)}
                    </p>
                    <p>
                      {t("common.quantity")}: {offer.quantity}
                    </p>
                    <p className="text-3xl font-black text-green-700">
                      ₾{offer.price}
                      {offer.old_price && (
                        <span className="ml-3 text-base text-gray-400 line-through">
                          ₾{offer.old_price}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {reservable ? (
                      <Link
                        href={`/checkout/${offer.id}`}
                        className="min-h-12 rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800"
                      >
                        {t("common.continueCheckout")}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="min-h-12 rounded-full bg-gray-300 px-6 py-3 font-black text-gray-600"
                      >
                        {t("common.unavailable")}
                      </button>
                    )}

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-12 rounded-full bg-green-50 px-6 py-3 text-center font-black text-green-800 transition hover:bg-green-100"
                    >
                      {t("common.openMap")}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                  <h2 className="text-2xl font-black">
                    {t("offerDetail.about")}
                  </h2>
                  <p className="mt-3 font-semibold leading-7 text-gray-700">
                    {offer.description ||
                      "A surprise rescue box prepared by the business from available food."}
                  </p>

                  <h3 className="mt-6 text-xl font-black">
                    {t("offerDetail.allergens")}
                  </h3>
                  <p className="mt-2 font-semibold text-gray-700">
                    {offer.allergens || "Ask the business during pickup."}
                  </p>
                </div>

                <div className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                  <h2 className="text-2xl font-black">
                    {t("offerDetail.businessProfile")}
                  </h2>
                  <p className="mt-3 font-bold text-gray-800">
                    {offer.businesses?.business_type || t("common.food")}
                  </p>
                  <p className="mt-2 font-semibold text-gray-600">
                    {offer.businesses?.address || t("common.addressUnavailable")}
                  </p>
                  <Link
                    href={`/businesses/${offer.business_id}`}
                    className="mt-5 inline-flex min-h-11 rounded-full bg-green-700 px-5 py-2.5 font-black text-white"
                  >
                    {t("businessProfile.title")}
                  </Link>
                </div>
              </div>

              <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                <h2 className="text-2xl font-black">
                  {t("offerDetail.reviewsTitle")}
                </h2>

                <div className="mt-5 grid gap-4">
                  {reviews.length === 0 && (
                    <p className="font-semibold text-gray-600">
                      {t("common.noReviews")}
                    </p>
                  )}

                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl bg-[#F7F6EF] p-4">
                      <p className="font-black text-yellow-700">
                        {review.rating} ⭐
                      </p>
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
