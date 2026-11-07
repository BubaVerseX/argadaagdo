import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Pickup rules · წაღების წესები",
  description:
    "Collect your Lunch Box in person during the pickup window. A missed pickup isn't refunded.",
  path: "/pickup-policy",
});

export default function PickupPolicyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
