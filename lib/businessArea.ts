// The business area (registration, login, dashboard) lives on its own host,
// business.argadaagdo.ge. Same app; proxy.ts decides what each host serves.
//
// NEXT_PUBLIC_BUSINESS_SITE_URL switches this on. Until it is set everything
// stays on one host, so nothing links to a domain that doesn't exist yet.

import { absoluteSiteUrl } from "@/lib/site";

export const businessSiteUrl = (
  process.env.NEXT_PUBLIC_BUSINESS_SITE_URL || ""
).replace(/\/$/, "");

export function isBusinessHostname(hostname: string) {
  return hostname.startsWith("business.");
}

/** Where a path in the business area lives, for links from anywhere. */
export function businessAreaUrl(path: string) {
  return businessSiteUrl ? `${businessSiteUrl}${path}` : path;
}

/** A full URL for emails. */
export function absoluteBusinessUrl(path: string) {
  return businessSiteUrl ? `${businessSiteUrl}${path}` : absoluteSiteUrl(path);
}

/** Where businesses sign in. Linked from the customer login even before the env var is set. */
export const businessLoginUrl = `${businessSiteUrl || "https://business.argadaagdo.ge"}/login`;

/**
 * Set by the native apps (components/native/NativeRoot.tsx) so proxy.ts can
 * tell them apart from browsers: the apps wrap the customer host, and sending
 * them to the business host would open Safari / Chrome and leave the app.
 */
export const NATIVE_APP_COOKIE = "argadaagdo-app";

/** The link in the customer site's footer. */
export function businessHomeUrl() {
  return businessSiteUrl ? `${businessSiteUrl}/` : "/for-businesses";
}

// Paths the business host serves. Anything else goes to the customer site.
const BUSINESS_HOST_PREFIXES = [
  "/business",
  "/staff",
  "/for-businesses",
  "/login",
  "/profile",
  "/settings",
  "/privacy",
  "/terms",
  "/contact",
  "/support",
  "/faq",
  "/offline",
];

export function isBusinessHostPath(pathname: string) {
  return BUSINESS_HOST_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
