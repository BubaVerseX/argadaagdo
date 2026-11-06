"use client";

import { WaveEdge } from "@/components/design/Decor";
import { ReviewReportControl, useReviewReporterId } from "@/components/reviews/ReviewReportControl";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
} from "@/components/icons";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { createMapsSearchUrl } from "@/lib/maps";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  getCachedOffer,
  prefetchOfferDetail,
  sweepExpiredOffersOnce,
  type NativeOffer as NativeOfferType,
  type NativeOfferDetail,
} from "@/lib/nativeData";
import {
  getGreenBagLabel,
  getOfferCategoryTone,
} from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupTimeRange,
  formatReviewDate,
  getDiscountPercent,
  getOfferDateLabel,
  getOriginalPrice,
  isOfferReservable,
} from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import Link from "./AppLink";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-[22px] bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon
          className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
          strokeWidth={2}
        />
      </summary>
      <div className="px-4 pb-4 text-[15px] leading-relaxed text-body">
        {children}
      </div>
    </details>
  );
}

export default function NativeOffer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language, t } = useLanguage();
  const offerId = Number(params.id);
  const reporterId = useReviewReporterId();

  const [detail, setDetail] = useState<NativeOfferDetail | null>(null);
  const [cachedOffer] = useState<NativeOfferType | null>(() =>
    getCachedOffer(offerId)
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const favoriteInFlight = useRef(false);
  const [notice, setNotice] = useState<{
    tone: "error" | "warning";
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    sweepExpiredOffersOnce();
    void prefetchOfferDetail(offerId).then((result) => {
      if (active) setDetail(result);
    });

    // Favorite state is per user and reads from the stored session only.
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("offer_id", offerId)
        .maybeSingle();
      if (active) setIsFavorite(Boolean(data));
    });

    return () => {
      active = false;
    };
  }, [offerId]);

  const offer = detail?.offer ?? cachedOffer;
  const reviews = detail?.reviews ?? [];
  const rating = detail?.rating ?? null;
  const notFound = detail !== null && !detail.offer;

  async function toggleFavorite() {
    if (favoriteInFlight.current || !offer) return;
    favoriteInFlight.current = true;
    setNotice(null);

    try {
      const authResult = await getConfirmedUser();

      if (authResult.status === "signed_out") {
        router.push(`/login?redirect=${encodeURIComponent(`/offers/${offer.id}`)}`);
        return;
      }

      if (authResult.status === "unverified") {
        setNotice({ tone: "warning", text: VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE });
        return;
      }

      const profile = await getProfileById(authResult.user.id, 3);

      if (profile?.role !== "customer") {
        setNotice({
          tone: "warning",
          text: "Favorites are available for customer accounts.",
        });
        return;
      }

      setFavoriteBusy(true);

      if (isFavorite) {
        setIsFavorite(false);
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", authResult.user.id)
          .eq("offer_id", offer.id);

        if (error) {
          setIsFavorite(true);
          setNotice({
            tone: "error",
            text: "Favorite could not be removed. Please try again.",
          });
        }
        return;
      }

      setIsFavorite(true);
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: authResult.user.id, offer_id: offer.id });

      if (error && error.code !== "23505") {
        setIsFavorite(false);
        setNotice({
          tone: "error",
          text: "Favorite could not be saved. Please try again.",
        });
      }
    } finally {
      setFavoriteBusy(false);
      favoriteInFlight.current = false;
    }
  }

  const backButton = (
    <Link
      href="/"
      aria-label={t("native.back")}
      className="absolute left-4 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-cream"
    >
      <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
    </Link>
  );

  if (notFound && !cachedOffer) {
    return (
      <main className="native-main relative px-4 pt-20">
        {backButton}
        <div className="rounded-[28px] bg-well p-8 text-center">
          <p className="font-serif text-xl font-bold">{t("offerDetail.notFound")}</p>
          <Link href="/" className="premium-button mt-5 w-full rounded-2xl px-6 font-bold">
            {t("native.orders.emptyAction")}
          </Link>
        </div>
      </main>
    );
  }

  if (!offer) {
    return (
      <main className="native-main" aria-busy="true">
        <div className="native-skeleton h-[22rem]" />
        <div className="grid gap-3 px-4 pt-5">
          <div className="native-skeleton h-8 w-3/4 rounded-xl" />
          <div className="native-skeleton h-5 w-1/2 rounded-xl" />
          <div className="native-skeleton mt-2 h-24 rounded-[22px]" />
        </div>
        <div className="native-fixed-bottom fixed inset-x-3 z-40 h-[4.75rem] rounded-3xl bg-brand-forest" />
      </main>
    );
  }

  const reservable = isOfferReservable(offer);
  const discount = getDiscountPercent(offer);
  const oldPrice = getOriginalPrice(offer);
  const mapsUrl = createMapsSearchUrl(
    offer.businesses?.address,
    offer.businesses?.name
  );

  return (
    <main className="native-main relative">
      <div className={getOfferCategoryTone(offer.category)}>
        {/* Calm: the beige ground shows through; the photo tile carries the
            category colour (softened in app/native.css). */}
        <section className="relative overflow-hidden px-4 pb-1 pt-3 text-cream">

          {backButton}
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            disabled={favoriteBusy}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite ? t("offers.removeFavorite") : t("offers.addFavorite")
            }
            className="absolute right-4 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-cream disabled:opacity-60"
          >
            <HeartIcon className="h-5 w-5" strokeWidth={2} filled={isFavorite} />
          </button>

          <div className="relative mx-auto mt-14 h-60 w-full max-w-md">
            <div className="photo-hero relative isolate h-full w-full overflow-hidden">
              <OfferImage
                src={offer.image_url}
                alt={offer.title}
                sizes="(max-width: 500px) 94vw, 480px"
                priority
              />
            </div>
            {discount !== null && (
              <div className="discount-sticker absolute -bottom-3 right-3 h-[4.625rem] w-[4.625rem] border-4 border-brand-ground text-[1.0625rem]">
                −{discount}%
              </div>
            )}
          </div>
        </section>
        <WaveEdge fill="var(--cat)" />
      </div>

      <section className="px-4 pt-1">
        <p className="text-xs font-bold text-body">
          {getGreenBagLabel(offer, language)}
        </p>
        <h1 className="mt-1 font-serif text-xl font-bold leading-[1.3]">
          {offer.businesses?.name || t("common.business")}
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[22px] bg-card p-4">
            <p className="text-[13px] text-body">{t("common.price")}</p>
            <p className="mt-0.5 text-[1.625rem] font-bold leading-tight">
              {formatMoney(offer.price)}
            </p>
            {oldPrice !== null && (
              <p className="text-[13px] text-body line-through">
                {formatMoney(oldPrice)}
              </p>
            )}
          </div>
          <div className="rounded-[22px] bg-card p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-body">
              <ClockIcon className="h-3.5 w-3.5" strokeWidth={2} />
              {t("native.offer.pickup")}
            </p>
            <p className="mt-0.5 text-[1.0625rem] font-bold leading-snug">
              {formatPickupTimeRange(offer, language)}
            </p>
            <p className="text-[13px] text-body">
              {getOfferDateLabel(offer, language)}
            </p>
          </div>
        </div>

        {offer.businesses?.address && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="native-press mt-2.5 flex min-h-14 items-center gap-3 rounded-[22px] bg-card px-4 font-medium"
          >
            <MapPinIcon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate">
              {offer.businesses.address}
            </span>
          </a>
        )}

        {notice && (
          <div className="mt-3">
            <Notice tone={notice.tone}>
              {translateUserMessage(notice.text, language)}
            </Notice>
          </div>
        )}

        <div className="mt-2.5 grid gap-2.5">
          <Section title={t("native.offer.details")}>
            <p className="font-bold text-cream">{offer.title}</p>
            {offer.description && <p className="mt-1">{offer.description}</p>}
            <p className="mt-3 font-bold text-cream">{t("offerDetail.allergens")}</p>
            <p className="mt-1">{offer.allergens || t("offerDetail.allergensAsk")}</p>
            <p className="mt-3">{t("native.offer.contents")}</p>
          </Section>

          <Section
            title={
              rating && rating.rating_count > 0
                ? `${t("native.offer.reviews")} · ★ ${Number(
                    rating.average_rating
                  ).toFixed(1)} (${rating.rating_count})`
                : t("native.offer.reviews")
            }
          >
            {reviews.length === 0 && <p>{t("common.noReviews")}</p>}
            <div className="grid gap-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-well p-3.5">
                  <p className="flex justify-between gap-3 font-bold text-cream">
                    <span>★ {review.rating}</span>
                    <span className="text-[13px] font-normal text-body">
                      {formatReviewDate(review.created_at, language)}
                    </span>
                  </p>
                  <p className="mt-1">
                    {review.review?.trim() || t("common.noWrittenReview")}
                  </p>
                  <ReviewReportControl reviewId={review.id} reporterId={reporterId} />
                </div>
              ))}
            </div>
          </Section>

          <div className="grid grid-cols-3 gap-2.5">
            <Link
              href={`/businesses/${offer.business_id}`}
              className="native-press flex min-h-14 items-center justify-center rounded-[18px] bg-card px-2 text-center text-[13px] font-bold"
            >
              {t("native.offer.business")}
            </Link>
            <Link
              href="/faq"
              className="native-press flex min-h-14 items-center justify-center rounded-[18px] bg-card px-2 text-center text-[13px] font-bold"
            >
              {t("nav.faq")}
            </Link>
            <Link
              href="/support"
              className="native-press flex min-h-14 items-center justify-center rounded-[18px] bg-card px-2 text-center text-[13px] font-bold"
            >
              {t("native.offer.help")}
            </Link>
          </div>
        </div>
      </section>

      <div className="theme-forest native-fixed-bottom fixed inset-x-3 z-40 flex items-center gap-3.5 rounded-3xl bg-brand-forest py-3 pl-[18px] pr-3">
        <p className="whitespace-nowrap text-[1.375rem] font-bold text-brand-ground">
          {formatMoney(offer.price)}
        </p>
        {reservable ? (
          <Link
            href={`/checkout/${offer.id}`}
            className="native-press flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl bg-brand-mint text-base font-bold text-brand-forest"
          >
            {t("native.offer.reserve")}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl bg-brand-forest-2 text-base font-bold text-brand-ground"
          >
            {t("common.unavailable")}
          </button>
        )}
      </div>
    </main>
  );
}
