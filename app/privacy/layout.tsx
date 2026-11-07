import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  // Georgian first, like the page the server renders; the tab title then
  // follows the chosen language (lib/useDocumentTitle.ts).
  title: "კონფიდენციალურობის პოლიტიკა · Privacy Policy",
  description:
    "როგორ აგროვებს, იყენებს და იცავს „არ გადააგდო“ შენს პერსონალურ მონაცემებს. How ArGadaagdo collects, uses and protects your personal data.",
  path: "/privacy",
});

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
