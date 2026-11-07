import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  businessSiteUrl,
  isBusinessHostname,
  isBusinessHostPath,
  NATIVE_APP_COOKIE,
} from "@/lib/businessArea";
import { siteUrl } from "@/lib/site";

const OFFER_PAGE = /^\/offers\/([^/]+)\/?$/;

// A full page load, not an in-app navigation or prefetch. Next strips its RSC
// headers before the proxy runs, but browsers mark fetch() requests with
// Sec-Fetch-Dest: empty; crawlers and curl send no Sec-Fetch headers at all.
function isPageLoad(request: NextRequest) {
  return (request.headers.get("sec-fetch-dest") ?? "document") === "document";
}

// /offers/<id> is a client page that streams, so it can't answer 404 itself
// (the status is sent before it knows). Checked here instead, for page loads
// only: in-app navigations show the page's own "not found" state. With the
// service role a past or inactive offer still counts (its customers and owner
// can open it); without it (local dev) only public offers do. Any failure lets
// the request through, as before.
async function isMissingOffer(rawId: string) {
  if (!/^[1-9][0-9]{0,15}$/.test(rawId)) return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return false;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/offers?select=id&id=eq.${rawId}&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(600),
      }
    );
    if (!response.ok) return false;

    const rows: unknown = await response.json();
    return Array.isArray(rows) && rows.length === 0;
  } catch {
    return false;
  }
}

// Decides what each host serves. /business/* on the customer host is redirected
// in the browser by BusinessHostGuard instead of here, because the shipped
// native apps load the customer host and need their business login to keep
// working (App Review included), and only the browser can tell it's in the app.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hostname = (request.headers.get("host") || "").split(":")[0];

  if (businessSiteUrl && isBusinessHostname(hostname)) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/for-businesses", request.url));
    }

    if (!isBusinessHostPath(pathname)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, siteUrl));
    }

    return NextResponse.next();
  }

  const offerId = OFFER_PAGE.exec(pathname)?.[1];
  if (offerId && isPageLoad(request) && (await isMissingOffer(offerId))) {
    // No route matches /404, so Next renders app/not-found.tsx with a 404.
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  // The apps show /for-businesses on this host (Profile → For businesses);
  // their WebView carries NATIVE_APP_COOKIE. Browsers go to the business site.
  if (
    businessSiteUrl &&
    pathname === "/for-businesses" &&
    !request.cookies.has(NATIVE_APP_COOKIE)
  ) {
    return NextResponse.redirect(`${businessSiteUrl}/`);
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: no API routes, build assets or files with an extension.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
