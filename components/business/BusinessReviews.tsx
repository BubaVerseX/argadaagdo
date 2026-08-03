import { CheckIcon, StarIcon } from "@/components/icons";
import type { Language, TranslationKey } from "@/lib/i18n";
import { formatDisplayDateTime } from "@/lib/offerLifecycle";
import type { Rating } from "@/lib/types";

type BusinessReviewsProps = {
  t: (key: TranslationKey) => string;
  language: Language;
  reviews: Rating[];
  businessNameById: Record<number, string>;
};

export function BusinessReviews({
  t,
  language,
  reviews,
  businessNameById,
}: BusinessReviewsProps) {
  return (
    <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
        Customer Feedback
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {t("businessDashboard.businessReviews")}
      </h2>

      <p className="mt-2 flex items-center gap-1.5 font-semibold text-[#6b6152]">
        <CheckIcon className="h-4 w-4 shrink-0 text-[#a67c52]" strokeWidth={1.8} />
        {t("businessOnboarding.ratingsGuidanceText")}
      </p>

      <div className="mt-6 grid gap-4">
        {reviews.length === 0 && (
          <div className="rounded-3xl bg-yellow-50/70 p-6 text-center sm:p-8">
            <div className="soft-pressed mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <StarIcon className="h-6 w-6 text-yellow-600" strokeWidth={1.6} />
            </div>
            <h3 className="mt-4 text-2xl font-black text-[#2e2a22]">
              {t("businessDashboard.noReviews")}
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-[#6b6152]">
              {t("businessDashboard.noReviewsHint")}
            </p>
            <a
              href="#reservations"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-yellow-100 px-6 py-3 font-black text-yellow-800 transition hover:bg-yellow-200"
            >
              {t("businessDashboard.viewReservations")}
            </a>
          </div>
        )}

        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl bg-[#f4efe4] p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xl font-black text-yellow-700">
                  <StarIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} filled />
                  {review.rating}
                </p>
                <p className="mt-1 font-bold text-[#2e2a22]">
                  {businessNameById[Number(review.business_id)] || "Business"}
                </p>
              </div>

              <p className="text-sm font-bold text-[#6b6152]">
                {formatDisplayDateTime(review.created_at, language)}
              </p>
            </div>

            <p className="mt-4 font-semibold text-[#6b6152]">
              {review.review?.trim() || t("common.noWrittenReview")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
