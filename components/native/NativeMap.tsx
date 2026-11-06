"use client";

import { MapPinIcon } from "@/components/icons";
import { createMapsSearchUrl } from "@/lib/maps";
import { useNativeFeed, visibleOffers } from "@/lib/nativeData";
import { getOfferCategoryTone } from "@/lib/offerCategories";
import { useLanguage } from "@/lib/useLanguage";
import Link from "./AppLink";
import { useMemo } from "react";

// There are no coordinates in the database, so this does not draw a map or
// guess positions. It lists the real places with boxes today, and each one
// opens in the phone's maps app by its real address.
export default function NativeMap() {
  const { t } = useLanguage();
  const { feed, loading } = useNativeFeed();

  const places = useMemo(() => {
    const byBusiness = new Map<
      number,
      { id: number; name: string; address: string; count: number; category: string | null }
    >();

    for (const offer of visibleOffers(feed)) {
      const place = byBusiness.get(offer.business_id);
      if (place) {
        place.count += 1;
      } else if (offer.businesses?.address) {
        byBusiness.set(offer.business_id, {
          id: offer.business_id,
          name: offer.businesses.name,
          address: offer.businesses.address,
          count: 1,
          category: offer.category,
        });
      }
    }

    return [...byBusiness.values()];
  }, [feed]);

  return (
    <main className="native-main">
      <header className="px-4 pb-1 pt-4">
        <h1 className="font-serif text-[1.625rem] font-bold">
          {t("native.map.title")}
        </h1>
        <p className="mt-0.5 text-sm text-body">{t("native.map.note")}</p>
      </header>

      <section className="grid gap-3 px-4 pt-3">
        {loading && !feed && (
          <>
            <div className="native-skeleton h-28 rounded-[24px]" aria-hidden="true" />
            <div className="native-skeleton h-28 rounded-[24px]" aria-hidden="true" />
          </>
        )}

        {!loading && places.length === 0 && (
          <p className="rounded-[24px] bg-well p-8 text-center font-bold">
            {t("native.map.emptyTitle")}
          </p>
        )}

        {places.map((place) => (
          <a
            key={place.id}
            href={createMapsSearchUrl(place.address, place.name)}
            target="_blank"
            rel="noreferrer"
            className={`${getOfferCategoryTone(
              place.category
            )} native-press flex items-center gap-3 rounded-[24px] bg-cat p-4 text-cat-ink`}
          >
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-brand-forest text-brand-mint">
              <MapPinIcon className="h-6 w-6" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[1.0625rem] font-bold">
                {place.name}
              </span>
              <span className="block truncate text-[13px] text-cat-ink-2">
                {place.address}
              </span>
            </span>
            <span className="flex-none rounded-full bg-brand-forest px-3 py-1.5 text-xs font-bold text-brand-ground">
              {t("native.map.boxes").replace("{n}", String(place.count))}
            </span>
          </a>
        ))}

        <Link
          href="/businesses"
          className="native-press flex min-h-14 items-center justify-center rounded-[18px] bg-card font-bold"
        >
          {t("native.map.all")}
        </Link>
      </section>
    </main>
  );
}
