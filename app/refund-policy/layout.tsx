import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Refunds and cancellations · გაუქმება და თანხის დაბრუნება",
  description:
    "Cancel up to 2 hours before pickup for a full refund. A missed pickup isn't refunded.",
  path: "/refund-policy",
});

export default function RefundPolicyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
