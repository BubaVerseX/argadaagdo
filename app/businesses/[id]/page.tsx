"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { WebBagCard } from "@/components/WebBagCard";
import {
  ChevronDownIcon,
  ClockIcon,
  LeafIcon,
  MapPinIcon,
  StarIcon,
} from "@/components/icons";
import {
  ReviewReportControl,
  useReviewReporterId,
} from "@/components/reviews/ReviewReportControl";
import { formatBusinessType } from "@/lib/businessTypes";
import { getWeekdayLabel, ISO_WEEKDAYS } from "@/lib/greenBag";
import { createMapsSearchUrl } from "@/lib/maps";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  formatReviewDate,
  getRatingLabel,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import {
  loadBusinessRatingSummaries,
  loadPublicBusinessReviews,
} from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, PublicBusinessReview } from "@/lib/types";
import type { OpeningHours } from "@/types/business";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// The business's public page (owner decision 6): cover, logo, name, category,
// rating, address, opening hours, description, today's boxes and reviews.
// The same page on the website and in the app (the app swaps the header for
// its one back button). No phone number: it stays private.

const PUBLIC_COLUMNS =
  "id, name, business_type, address, approved, created_at, latitude, longitude, sales_paused_on, description, logo_url, cover_url, opening_hours";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

/** ISO weekday (1 = Monday) in Tbilisi. */
function tbilisiWeekday() {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Tbilisi" }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day) + 1;
}

function hoursLine(hours: OpeningHours, day: number, L: (ka: string, en: string) => string) {
  const value = hours[String(day) as keyof OpeningHours];
  if (value === undefined) return null;
  if (value === null) return L("დაკეტილია", "Closed");
  return `${value.open}–${value.close}`;
}

export default function BusinessProfilePage() {
  const params = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [rating, setRating] = useState<RatingSummary | undefined>();
  const [reviews, setReviews] = useState<PublicBusinessReview[]>([]);
  const reviewReporterId = useReviewReporterId();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [today, setToday] = useState(0);

  useEffect(() => {
    let active = true;
    const businessId = Number(params.id);

    async function load() {
      setToday(tbilisiWeekday());
      if (!Number.isFinite(businessId)) {
        setMissing(true);
        setLoading(false);
        return;
      }

      // Tidies expired offers in the background; the reads below do not wait.
      void processExpiredMarketplace();

      const [businessResult, offerResult, summaries, businessReviews] = await Promise.all([
        supabase.from("businesses").select(PUBLIC_COLUMNS).eq("id", businessId).maybeSingle(),
        supabase
          .from("offers")
          .select("*, businesses(name, address, business_type)")
          .eq("business_id", businessId)
          .eq("active", true)
          .eq("status", "active")
          .gt("quantity", 0)
          .order("pickup_date", { ascending: true })
          .order("pickup_start", { ascending: true }),
        loadBusinessRatingSummaries(),
        loadPublicBusinessReviews(businessId),
      ]);

      if (!active) return;

      if (businessResult.error || !businessResult.data) {
        setMissing(true);
        setLoading(false);
        return;
      }

      setBusiness(businessResult.data as unknown as Business);
      setOffers((offerResult.data || []) as Offer[]);
      setRating(summaries[businessId]);
      setReviews(businessReviews);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  const hours = (business?.opening_hours || {}) as OpeningHours;
  const hasHours = Object.keys(hours).length > 0;
  const todayLine = today ? hoursLine(hours, today, L) : null;
  const ratingText = rating && rating.rating_count > 0 ? getRatingLabel(rating, language) : null;

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 pb-10 pt-4 sm:px-6 md:pt-8">
        <div className="mx-auto max-w-3xl">
          {loading && (
            <div aria-busy="true" className="grid gap-3">
              <div className="aspect-[16/7] w-full animate-pulse rounded-[28px] bg-well" />
              <div className="h-8 w-2/3 animate-pulse rounded-xl bg-well" />
              <div className="h-24 w-full animate-pulse rounded-3xl bg-well" />
            </div>
          )}

          {!loading && (missing || !business) && (
            <div className="ui-card rounded-3xl p-6 text-center">
              <p className="font-semibold text-cream">{t("businessProfile.notFound")}</p>
              <Link href="/" className="premium-button mt-4 inline-flex min-h-11 items-center px-6 py-2.5">
                {L("ლანჩ ბოქსების ნახვა", "See Lunch Boxes")}
              </Link>
            </div>
          )}

          {!loading && business && (
            <>
              {/* Cover + logo */}
              <div className="relative">
                <div className="aspect-[16/7] w-full overflow-hidden rounded-[28px] bg-well">
                  {business.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="hero-surface flex h-full w-full items-center justify-center">
                      <LeafIcon className="h-12 w-12 text-mint opacity-60" strokeWidth={1.4} />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-9 left-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--page,#fbf7ee)] bg-card text-xl font-semibold text-cream shadow-[var(--shadow-card)]">
                  {business.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(business.name)
                  )}
                </div>
              </div>

              {/* Name, category, rating */}
              <div className="mt-11 px-1">
                <h1 className="break-words text-2xl font-semibold leading-tight text-cream sm:text-3xl">
                  {business.name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-body">
                  {business.business_type && <span>{formatBusinessType(business.business_type, language)}</span>}
                  {ratingText && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-cream">
                        <StarIcon className="h-4 w-4 text-mint" strokeWidth={1.8} filled />
                        {ratingText}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Address + hours */}
              <div className="ui-card mt-4 grid gap-1 rounded-3xl p-2">
                {business.address && (
                  <a
                    href={createMapsSearchUrl(business.address, business.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm text-cream"
                  >
                    <MapPinIcon className="h-5 w-5 shrink-0 text-mint" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">{business.address}</span>
                    <span className="shrink-0 text-xs font-semibold text-mint">{L("რუკა", "Map")}</span>
                  </a>
                )}
                {hasHours && (
                  <details className="group rounded-2xl">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 text-sm text-cream [&::-webkit-details-marker]:hidden">
                      <ClockIcon className="h-5 w-5 shrink-0 text-mint" strokeWidth={1.8} />
                      <span className="min-w-0 flex-1">
                        {L("დღეს", "Today")}: {todayLine ?? L("არ არის მითითებული", "not set")}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 shrink-0 text-body transition group-open:rotate-180" strokeWidth={2} />
                    </summary>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 px-11 pb-3 text-sm">
                      {ISO_WEEKDAYS.map((day) => (
                        <div key={day} className="contents">
                          <dt className={day === today ? "font-semibold text-cream" : "text-body"}>
                            {getWeekdayLabel(day, language)}
                          </dt>
                          <dd className={day === today ? "font-semibold text-cream" : "text-body"}>
                            {hoursLine(hours, day, L) ?? "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </div>

              {business.description && (
                <p className="mt-4 whitespace-pre-line px-1 text-[15px] leading-7 text-body">
                  {business.description}
                </p>
              )}

              {/* Boxes */}
              <h2 className="mt-7 px-1 text-lg font-semibold text-cream">{L("ლანჩ ბოქსები", "Lunch Boxes")}</h2>
              {offers.length === 0 ? (
                <p className="mt-2 rounded-3xl bg-well px-4 py-5 text-center text-sm text-body">
                  {L(
                    "ახლა ბოქსები არ არის. შეინახე ადგილი რჩეულებში და ახალს არ გამოტოვებ.",
                    "No boxes right now. Save this place to your favourites so you don't miss the next one."
                  )}
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {offers.map((offer, index) => (
                    <WebBagCard
                      key={offer.id}
                      offer={offer}
                      language={language}
                      actionLabel={t("native.offer.reserve")}
                      priority={index === 0}
                    />
                  ))}
                </div>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <>
                  <h2 className="mt-7 px-1 text-lg font-semibold text-cream">{L("შეფასებები", "Reviews")}</h2>
                  <div className="mt-3 grid gap-2">
                    {reviews.slice(0, 10).map((review) => (
                      <div key={review.id} className="rounded-3xl bg-well p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-1.5 font-semibold text-cream">
                            <StarIcon className="h-4 w-4 text-mint" strokeWidth={1.8} filled />
                            {review.rating}/5
                          </p>
                          <p className="text-sm text-body">{formatReviewDate(review.created_at, language)}</p>
                        </div>
                        {review.review?.trim() && <p className="mt-2 text-body">{review.review.trim()}</p>}
                        <ReviewReportControl reviewId={review.id} reporterId={reviewReporterId} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
