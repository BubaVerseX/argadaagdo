import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Register Your Business",
  description:
    "Apply to list your bakery, cafe, restaurant or shop on ArGadaagdo.",
  path: "/business/register",
});

export default function BusinessRegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
