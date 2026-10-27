"use client";

import { useLanguage } from "@/lib/useLanguage";
import { useId } from "react";

type BrandLeafProps = {
  className?: string;
};

/**
 * The brand leaf (same drawing as the app icon, public/icons and the store
 * banners). Gradient ids are made unique per instance so several marks on
 * one page don't share — and override — each other's gradient.
 */
export function BrandLeaf({ className = "h-6 w-6" }: BrandLeafProps) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#7FAB8E" />
          <stop offset="0.6" stopColor="#A9CDB4" />
          <stop offset="1" stopColor="#E6F7EA" />
        </linearGradient>
      </defs>
      <path
        d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
        fill={`url(#${gradientId})`}
      />
      <g stroke="#DAF1DE" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.45">
        <path d="M78 124 C90 118, 100 118, 112 124" />
        <path d="M78 124 C84 112, 86 104, 86 94" />
        <path d="M98 102 C110 96, 120 96, 132 100" />
        <path d="M98 102 C104 90, 106 82, 106 72" />
        <path d="M118 80 C128 76, 134 76, 142 78" />
        <path d="M118 80 C122 72, 124 66, 124 58" />
        <path d="M62 144 C72 140, 82 140, 92 144" />
        <path d="M62 144 C66 134, 66 126, 66 118" />
      </g>
      <path
        d="M52 152 C74 118, 104 86, 150 50"
        stroke="#DAF1DE"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

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
      <span
        className={`flex shrink-0 items-center justify-center rounded-[10px] border border-line bg-[linear-gradient(135deg,#0E312B,#051F20)] ${tileClassName}`}
      >
        <BrandLeaf className="h-[70%] w-[70%]" />
      </span>

      {withName && (
        <span className="min-w-0">
          <span className={`block ${nameClassName}`}>{t("brand.name")}</span>
          {tagline && <span className={`mt-1 block ${taglineClassName}`}>{tagline}</span>}
        </span>
      )}
    </span>
  );
}
