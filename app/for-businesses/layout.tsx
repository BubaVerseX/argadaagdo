import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "For Businesses",
  description:
    "Sell your unsold food as surprise bags to customers in Tbilisi. Join the ArGadaagdo pilot.",
  path: "/for-businesses",
});

export default function ForBusinessesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
