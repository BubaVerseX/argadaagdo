import type { MetadataRoute } from "next";
import { absoluteSiteUrl, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/business/dashboard",
        "/orders",
        "/favorites",
        "/settings",
        "/profile",
        "/checkout",
        "/login",
        "/offline",
        "/api/",
      ],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
