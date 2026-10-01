import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "My Orders",
  description:
    "Your reservations, pickup codes and order history.",
  path: "/orders",
  index: false,
});

export default function OrdersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
