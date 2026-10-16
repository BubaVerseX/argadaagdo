import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign In",
  description:
    "Sign in or create an ArGadaagdo account to reserve food rescue offers.",
  path: "/login",
  index: false,
});

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
