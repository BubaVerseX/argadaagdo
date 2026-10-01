"use client";

import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

type SupportLinkProps = {
  label?: string;
};

export function SupportLink({ label }: SupportLinkProps) {
  const { language } = useLanguage();

  return (
    <Link
      href="/support"
      className="soft-raised inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-center font-semibold text-[#a67c52] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
    >
      {label ??
        (language === "ka"
          ? "მხარდაჭერის ცენტრის ნახვა"
          : "Visit Support Center")}
    </Link>
  );
}
