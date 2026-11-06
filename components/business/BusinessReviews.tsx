import { StarIcon } from "@/components/icons";
import type { Language, TranslationKey } from "@/lib/i18n";
import { formatDisplayDateTime } from "@/lib/offerLifecycle";
import type { Rating } from "@/lib/types";

type BusinessReviewsProps = {
  t: (key: TranslationKey) => string;
  language: Language;
  reviews: Rating[];
};

/** One line per review: stars, comment, date. */
export function BusinessReviews({ t, language, reviews }: BusinessReviewsProps) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl bg-well p-4 font-semibold text-body">
        {language === "ka" ? "შეფასებები ჯერ არ არის" : "No reviews yet"}
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {reviews.map((review) => (
        <li key={review.id} className="flex items-start gap-3 rounded-2xl bg-well p-4">
          <span className="flex shrink-0 items-center gap-1 font-semibold text-warning">
            <StarIcon className="h-4 w-4" strokeWidth={1.8} filled />
            {review.rating}
          </span>
          <span className="min-w-0 flex-1 break-words text-cream">
            {review.review?.trim() || t("common.noWrittenReview")}
          </span>
          <span className="shrink-0 text-xs text-body">
            {formatDisplayDateTime(review.created_at, language)}
          </span>
        </li>
      ))}
    </ul>
  );
}
