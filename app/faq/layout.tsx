import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers about Lunch Boxes, reservations, pickup codes, cancellations and joining ArGadaagdo as a business.",
  path: "/faq",
});

export default function FaqLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
