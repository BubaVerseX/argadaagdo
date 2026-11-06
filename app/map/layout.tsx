import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pickup places",
  robots: { index: false, follow: false },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
