import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  businessSiteUrl,
  isBusinessHostname,
  isBusinessHostPath,
} from "@/lib/businessArea";
import { siteUrl } from "@/lib/site";

// Decides what each host serves. /business/* on the customer host is redirected
// in the browser by BusinessHostGuard instead of here, because the shipped
// native apps load the customer host and need their business login to keep
// working (App Review included), and only the browser can tell it's in the app.
export function proxy(request: NextRequest) {
  if (!businessSiteUrl) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const hostname = (request.headers.get("host") || "").split(":")[0];

  if (isBusinessHostname(hostname)) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/for-businesses", request.url));
    }

    if (!isBusinessHostPath(pathname)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, siteUrl));
    }

    return NextResponse.next();
  }

  if (pathname === "/for-businesses") {
    return NextResponse.redirect(`${businessSiteUrl}/`);
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: no API routes, build assets or files with an extension.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
