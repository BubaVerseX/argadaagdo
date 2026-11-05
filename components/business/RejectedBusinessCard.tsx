"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import type { Business } from "@/lib/types";

export type BusinessDetailsDraft = {
  name: string;
  businessType: string;
  address: string;
  phone: string;
};

/** A rejected application: why, and the way back to the wizard to fix it. */
export function RejectedBusinessCard({ business }: { business: Business }) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <div className="mt-6 rounded-3xl bg-danger-soft p-5 sm:mt-8 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-danger sm:text-sm">
        {isGeorgian ? "განაცხადი არ დამტკიცდა" : "Application not approved"}
      </p>
      <h2 className="mt-2 break-words text-2xl font-semibold text-cream sm:text-3xl">
        {business.name}
      </h2>

      <div className="ui-card mt-4 rounded-2xl p-4">
        <p className="text-sm font-semibold text-body">
          {isGeorgian ? "მიზეზი" : "Reason"}
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words font-semibold text-cream">
          {business.rejection_reason}
        </p>
      </div>

      <Link href="/business/register" className="premium-button mt-5 px-6 py-3">
        {isGeorgian ? "გასწორება და ხელახლა გაგზავნა" : "Fix and resubmit"}
      </Link>
    </div>
  );
}
