import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "ბიზნესის წესები · Business Terms",
  description:
    "The agreement between a business and ArGadaagdo: food safety, handing over orders, refunds, commission and payouts.",
  path: "/business-terms",
});

export default function BusinessTermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
