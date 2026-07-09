import Link from "next/link";
import OfferImage from "@/components/OfferImage";
import type { Language } from "@/lib/i18n";
import { formatMoney, formatPickupWindow } from "@/lib/offerLifecycle";
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
};

function getDiscountPercent(offer: Offer) {
  const price = Number(offer.price || 0);
  const oldPrice = Number(offer.old_price || 0);

  if (oldPrice <= price || oldPrice <= 0) return null;

  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function OfferCard({
  offer,
  language,
  detailsLabel,
  ratingLabel,
  cornerAction,
  imageSizes = "(max-width: 768px) 100vw, 33vw",
}: OfferCardProps) {
  const discountPercent = getDiscountPercent(offer);
  const detailsHref = `/offers/${offer.id}`;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] bg-[#f2efe6] shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-hero)]">
      <div className="relative">
        <Link href={detailsHref} className="block" tabIndex={-1} aria-hidden="true">
          <div className="photo-warm-overlay relative h-56 overflow-hidden">
            <OfferImage
              src={offer.image_url}
              alt={offer.title}
              sizes={imageSizes}
              className="transition duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        {discountPercent !== null && (
          <div className="premium-discount-badge pointer-events-none absolute left-4 top-4 px-3 py-1.5">
            -{discountPercent}%
          </div>
        )}

        {cornerAction &&
          (cornerAction.href ? (
            <Link
              href={cornerAction.href}
              aria-label={cornerAction.label}
              aria-pressed={cornerAction.active}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-base text-[#1a1815] shadow-sm transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
            >
              {cornerAction.active ? "♥" : "♡"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={cornerAction.onClick}
              aria-label={cornerAction.label}
              aria-pressed={cornerAction.active}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-base text-[#1a1815] shadow-sm transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
            >
              {cornerAction.active ? "♥" : "♡"}
            </button>
          ))}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <Link href={detailsHref} className="block min-w-0">
          <h3 className="truncate text-xl font-bold leading-tight tracking-tight text-[#1a1815]">
            {offer.title}
          </h3>
          <p className="mt-1.5 truncate text-sm font-medium text-[#6b6558]">
            {offer.businesses?.name}
            {offer.businesses?.address ? ` · ${offer.businesses.address}` : ""}
          </p>
        </Link>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight text-[#5c7a5c]">
              {formatMoney(offer.price)}
            </p>
            {offer.old_price && (
              <p className="text-sm font-medium text-[#8a8272] line-through">
                {formatMoney(offer.old_price)}
              </p>
            )}
          </div>
          <p className="text-right text-xs font-semibold leading-5 text-[#8a8272]">
            {formatPickupWindow(offer, language)}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
          <p className="truncate text-xs font-semibold text-[#8a8272]">
            {ratingLabel}
          </p>
          <Link href={detailsHref} className="premium-button shrink-0 px-5 py-2 text-xs">
            {detailsLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
