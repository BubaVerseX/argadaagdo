import Link from "next/link";
import OfferImage from "@/components/OfferImage";
import { ClockIcon, HeartIcon, MapPinIcon } from "@/components/icons";
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
  priority?: boolean;
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
  priority = false,
}: OfferCardProps) {
  const discountPercent = getDiscountPercent(offer);
  const detailsHref = `/offers/${offer.id}`;

  return (
    <article className="soft-raised group flex min-w-0 flex-col rounded-[1.75rem] p-4 transition hover:-translate-y-1">
      <div className="relative">
        <Link href={detailsHref} className="block" tabIndex={-1} aria-hidden="true">
          <div className="soft-raised photo-warm-overlay blob-mask relative isolate h-52 overflow-hidden">
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
          <div className="premium-discount-badge pointer-events-none absolute left-2 top-2 px-3 py-1.5">
            -{discountPercent}%
          </div>
        )}

        {cornerAction &&
          (cornerAction.href ? (
            <Link
              href={cornerAction.href}
              aria-label={cornerAction.label}
              aria-pressed={cornerAction.active}
              className={`soft-raised absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] ${
                cornerAction.active ? "text-[#a67c52]" : "text-[#6b6152]"
              }`}
            >
              <HeartIcon className="h-[18px] w-[18px]" strokeWidth={1.8} filled={cornerAction.active} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={cornerAction.onClick}
              aria-label={cornerAction.label}
              aria-pressed={cornerAction.active}
              className={`soft-raised absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] ${
                cornerAction.active ? "text-[#a67c52]" : "text-[#6b6152]"
              }`}
            >
              <HeartIcon className="h-[18px] w-[18px]" strokeWidth={1.8} filled={cornerAction.active} />
            </button>
          ))}
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <Link href={detailsHref} className="block min-w-0">
          <h3 className="truncate text-xl font-bold leading-tight tracking-[-0.02em] text-[#2e2a22]">
            {offer.title}
          </h3>
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm font-medium text-[#6b6152]">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[#8a8072]" strokeWidth={1.8} />
            <span className="truncate">
              {offer.businesses?.name}
              {offer.businesses?.address ? ` · ${offer.businesses.address}` : ""}
            </span>
          </div>
        </Link>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-[-0.02em] text-[#a67c52]">
              {formatMoney(offer.price)}
            </p>
            {offer.old_price && (
              <p className="text-sm font-medium text-[#8a8072] line-through">
                {formatMoney(offer.old_price)}
              </p>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-right text-xs font-semibold leading-5 text-[#8a8072]">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            {formatPickupWindow(offer, language)}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 pt-4">
          <p className="truncate text-xs font-semibold text-[#8a8072]">
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
