import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Tbilisi Businesses",
  description:
    "Explore verified bakeries, cafes, restaurants and shops publishing Lunch Boxes on ArGadaagdo.",
  openGraph: {
    title: "Verified Tbilisi Businesses | ArGadaagdo",
    description:
      "Find approved local businesses offering pickup-only Lunch Boxes in Tbilisi.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Verified Tbilisi Businesses | ArGadaagdo",
    description:
      "Find approved local businesses offering pickup-only Lunch Boxes in Tbilisi.",
  },
};

export default function BusinessesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
