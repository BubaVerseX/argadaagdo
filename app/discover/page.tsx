import type { Metadata } from "next";
import DiscoverClient from "./DiscoverClient";

export const metadata: Metadata = {
  title: "Discover Surprise Bags",
  description:
    "Discover popular, newest, best-rated and ending-soon food rescue offers from verified Tbilisi businesses on ArGadaagdo.",
  openGraph: {
    title: "Discover Surprise Bags | ArGadaagdo",
    description:
      "Browse popular food rescue offers, best-rated businesses and pickup-only surprise bags in Tbilisi.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Discover Surprise Bags | ArGadaagdo",
    description:
      "Browse popular food rescue offers, best-rated businesses and pickup-only surprise bags in Tbilisi.",
  },
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
