import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Offline",
  description:
    "You are offline. Reconnect to browse and reserve offers.",
  path: "/offline",
  index: false,
});

export default function OfflineLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
