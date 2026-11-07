import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  // Georgian first, like the page the server renders; the tab title then
  // follows the chosen language (lib/useDocumentTitle.ts).
  title: "ხშირი კითხვები · Frequently Asked Questions",
  description:
    "პასუხები ლანჩ ბოქსებზე, ჯავშნებზე, წაღების კოდებზე, გაუქმებასა და ბიზნესის შემოერთებაზე. Answers about Lunch Boxes, reservations, pickup codes, cancellations and joining ArGadaagdo as a business.",
  path: "/faq",
});

export default function FaqLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
