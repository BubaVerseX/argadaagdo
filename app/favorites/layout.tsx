import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Saved Offers",
  description:
    "Your saved food rescue offers.",
  path: "/favorites",
  index: false,
});

export default function FavoritesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
