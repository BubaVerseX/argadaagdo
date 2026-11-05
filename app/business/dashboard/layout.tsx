import type { Metadata } from "next";
import { BusinessHostGuard } from "@/components/business/BusinessHostGuard";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Business Dashboard",
  description:
    "Manage your offers, reservations and pickups.",
  path: "/business/dashboard",
  index: false,
});

export default function BusinessDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BusinessHostGuard />
      {children}
    </>
  );
}
