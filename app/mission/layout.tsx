import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Our Mission",
  description:
    "Why food waste matters in Georgia and worldwide, and how Green Bags help reduce it.",
  path: "/mission",
});

export default function MissionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
