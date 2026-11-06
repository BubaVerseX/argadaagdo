"use client";

import { MapPinIcon } from "@/components/icons";
import { createMapsSearchUrl } from "@/lib/maps";
import type { NativeOffer } from "@/lib/nativeData";
import { useLanguage } from "@/lib/useLanguage";
import { useMemo } from "react";
import Link from "./AppLink";

// The Map side of Nearby. There are no coordinates in the database yet, so
// this doesn't draw a map or guess positions: it lists the places with boxes
// today, and each one opens in the phone's maps app by its real address.
export default function NativePlaces({ offers }: { offers: NativeOffer[] }) {
  const { t } = useLanguage();

  const places = useMemo(() => {
    const byBusiness = new Map<number, { id: number; name: string; address: string; count: number }>();
    for (const offer of offers) {
      const place = byBusiness.get(offer.business_id);
      if (place) place.count += 1;
      else if (offer.businesses?.address) {
        byBusiness.set(offer.business_id, {
          id: offer.business_id,
          name: offer.businesses.name,
          address: offer.businesses.address,
          count: 1,
        });
      }
    }
    return [...byBusiness.values()];
  }, [offers]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
      {places.map((place) => (
        <a
          key={place.id}
          href={createMapsSearchUrl(place.address, place.name)}
          target="_blank"
          rel="noreferrer"
          className="native-press flex min-w-0 items-center gap-3 rounded-[20px] bg-card p-3 text-cream"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-moss text-mint">
            <MapPinIcon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{place.name}</span>
            <span className="block truncate text-[13px] text-body">{place.address}</span>
          </span>
          <span className="native-time-chip flex-none text-xs font-semibold">
            {t("native.map.boxes").replace("{n}", String(place.count))}
          </span>
        </a>
      ))}

      <Link
        href="/businesses"
        className="native-press flex min-h-12 items-center justify-center rounded-[20px] bg-card text-sm font-semibold text-cream"
      >
        {t("native.map.all")}
      </Link>
    </div>
  );
}
