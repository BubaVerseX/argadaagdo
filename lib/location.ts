// The person's location, only with their OK, to sort Nearby by distance and
// show where they are on the map. In the app it uses @capacitor/geolocation
// (one clean system prompt); builds made before that plugin, and the website,
// use the browser's geolocation.

export type LatLng = { latitude: number; longitude: number };

const CHOICE_KEY = "argadaagdo-location";

type GeolocationPlugin = {
  checkPermissions(): Promise<{ location: string; coarseLocation?: string }>;
  requestPermissions(options?: { permissions: string[] }): Promise<{ location: string; coarseLocation?: string }>;
  getCurrentPosition(options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }): Promise<{
    coords: { latitude: number; longitude: number };
  }>;
};

function plugin(): GeolocationPlugin | undefined {
  const capacitor = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Geolocation?: GeolocationPlugin } };
  }).Capacitor;
  return capacitor?.isNativePlatform?.() ? capacitor.Plugins?.Geolocation : undefined;
}

/** "on" = they allowed it, "off" = they said not now, null = not asked yet. */
export function getLocationChoice(): "on" | "off" | null {
  try {
    const value = localStorage.getItem(CHOICE_KEY);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

export function setLocationChoice(value: "on" | "off") {
  try {
    localStorage.setItem(CHOICE_KEY, value);
  } catch {
    // Private mode: asked again next time.
  }
}

function fromBrowser(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  });
}

/** Asks for permission if needed (after the person tapped "Turn on"). */
export async function requestLocation(): Promise<LatLng | null> {
  const geolocation = plugin();
  if (!geolocation) return fromBrowser();
  try {
    const status = await geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
    if (status.location !== "granted" && status.coarseLocation !== "granted") return null;
    const position = await geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/** The location without prompting: only when they already said yes. */
export async function getLocationIfAllowed(): Promise<LatLng | null> {
  if (getLocationChoice() !== "on") return null;
  const geolocation = plugin();
  if (!geolocation) return fromBrowser();
  try {
    const status = await geolocation.checkPermissions();
    if (status.location !== "granted" && status.coarseLocation !== "granted") return null;
    const position = await geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/** Straight-line distance in km. */
export function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "350 მ" / "1.2 km". */
export function formatDistance(km: number, language: "ka" | "en") {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} ${language === "ka" ? "მ" : "m"}`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ${language === "ka" ? "კმ" : "km"}`;
}

export function businessLocation(business: { latitude?: number | null; longitude?: number | null } | null | undefined): LatLng | null {
  const latitude = Number(business?.latitude);
  const longitude = Number(business?.longitude);
  return business?.latitude != null && business?.longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}
