import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  // Georgian first, like the page the server renders; the tab title then
  // follows the chosen language (lib/useDocumentTitle.ts).
  title: "გამოყენების წესები · Terms of Use",
  description:
    "„არ გადააგდოს“ ლანჩ ბოქსების დაჯავშნის, გადახდისა და წაღების წესები. The rules for reserving, paying for and collecting food rescue offers on ArGadaagdo.",
  path: "/terms",
});

export default function TermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
