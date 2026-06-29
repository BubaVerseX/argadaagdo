import type { Language } from "@/lib/i18n";
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
    <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Customer Feedback
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {t("businessDashboard.businessReviews")}
      </h2>

      <p className="mt-2 font-semibold text-gray-600">
        ✓ {t("businessOnboarding.ratingsGuidanceText")}
      </p>

      <div className="mt-6 grid gap-4">
        {reviews.length === 0 && (
          <div className="rounded-3xl border border-dashed border-yellow-200 bg-yellow-50/70 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
              ⭐
            </div>
            <h3 className="mt-4 text-2xl font-black text-gray-950">
              {t("businessDashboard.noReviews")}
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
              {t("businessDashboard.noReviewsHint")}
            </p>
            <a
              href="#reservations"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-yellow-500 px-6 py-3 font-black text-yellow-950 transition hover:bg-yellow-400"
            >
              {t("businessDashboard.viewReservations")}
            </a>
          </div>
        )}

        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border bg-[#F7F6EF] p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xl font-black text-yellow-700">
                  {review.rating} ⭐
                </p>
                <p className="mt-1 font-bold text-gray-700">
                  {businessNameById[Number(review.business_id)] || "Business"}
                </p>
              </div>

              <p className="text-sm font-bold text-gray-500">
                {formatDisplayDateTime(review.created_at, language)}
              </p>
            </div>

            <p className="mt-4 font-semibold text-gray-700">
              {review.review?.trim() || t("common.noWrittenReview")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
