import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Settings",
  description:
    "Your ArGadaagdo account settings.",
  path: "/settings",
  index: false,
});

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
