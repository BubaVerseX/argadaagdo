// The map: MapLibre GL with OpenFreeMap's free vector tiles (OpenStreetMap
// data, no API key, attribution shown on the map). Loaded only when a map is
// on screen.
import type * as MapLibreModule from "maplibre-gl";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** Tbilisi, for maps without a pin yet. [longitude, latitude] */
export const TBILISI_CENTER: [number, number] = [44.7925, 41.7151];

/**
 * The OpenStreetMap credit as a small "i" in the bottom-right corner; a tap
 * shows the full line. MapLibre opens the compact credit when it first fills
 * in and only folds it on the first drag, so on a small map it covered the
 * top. Create the map with `attributionControl: false`, then call this.
 */
export function addMapCredit(
  maplibre: typeof MapLibreModule,
  map: MapLibreModule.Map
) {
  map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");

  // Runs after the control's own handlers (added first), once it went compact.
  const fold = () => {
    const credit = map
      .getContainer()
      .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
    if (!credit) return;
    credit.classList.remove("maplibregl-compact-show");
    map.off("styledata", fold);
    map.off("sourcedata", fold);
  };
  map.on("styledata", fold);
  map.on("sourcedata", fold);
}

/** A green leaf pin (MapLibre HTML marker element). */
export function createLeafPin({ selected = false }: { selected?: boolean } = {}) {
  const element = document.createElement("div");
  element.className = `leaf-pin${selected ? " is-selected" : ""}`;
  element.innerHTML =
    '<svg viewBox="0 0 34 42" width="34" height="42" aria-hidden="true">' +
    '<path d="M17 41c-1.2-1.6-13-14.3-13-24A13 13 0 0 1 30 17c0 9.7-11.8 22.4-13 24Z" fill="#0F3A32" stroke="#F7F1E3" stroke-width="2"/>' +
    '<path d="M11.5 22.5c-.6-4.5 2.1-8 8.2-9 .5 5.2-2.6 8.4-7.6 9.3Z" fill="#B8E6C4"/>' +
    '<path d="M12 22.3c2-2.3 4.3-4.6 7.3-8.3" stroke="#0F3A32" stroke-width=".9" fill="none" stroke-linecap="round"/>' +
    "</svg>";
  return element;
}
