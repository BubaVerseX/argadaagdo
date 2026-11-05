import type { Metadata } from "next";
import { BusinessHostGuard } from "@/components/business/BusinessHostGuard";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Monthly report",
  description: "Printable monthly Lunch Box report for a business.",
  path: "/business/report",
  index: false,
});

export default function BusinessReportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BusinessHostGuard />
      {children}
    </>
  );
}
