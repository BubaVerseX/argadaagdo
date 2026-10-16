import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";
import SupportContent from "./SupportContent";

export const metadata: Metadata = buildPageMetadata({
  title: "Help & Support",
  description:
    "Help with reservations, pickup codes, cancellations, refunds and business accounts on ArGadaagdo.",
  path: "/support",
});

export default function SupportPage() {
  return <SupportContent />;
}
