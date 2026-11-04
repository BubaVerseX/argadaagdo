"use client";

import { useLanguage } from "@/lib/useLanguage";

type BrandMarkProps = {
  /** Icon tile size (Tailwind h/w classes). */
  tileClassName?: string;
  /** Wordmark classes; omit `withName` to render only the tile. */
  nameClassName?: string;
  withName?: boolean;
  tagline?: string;
  taglineClassName?: string;
};

/**
 * Leaf tile + localized brand name ("ArGadaagdo" / "არ გადააგდო").
 * Used by the navbar, footer and loading/empty states.
 */
export default function BrandMark({
  tileClassName = "h-9 w-9 sm:h-10 sm:w-10",
  nameClassName = "text-lg font-semibold leading-none text-cream sm:text-xl",
  withName = true,
  tagline,
  taglineClassName = "hidden text-xs text-body md:block",
}: BrandMarkProps) {
  const { t } = useLanguage();

  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 200 200" aria-hidden="true" className={`shrink-0 ${tileClassName}`}>
        <rect width="200" height="200" rx="46" fill="var(--brand-mint)" />
        <path
          d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
          fill="var(--brand-forest)"
        />
      </svg>

      {withName && (
        <span className="min-w-0">
          <span className={`block ${nameClassName}`}>{t("brand.name")}</span>
          {tagline && <span className={`mt-1 block ${taglineClassName}`}>{tagline}</span>}
        </span>
      )}
    </span>
  );
}
