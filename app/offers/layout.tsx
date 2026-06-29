import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Food Rescue Offers",
  description:
    "Browse discounted surprise bags from verified local businesses in Tbilisi. Reserve online and collect in person.",
  openGraph: {
    title: "Food Rescue Offers | ArGadaagdo",
    description:
      "Discover pickup-only food rescue offers from verified Tbilisi businesses.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Food Rescue Offers | ArGadaagdo",
    description:
      "Discover pickup-only food rescue offers from verified Tbilisi businesses.",
  },
};

export default function OffersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
