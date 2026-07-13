import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/site";

const publicRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/offers", priority: 0.95, changeFrequency: "hourly" as const },
  { path: "/businesses", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/for-businesses", priority: 0.75, changeFrequency: "monthly" as const },
  { path: "/discover", priority: 0.75, changeFrequency: "daily" as const },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/support", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.65, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: absoluteSiteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
