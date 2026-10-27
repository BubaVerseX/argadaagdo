import Link from "next/link";
import OfferImage from "@/components/OfferImage";
import { ClockIcon, HeartIcon, MapPinIcon } from "@/components/icons";
import type { Language } from "@/lib/i18n";
import {
  formatMoney,
  formatPickupWindow,
  getDiscountPercent,
  getOriginalPrice,
} from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";

export type OfferCardCornerAction = {
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
};

type OfferCardProps = {
  offer: Offer;
  language: Language;
  detailsLabel: string;
  ratingLabel?: string;
  cornerAction?: OfferCardCornerAction;
  imageSizes?: string;
  priority?: boolean;
};

const overlayChipClass =
  "pointer-events-none absolute rounded-full bg-ink/75 px-2.5 py-1.5 text-xs text-mint backdrop-blur-sm";

export function OfferCard({
  offer,
  language,
  detailsLabel,
  ratingLabel,
  cornerAction,
  imageSizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: OfferCardProps) {
  const discountPercent = getDiscountPercent(offer);
  const originalPrice = getOriginalPrice(offer);
  const detailsHref = `/offers/${offer.id}`;
  const quantityLeft = Number(offer.quantity ?? 0);
  const quantityLabel =
    quantityLeft > 0
      ? language === "ka"
        ? `დარჩა ${quantityLeft}`
        : `${quantityLeft} left`
      : null;
  const heartClass = `absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink/75 backdrop-blur-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${
    cornerAction?.active ? "text-mint" : "text-cream hover:text-mint"
  }`;

  return (
    <article className="ui-card group flex min-w-0 flex-col overflow-hidden rounded-[22px] transition hover:-translate-y-0.5">
      <div className="relative">
        <Link href={detailsHref} className="block" tabIndex={-1} aria-hidden="true">
          <div className="photo-frame relative isolate h-44 rounded-none sm:h-48">
            <OfferImage
              src={offer.image_url}
              alt={offer.title}
              sizes={imageSizes}
              priority={priority}
              className="transition duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        {discountPercent !== null && (
          <div className="premium-discount-badge pointer-events-none absolute left-3 top-3 px-2.5 py-1.5">
            −{discountPercent}%
          </div>
        )}

        {quantityLabel && (
          <div className={`${overlayChipClass} bottom-3 left-3`}>{quantityLabel}</div>
        )}

        {cornerAction &&
          (cornerAction.href ? (
            <Link
              href={cornerAction.href}
              aria-label={cornerAction.label}
              aria-pressed={cornerAction.active}
              className={heartClass}
            >
              <HeartIcon className="h-[18px] w-[18px]" strokeWidth={1.8} filled={cornerAction.active} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={cornerAction.onClick}
              aria-label={cornerAction.label}
              aria-pressed={cornerAction.active}
              className={heartClass}
            >
              <HeartIcon className="h-[18px] w-[18px]" strokeWidth={1.8} filled={cornerAction.active} />
            </button>
          ))}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={detailsHref} className="block min-w-0">
          <h3 className="truncate text-base font-medium leading-snug text-cream">
            {offer.title}
          </h3>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-body">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-sage" strokeWidth={1.8} />
            <span className="truncate">
              {offer.businesses?.name}
              {offer.businesses?.address ? ` · ${offer.businesses.address}` : ""}
            </span>
          </div>
        </Link>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="text-[22px] font-semibold leading-none text-mint">
              {formatMoney(offer.price)}
            </p>
            {originalPrice !== null && (
              <p className="text-sm text-muted line-through">
                {formatMoney(originalPrice)}
              </p>
            )}
          </div>
          <p className="moss-pill shrink-0">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            {formatPickupWindow(offer, language)}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="truncate text-xs text-muted">{ratingLabel}</p>
          <Link
            href={detailsHref}
            className="premium-button min-h-10 shrink-0 rounded-xl px-4 py-2 text-xs"
          >
            {detailsLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
