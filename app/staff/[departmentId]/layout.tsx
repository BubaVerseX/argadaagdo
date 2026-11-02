import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Staff pickups",
  description: "Department staff page: confirm Green Bag pickups with the customer's code.",
  path: "/staff",
  index: false,
});

export default function StaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
