import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How ArGadaagdo collects, uses and protects your personal data.",
  path: "/privacy",
});

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
