import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "For Businesses",
  description:
    "Sell your unsold food as Lunch Boxes to customers in Tbilisi. Apply in a few minutes.",
  path: "/for-businesses",
});

export default function ForBusinessesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
