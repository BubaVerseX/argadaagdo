import Link from "next/link";
import { getOfferQuantityLabel } from "@/components/OfferCard";
import OfferImage from "@/components/OfferImage";
import type { Language } from "@/lib/i18n";
import { getGreenBagLabel, getOfferCategoryTone } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupWindow,
  getDiscountPercent,
  getOriginalPrice,
} from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";

type BagCardProps = {
  offer: Offer;
  language: Language;
  detailsLabel: string;
  ratingLabel?: string;
  /** "hero": the large featured card. "compact": smaller cards in a row. */
  layout?: "hero" | "compact";
  imageSizes?: string;
  priority?: boolean;
  className?: string;
};

/** An offer in the colourful app style, coloured by its category. */
export function BagCard({
  offer,
  language,
  detailsLabel,
  ratingLabel,
  layout = "compact",
  imageSizes,
  priority = false,
  className = "",
}: BagCardProps) {
  const discountPercent = getDiscountPercent(offer);
  const originalPrice = getOriginalPrice(offer);
  const quantityLabel = getOfferQuantityLabel(offer, language);
  const detailsHref = `/offers/${offer.id}`;
  const isHero = layout === "hero";
  const businessName = offer.businesses?.name;
  const address = offer.businesses?.address;

  return (
    <article
      className={`${getOfferCategoryTone(
        offer.category
      )} relative flex min-w-0 flex-col overflow-hidden bg-cat text-cat-ink ${
        isHero ? "rounded-[28px] p-4 sm:p-5" : "rounded-3xl p-3"
      } ${className}`}
    >
      {isHero && (
        <span
          aria-hidden="true"
          className="absolute -bottom-10 -right-8 h-48 w-48 rounded-full bg-cat-soft"
        />
      )}

      <div className={`relative flex min-w-0 flex-1 ${isHero ? "gap-3.5 sm:gap-5" : "flex-col gap-3"}`}>
        <div className={`relative ${isHero ? "min-h-40 w-[7.5rem] shrink-0 self-stretch sm:min-h-52 sm:w-44" : "h-32 w-full"}`}>
          <Link
            href={detailsHref}
            tabIndex={-1}
            aria-hidden="true"
            className={`absolute inset-0 block ${isHero ? "photo-leaf" : "photo-leaf-sm"}`}
          >
            <OfferImage
              src={offer.image_url}
              alt={offer.title}
              sizes={imageSizes || (isHero ? "(min-width: 640px) 176px, 120px" : "260px")}
              priority={priority}
            />
          </Link>

          {discountPercent !== null && (
            <div className="discount-sticker pointer-events-none absolute -bottom-1 -left-1">
              −{discountPercent}%
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={detailsHref} className="block min-w-0 rounded-lg">
            <p className="text-xs font-bold text-cat-ink-2">
              {getGreenBagLabel(offer, language)}
            </p>
            <h3
              className={`mt-1 font-serif font-bold leading-[1.25] ${
                isHero ? "text-lg sm:text-xl" : "text-base"
              }`}
            >
              {businessName || offer.title}
            </h3>
            {businessName && (
              <p className="mt-0.5 text-sm font-medium">{offer.title}</p>
            )}
          </Link>

          {address && (
            <p className="mt-1 line-clamp-2 text-xs text-cat-ink-2">{address}</p>
          )}

          <p className="mt-1 text-xs font-medium text-cat-ink-2">
            {formatPickupWindow(offer, language)}
          </p>
          {ratingLabel && (
            <p className="mt-0.5 text-xs text-cat-ink-2">{ratingLabel}</p>
          )}

          <div className="mt-auto flex items-baseline gap-1.5 pt-2">
            <span className={`font-bold leading-none ${isHero ? "text-2xl" : "text-xl"}`}>
              {formatMoney(offer.price)}
            </span>
            {originalPrice !== null && (
              <span className="text-xs text-cat-ink-2 line-through">
                {formatMoney(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 text-xs font-bold text-cat-ink-2">{quantityLabel}</span>
        <Link
          href={detailsHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-forest px-5 py-2 text-sm font-bold text-brand-ground transition hover:bg-brand-forest-2"
        >
          {detailsLabel}
        </Link>
      </div>
    </article>
  );
}
