import { NextResponse } from "next/server";
import { createUserScopedSupabaseClient } from "@/lib/supabaseServer";

// Address search for the business location pin (sign-up and admin), through
// OpenStreetMap's Nominatim. Its usage policy asks for an identifying
// User-Agent, at most one request a second and no autocomplete, so: signed-in
// people only, one search per button press, results cached, one at a time.
// https://operations.osmfoundation.org/policies/nominatim/

const USER_AGENT = "ArGadaagdo/1.0 (+https://argadaagdo.ge; argadaagdo.support@gmail.com)";
const cache = new Map<string, { at: number; results: GeocodeResult[] }>();
let lastRequestAt = 0;

export type GeocodeResult = { label: string; latitude: number; longitude: number };

export async function GET(request: Request) {
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const {
    data: { user },
  } = await createUserScopedSupabaseClient(accessToken).auth.getUser(accessToken);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 200);
  const language = url.searchParams.get("lang") === "en" ? "en" : "ka";
  if (query.length < 3) return NextResponse.json({ results: [] });

  const key = `${language}:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 24 * 3600 * 1000) {
    return NextResponse.json({ results: cached.results });
  }

  // Nominatim allows one request a second.
  const wait = lastRequestAt + 1100 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.searchParams.set("q", query);
  search.searchParams.set("format", "jsonv2");
  search.searchParams.set("countrycodes", "ge");
  search.searchParams.set("limit", "5");
  search.searchParams.set("accept-language", language);

  const response = await fetch(search, {
    headers: { "User-Agent": USER_AGENT, Referer: "https://argadaagdo.ge" },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) return NextResponse.json({ results: [], error: "unavailable" }, { status: 502 });

  const rows = (await response.json().catch(() => [])) as { display_name?: string; lat?: string; lon?: string }[];
  const results: GeocodeResult[] = rows
    .map((row) => ({
      label: row.display_name || "",
      latitude: Number(row.lat),
      longitude: Number(row.lon),
    }))
    .filter((row) => row.label && Number.isFinite(row.latitude) && Number.isFinite(row.longitude));

  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), results });
  return NextResponse.json({ results });
}
