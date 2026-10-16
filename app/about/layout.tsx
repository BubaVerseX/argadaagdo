import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "About Us",
  description:
    "How ArGadaagdo helps Tbilisi businesses sell surplus food as discounted surprise bags instead of throwing it away.",
  path: "/about",
});

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
