import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Tbilisi Businesses",
  description:
    "Explore verified bakeries, cafes, restaurants and shops publishing surprise bags on ArGadaagdo.",
  openGraph: {
    title: "Verified Tbilisi Businesses | ArGadaagdo",
    description:
      "Find approved local businesses offering pickup-only surprise bags in Tbilisi.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Verified Tbilisi Businesses | ArGadaagdo",
    description:
      "Find approved local businesses offering pickup-only surprise bags in Tbilisi.",
  },
};

export default function BusinessesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
