"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { SearchIcon } from "@/components/icons";
import type { LatLng } from "@/lib/location";
import { createLeafPin, MAP_STYLE_URL, TBILISI_CENTER } from "@/lib/mapStyle";
import { supabase } from "@/lib/supabase";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

type Result = { label: string; latitude: number; longitude: number };

// The business pickup pin: search the address (OpenStreetMap), pick a result,
// then drag the pin to the exact entrance (or tap the map). Used in the
// business sign-up and in admin.
export default function LocationPicker({
  value,
  onChange,
  initialQuery = "",
  language,
}: {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  initialQuery?: string;
  language: "ka" | "en";
}) {
  const ka = language === "ka";
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // The map, once. MapLibre is loaded only here.
  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !container.current) return;
        const start = value ? [value.longitude, value.latitude] : TBILISI_CENTER;
        const map = new maplibre.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: start as [number, number],
          zoom: value ? 16 : 11.5,
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        const marker = new maplibre.Marker({ element: createLeafPin(), draggable: true, anchor: "bottom" });
        marker.on("dragend", () => {
          const point = marker.getLngLat();
          onChangeRef.current({ latitude: point.lat, longitude: point.lng });
        });
        if (value) marker.setLngLat(start as [number, number]).addTo(map);
        map.on("click", (event) => {
          marker.setLngLat(event.lngLat).addTo(map);
          onChangeRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
        });
        map.on("error", () => undefined);
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => setMapFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; later pin moves go through place().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function place(point: LatLng) {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      marker.setLngLat([point.longitude, point.latitude]).addTo(map);
      map.flyTo({ center: [point.longitude, point.latitude], zoom: 17, speed: 1.4 });
    }
    onChange(point);
  }

  async function search() {
    const text = query.trim();
    if (text.length < 3 || searching) return;
    setSearching(true);
    setFailed(false);
    const { data } = await supabase.auth.getSession();
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(text)}&lang=${language}`, {
      headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { results?: Result[] } | null;
    setSearching(false);
    if (!response?.ok || !body?.results) {
      setFailed(true);
      setResults(null);
      return;
    }
    setResults(body.results);
    if (body.results.length === 1) place(body.results[0]);
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
            placeholder={ka ? "მოძებნე მისამართი" : "Search the address"}
            aria-label={ka ? "მოძებნე მისამართი" : "Search the address"}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          onClick={() => void search()}
          disabled={searching || query.trim().length < 3}
          className="min-h-11 shrink-0 rounded-xl bg-brand-forest px-4 text-sm font-semibold text-brand-ground disabled:opacity-50"
        >
          {searching ? "…" : ka ? "ძებნა" : "Search"}
        </button>
      </div>

      {results && results.length > 1 && (
        <ul className="overflow-hidden rounded-xl border border-line bg-card text-sm">
          {results.map((result, index) => (
            <li key={`${result.latitude},${result.longitude}`} className={index ? "border-t border-line" : ""}>
              <button type="button" onClick={() => place(result)} className="w-full px-3 py-2.5 text-left text-cream">
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results && results.length === 0 && (
        <p className="text-xs text-body">
          {ka ? "ვერ მოიძებნა. დააჭირე რუკას საჭირო ადგილას." : "Not found. Tap the map at the right spot."}
        </p>
      )}
      {failed && (
        <p className="text-xs text-danger">
          {ka ? "ძებნა ახლა ვერ მოხერხდა. დააჭირე რუკას საჭირო ადგილას." : "Search didn't work right now. Tap the map at the right spot."}
        </p>
      )}

      {mapFailed ? (
        <p className="rounded-xl bg-well p-4 text-sm text-body">
          {ka ? "რუკა ვერ ჩაიტვირთა." : "The map couldn't load."}
        </p>
      ) : (
        <div ref={container} className="h-64 w-full overflow-hidden rounded-xl border border-line" />
      )}
      <p className="text-xs text-body">
        {value
          ? ka
            ? "გადაათრიე ქინძისთავი ზუსტად შესასვლელთან."
            : "Drag the pin to the exact entrance."
          : ka
          ? "მოძებნე მისამართი ან დააჭირე რუკას."
          : "Search the address or tap the map."}
      </p>
    </div>
  );
}
