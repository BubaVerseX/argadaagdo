"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { ClockIcon, XIcon } from "@/components/icons";
import OfferImage from "@/components/OfferImage";
import { businessLocation, distanceKm, formatDistance, type LatLng } from "@/lib/location";
import { addMapCredit, createLeafPin, MAP_STYLE_URL, TBILISI_CENTER } from "@/lib/mapStyle";
import type { NativeOffer } from "@/lib/nativeData";
import { getOfferCategoryTone } from "@/lib/offerCategories";
import { formatMoney, formatPickupTimeRange, getOfferDateLabel } from "@/lib/offerLifecycle";
import { useLanguage } from "@/lib/useLanguage";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "./AppLink";
import NativePlaces from "./NativePlaces";

type Place = { id: number; name: string; location: LatLng; offers: NativeOffer[] };

// The Map view of Nearby: a green leaf pin per place with boxes today; tap a
// pin for its offer card. Places without a pin yet are listed under the map.
export default function NativeMapView({
  offers,
  userLocation,
}: {
  offers: NativeOffer[];
  userLocation: LatLng | null;
}) {
  const { language } = useLanguage();
  const ka = language === "ka";
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<number, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { places, unpinned } = useMemo(() => {
    const byBusiness = new Map<number, Place>();
    const withoutPin: NativeOffer[] = [];
    for (const offer of offers) {
      const location = businessLocation(offer.businesses);
      if (!location) {
        withoutPin.push(offer);
        continue;
      }
      const place = byBusiness.get(offer.business_id);
      if (place) place.offers.push(offer);
      else byBusiness.set(offer.business_id, { id: offer.business_id, name: offer.businesses?.name || "", location, offers: [offer] });
    }
    return { places: [...byBusiness.values()], unpinned: withoutPin };
  }, [offers]);

  // The map, once; MapLibre loads only with this view.
  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    void import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !container.current) return;
        const map = new maplibre.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: TBILISI_CENTER,
          zoom: 11.5,
          attributionControl: false,
        });
        addMapCredit(maplibre, map);
        map.on("load", () => !cancelled && setReady(true));
        map.on("click", () => setSelectedId(null));
        mapRef.current = map;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Pins follow the filtered offers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled) return;
      const markers = markersRef.current;
      const ids = new Set(places.map((place) => place.id));
      for (const [id, marker] of markers) {
        if (!ids.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
      for (const place of places) {
        if (markers.has(place.id)) continue;
        const element = createLeafPin();
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", place.name);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          setSelectedId(place.id);
        });
        markers.set(
          place.id,
          new maplibre.Marker({ element, anchor: "bottom" }).setLngLat([place.location.longitude, place.location.latitude]).addTo(map)
        );
      }

      userMarkerRef.current?.remove();
      if (userLocation) {
        const dot = document.createElement("div");
        dot.className = "user-dot";
        userMarkerRef.current = new maplibre.Marker({ element: dot })
          .setLngLat([userLocation.longitude, userLocation.latitude])
          .addTo(map);
      }

      const points = places.map((place) => place.location).concat(userLocation ? [userLocation] : []);
      if (points.length === 1) {
        map.jumpTo({ center: [points[0].longitude, points[0].latitude], zoom: 14 });
      } else if (points.length > 1) {
        const bounds = new maplibre.LngLatBounds();
        for (const point of points) bounds.extend([point.longitude, point.latitude]);
        map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 0 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [places, userLocation, ready]);

  // The chosen pin is a little larger.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle("is-selected", id === selectedId);
    }
  }, [selectedId, places]);

  const selected = places.find((place) => place.id === selectedId) || null;
  const offer = selected?.offers.slice().sort((a, b) => Number(a.price) - Number(b.price))[0];

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-[22px] border border-line bg-card">
        {failed ? (
          <p className="p-6 text-center text-sm text-body">{ka ? "რუკა ვერ ჩაიტვირთა." : "The map couldn't load."}</p>
        ) : (
          // Fits between the green header and the tab bar on small phones too.
          <div ref={container} className="h-[calc(100dvh-25rem)] min-h-[15rem] w-full" />
        )}

        {selected && offer && (
          <div className="absolute inset-x-2.5 bottom-2.5">
            <Link
              href={`/offers/${offer.id}`}
              className="native-press flex min-w-0 items-center gap-3 rounded-[18px] bg-white p-2.5 pr-10 text-cream shadow-[0_8px_24px_rgba(15,58,50,0.18)]"
            >
              <div className={`${getOfferCategoryTone(offer.category)} photo-leaf-sm relative isolate h-14 w-14 shrink-0`}>
                <OfferImage src={offer.image_url} alt={offer.title} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{selected.name}</p>
                <p className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="native-time-chip min-w-0 text-[12px] font-medium">
                    <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate">
                      {getOfferDateLabel(offer, language)} {formatPickupTimeRange(offer, language)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-mint">{formatMoney(offer.price)}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-body">
                  {selected.offers.length > 1
                    ? ka
                      ? `${selected.offers.length} ბოქსი`
                      : `${selected.offers.length} boxes`
                    : ka
                    ? "1 ბოქსი"
                    : "1 box"}
                  {userLocation ? ` · ${formatDistance(distanceKm(userLocation, selected.location), language)}` : ""}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label={ka ? "დახურვა" : "Close"}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-body"
            >
              <XIcon className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {unpinned.length > 0 && (
        <>
          <p className="px-1 pt-1 text-xs font-medium text-body">
            {ka ? "რუკაზე ჯერ არ არის" : "Not on the map yet"}
          </p>
          <NativePlaces offers={unpinned} />
        </>
      )}
    </div>
  );
}
