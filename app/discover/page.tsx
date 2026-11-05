import type { Metadata } from "next";
import DiscoverClient from "./DiscoverClient";

export const metadata: Metadata = {
  title: "Discover Lunch Boxes",
  description:
    "Discover popular, newest, best-rated and ending-soon food rescue offers from verified Tbilisi businesses on ArGadaagdo.",
  openGraph: {
    title: "Discover Lunch Boxes | ArGadaagdo",
    description:
      "Browse popular food rescue offers, best-rated businesses and pickup-only Lunch Boxes in Tbilisi.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Discover Lunch Boxes | ArGadaagdo",
    description:
      "Browse popular food rescue offers, best-rated businesses and pickup-only Lunch Boxes in Tbilisi.",
  },
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
