"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { FAQAccordion } from "@/components/help/FAQAccordion";
import { HelpCard } from "@/components/help/HelpCard";
import { SupportLink } from "@/components/help/SupportLink";
import { TrustBadge } from "@/components/help/TrustBadge";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import { normalizeOfferCategory } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupWindow,
  formatPickupTimeRange,
  formatReviewDate,
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
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OfferDetail = Offer & {
  businesses?: Business | null;
};

function isApprovedBusiness(value: boolean | string | null | undefined) {
  return value === true || String(value) === "true";
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getUrgencyMessage(quantity: number, language: string) {
  if (quantity === 1) {
    return language === "ka" ? "ბოლო ყუთი ხელმისაწვდომია" : "Last one available";
  }

  if (quantity > 1 && quantity <= 5) {
    return language === "ka" ? `მხოლოდ ${quantity} დარჩა` : `Only ${quantity} left`;
  }

  return "";
}

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
  const offerCategory = offer ? normalizeOfferCategory(offer.category) : "";
  const mapsUrl = offer
    ? createMapsSearchUrl(offer.businesses?.address, offer.businesses?.name)
    : "";
  const reservable = offer ? isOfferReservable(offer) : false;
  const currentPrice = offer ? toNumber(offer.price) : 0;
  const originalPrice = offer ? toNumber(offer.old_price) : 0;
  const savingsAmount =
    originalPrice > currentPrice ? originalPrice - currentPrice : 0;
  const quantity = Number(offer?.quantity || 0);
  const urgencyMessage =
    offer && reservable ? getUrgencyMessage(quantity, language) : "";
  const reviewCount = rating?.rating_count || reviews.length;
  const averageRating =
    rating && rating.rating_count > 0 ? rating.average_rating.toFixed(1) : null;
  const verifiedBusiness = isApprovedBusiness(offer?.businesses?.approved);
  const businessName = offer?.businesses?.name || t("common.business");
  const trustItems = [
    t("home.trustVerifiedBusinesses"),
    t("home.trustPickupCodeVerification"),
    t("home.trustCustomerRatings"),
  ];
  const confidenceQuestions = offer
    ? [
        {
          question:
            language === "ka" ? "ვინ ამზადებს ამ ყუთს?" : "Who prepares this bag?",
          answer:
            language === "ka"
              ? `${businessName} ამზადებს ამ სიურპრიზის ყუთს. ბიზნესის პროფილში შეგიძლია ნახო მისამართი, შეფასებები და აქტიური შეთავაზებები.`
              : `${businessName} prepares this surprise bag. You can review the business profile, address, ratings and active offers before reserving.`,
        },
        {
          question:
            language === "ka" ? "რამდენად ახალია საკვები?" : "How fresh is the food?",
          answer:
            language === "ka"
              ? "სიურპრიზის ყუთები მზადდება იმავე დღის კარგი დარჩენილი საკვებიდან. წაიღე მითითებულ ფანჯარაში, რომ საკვები საუკეთესო მდგომარეობაში მიიღო."
              : "Surprise bags are prepared from good surplus food for the listed pickup day. Collect during the pickup window so the food is still at its best.",
        },
        {
          question:
            language === "ka" ? "როგორ მუშაობს წაღება?" : "How does pickup work?",
          answer:
            language === "ka"
              ? "დადასტურების შემდეგ შეკვეთა გამოჩნდება Orders გვერდზე. ბიზნესში მისვლისას აჩვენე წაღების კოდი და თანამშრომელი კოდს გადაამოწმებს."
              : "After confirmation, your order appears in Orders. Visit the business during the pickup window and show your pickup code for verification.",
        },
        {
          question: language === "ka" ? "როდის ვიხდი?" : "When do I pay?",
          answer:
            language === "ka"
              ? "Checkout-ზე გადახდა Bank of Georgia-ს მეშვეობით სრულდება. ჯავშანი დადასტურდება მხოლოდ წარმატებული გადახდის შემდეგ."
              : "Payment is completed through Bank of Georgia checkout. Your reservation is confirmed only after payment succeeds.",
        },
        {
          question:
            language === "ka"
              ? "რა მოხდება, თუ ვერ წავიღებ?"
              : "What happens if I cannot collect?",
          answer:
            language === "ka"
              ? "თუ გეგმები შეიცვალა, გაუქმება შეგიძლია წაღებამდე 2 საათით ადრე. თუ წაღების ფანჯარაში არ მიხვალ, შეკვეთა შეიძლება missed pickup-ად ჩაითვალოს."
              : "If plans change, cancel up to 2 hours before pickup. If you miss the pickup window, the order may be marked as a missed pickup.",
        },
      ]
    : [];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/offers"
            className="premium-button-secondary px-5 py-2.5"
          >
            ← {t("offerDetail.back")}
          </Link>

          {loading && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="h-80 animate-pulse rounded-[1.75rem] bg-white" />
              <div className="h-80 animate-pulse rounded-[1.75rem] bg-white" />
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
                <div className="premium-card overflow-hidden rounded-[1.75rem]">
                  <div className="relative h-72 bg-[#ece7da] sm:h-96">
                    <OfferImage
                      src={offer.image_url}
                      alt={offer.title}
                      sizes="(max-width: 1024px) 100vw, 55vw"
                    />
                  </div>
                </div>

                <div className="premium-card rounded-[1.75rem] p-5 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c]">
                      {t("offerDetail.title")}
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-[#5c7a5c]">
                      {offerCategory}
                    </span>
                    {verifiedBusiness && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-[#5c7a5c]">
                        {t("businessProfile.verified")}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                    {offer.title}
                  </h1>

                  <Link
                    href={`/businesses/${offer.business_id}`}
                    className="mt-3 inline-flex font-bold text-[#1a1815] transition hover:text-[#5c7a5c]"
                  >
                    {offer.businesses?.name || t("common.business")}
                  </Link>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                      <p className="text-sm font-black text-[#6b6558]">
                        {t("common.price")}
                      </p>
                      <p className="mt-2 text-4xl font-black text-[#5c7a5c]">
                        {formatMoney(offer.price)}
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#6b6558]">
                        {t("checkout.regularPrice")}:{" "}
                        {originalPrice > 0 ? (
                          <span className="line-through">
                            {formatMoney(offer.old_price)}
                          </span>
                        ) : (
                          t("offerDetail.notListed")
                        )}
                      </p>
                      <p className="mt-1 text-sm font-black text-[#5c7a5c]">
                        {t("offerDetail.savings")}:{" "}
                        {savingsAmount > 0
                          ? formatMoney(savingsAmount)
                          : t("offerDetail.noSavingsListed")}
                      </p>
                    </div>

                    <div className="premium-muted-card rounded-3xl p-5">
                      <p className="text-sm font-black text-[#6b6558]">
                        {t("offerDetail.pickupDate")}
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#1a1815]">
                        {getOfferDateLabel(offer, language)}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#6b6558]">
                        {formatPickupTimeRange(offer, language)}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                      <p className="text-sm font-black text-[#6b6558]">
                        {t("offerDetail.reviewSummary")}
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#1a1815]">
                        {averageRating ? `${averageRating}/5` : t("common.noReviews")}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#6b6558]">
                        {reviewCount > 0
                          ? `${reviewCount} ${t("common.reviews")}`
                          : t("common.noReviews")}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                      <p className="text-sm font-black text-[#6b6558]">
                        {t("common.quantity")}
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#5c7a5c]">
                        {offer.quantity}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#6b6558]">
                        {t("offers.boxesLeft")}
                      </p>
                    </div>
                  </div>

                  {urgencyMessage && (
                    <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                      <p className="font-black text-[#1a1815]">
                        {urgencyMessage}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#6b6558]">
                        {t("offerDetail.urgencyHint")}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                    <p className="font-black text-[#1a1815]">
                      {t("offerDetail.afterReservationTitle")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        t("offerDetail.pickupCode"),
                        t("offerDetail.pickupVisit"),
                        t("offerDetail.ratingReminderTitle"),
                      ].map((step) => (
                        <p
                          key={step}
                          className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#1a1815]"
                        >
                          {step}
                        </p>
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-[#6b6558]">
                      {t("offerDetail.cancellationReminderText")}
                    </p>
                  </div>

                  <div className="mt-4 rounded-3xl border border-black/[0.06] bg-white p-4">
                    <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
                      {t("home.trustBadge")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {trustItems.map((item) => (
                        <TrustBadge
                          key={item}
                          label={item}
                        />
                      ))}
                    </div>
                    <div className="mt-4">
                      <SupportLink label="Need help before reserving?" />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {reservable ? (
                      <Link
                        href={`/checkout/${offer.id}`}
                        className="premium-button px-6 py-3"
                      >
                        {t("common.continueCheckout")}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="premium-button px-6 py-3"
                      >
                        {t("common.unavailable")}
                      </button>
                    )}

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="premium-button-secondary px-6 py-3"
                    >
                      {t("common.openMap")}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <div className="grid gap-6">
                  <div className="premium-card rounded-[1.75rem] p-5 sm:p-8">
                    <h2 className="text-2xl font-black">
                      {t("offerDetail.about")}
                    </h2>
                    <p className="mt-3 font-semibold leading-7 text-[#6b6558]">
                      {offer.description ||
                        "A surprise rescue box prepared by the business from available food."}
                    </p>

                    <h3 className="mt-6 text-xl font-black">
                      {t("offerDetail.allergens")}
                    </h3>
                    <p className="mt-2 font-semibold text-[#6b6558]">
                      {offer.allergens || t("offerDetail.allergensAsk")}
                    </p>
                  </div>

                  <HelpCard
                    title={
                      language === "ka"
                        ? "რა არის სიურპრიზის ყუთი?"
                        : "What is a surprise bag?"
                    }
                    text={
                      language === "ka"
                        ? "ეს არის ფასდაკლებული საკვების ყუთი, რომელიც ბიზნესმა კარგი დარჩენილი საკვებიდან მოამზადა. ზუსტი შემადგენლობა შეიძლება იცვლებოდეს."
                        : "It is a discounted food bag prepared from good surplus food. The exact contents can vary, but the price, business and pickup window are clear before you reserve."
                    }
                    icon="A"
                  />

                  <div className="premium-card rounded-[1.75rem] p-5 sm:p-8">
                    <h2 className="text-2xl font-black">
                      {language === "ka"
                        ? "კითხვები დაჯავშნამდე"
                        : "Questions before you reserve"}
                    </h2>
                    <p className="mt-3 font-semibold leading-7 text-[#6b6558]">
                      {language === "ka"
                        ? "მოკლე პასუხები ყველაზე მნიშვნელოვან საკითხებზე."
                        : "Short answers to the most important customer questions."}
                    </p>
                    <div className="mt-5">
                      <FAQAccordion items={confidenceQuestions} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="rounded-[1.75rem] bg-white p-5 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-black">
                      {t("offerDetail.pickupInfoTitle")}
                    </h2>
                    <div className="mt-5 grid gap-3">
                      <div className="premium-muted-card rounded-3xl p-4">
                        <p className="font-black text-[#1a1815]">
                          {t("offerDetail.pickupVisit")}
                        </p>
                        <p className="mt-1 font-semibold text-[#6b6558]">
                          {formatPickupWindow(offer, language)}
                        </p>
                      </div>
                      <div className="premium-muted-card rounded-3xl p-4">
                        <p className="font-black text-[#1a1815]">
                          {t("offerDetail.pickupCode")}
                        </p>
                        <p className="mt-1 font-semibold text-[#6b6558]">
                          {t("offerDetail.pickupCodeHint")}
                        </p>
                      </div>
                      <div className="premium-muted-card rounded-3xl p-4">
                        <p className="font-black text-[#1a1815]">
                          {t("offerDetail.pickupCollect")}
                        </p>
                        <p className="mt-1 font-semibold text-[#6b6558]">
                          {t("offerDetail.pickupCollectHint")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card rounded-[1.75rem] p-5 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black">
                        {t("offerDetail.businessProfile")}
                      </h2>
                      {verifiedBusiness && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-[#1a1815]">
                          {t("businessProfile.verified")}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-bold text-[#1a1815]">
                      {offer.businesses?.business_type || t("common.food")}
                    </p>
                    <p className="mt-2 font-semibold text-[#6b6558]">
                      {offer.businesses?.address ||
                        t("common.addressUnavailable")}
                    </p>
                    {verifiedBusiness && (
                      <p className="mt-4 rounded-3xl bg-white p-4 font-semibold leading-7 text-[#6b6558]">
                        {t("businessProfile.trustMessage")}
                      </p>
                    )}
                    <Link
                      href={`/businesses/${offer.business_id}`}
                      className="premium-button mt-5 px-5 py-2.5"
                    >
                      {t("businessProfile.title")}
                    </Link>
                  </div>
                </div>
              </div>

              <div className="premium-card mt-6 rounded-[1.75rem] p-5 sm:p-8">
                <h2 className="text-2xl font-black">
                  {t("offerDetail.reviewsTitle")}
                </h2>

                <div className="mt-5 grid gap-4">
                  {reviews.length === 0 && (
                    <div className="rounded-3xl bg-white p-6">
                      <p className="text-lg font-black text-[#1a1815]">
                        {t("common.noReviews")}
                      </p>
                      <p className="mt-2 font-semibold leading-7 text-[#6b6558]">
                        {t("offerDetail.noReviewsHint")}
                      </p>
                    </div>
                  )}

                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-3xl bg-white p-5">
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
