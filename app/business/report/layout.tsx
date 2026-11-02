import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Monthly report",
  description: "Printable monthly Green Bag report for a business.",
  path: "/business/report",
  index: false,
});

export default function BusinessReportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
