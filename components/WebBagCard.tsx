import Link from "next/link";
import { getOfferQuantityLabel } from "@/components/OfferCard";
import OfferImage from "@/components/OfferImage";
import type { Language } from "@/lib/i18n";
import { getGreenBagLabel, getOfferCategoryTone } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupWindow,
  getOriginalPrice,
} from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";

/**
 * An offer on the public website (B3Web): a white card, with the category shown
 * only as a small dot. It carries no discount percentage, by decision.
 */
export function WebBagCard({
  offer,
  language,
  actionLabel,
  ratingLabel,
  priority = false,
}: {
  offer: Offer;
  language: Language;
  actionLabel: string;
  ratingLabel?: string;
  priority?: boolean;
}) {
  const originalPrice = getOriginalPrice(offer);
  const quantityLabel = getOfferQuantityLabel(offer, language);
  const detailsHref = `/offers/${offer.id}`;
  const tone = getOfferCategoryTone(offer.category);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-line bg-card text-cream">
      <Link
        href={detailsHref}
        tabIndex={-1}
        aria-hidden="true"
        className={`${tone} relative block h-40`}
      >
        <OfferImage
          src={offer.image_url}
          alt={offer.title}
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={priority}
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-xs text-body">
          <span aria-hidden="true" className={`${tone} h-1.5 w-1.5 shrink-0 rounded-full bg-cat-photo`} />
          {getGreenBagLabel(offer, language)}
        </p>
        <h3 className="mt-1 font-serif text-[17px] font-medium leading-snug">
          <Link href={detailsHref}>{offer.businesses?.name || offer.title}</Link>
        </h3>
        {offer.businesses?.name && <p className="mt-0.5 text-sm">{offer.title}</p>}
        {offer.businesses?.address && (
          <p className="mt-1 text-xs text-body">{offer.businesses.address}</p>
        )}

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-body">
          <span>
            <span className="text-[19px] font-medium text-cream">{formatMoney(offer.price)}</span>{" "}
            {originalPrice !== null && <s>{formatMoney(originalPrice)}</s>}
          </span>
          <span>{formatPickupWindow(offer, language)}</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs text-body">
          <span className="min-w-0">
            {[ratingLabel, quantityLabel].filter(Boolean).join(" · ")}
          </span>
          <Link href={detailsHref} className="premium-button-secondary shrink-0 px-4 py-2">
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
