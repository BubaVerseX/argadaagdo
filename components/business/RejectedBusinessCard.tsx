"use client";

import { useState } from "react";
import { RequiredMark } from "@/components/RequiredMark";
import { useLanguage } from "@/lib/useLanguage";
import type { Business } from "@/lib/types";

export type BusinessDetailsDraft = {
  name: string;
  businessType: string;
  address: string;
  phone: string;
};

/**
 * A rejected application: why it was rejected, plus the details to correct
 * before sending it back. Separate from the profile form because that form only
 * follows approved businesses once an owner has one.
 */
export function RejectedBusinessCard({
  business,
  resubmitting,
  onResubmit,
}: {
  business: Business;
  resubmitting: boolean;
  onResubmit: (businessId: number, details: BusinessDetailsDraft) => void;
}) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const [name, setName] = useState(business.name || "");
  const [businessType, setBusinessType] = useState(business.business_type || "");
  const [address, setAddress] = useState(business.address || "");
  const [phone, setPhone] = useState(business.phone || "");

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

      <p className="mt-4 max-w-2xl leading-7 text-body">
        {isGeorgian
          ? "გაასწორე დეტალები და ხელახლა გაგზავნე დასამტკიცებლად."
          : "Edit the details and send them back for approval."}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-body">
          <span>
            {isGeorgian ? "ბიზნესის სახელი" : "Business name"} <RequiredMark />
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="premium-input p-4 font-semibold"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-body">
          <span>
            {isGeorgian ? "ბიზნესის ტიპი" : "Business type"} <RequiredMark />
          </span>
          <input
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            maxLength={60}
            className="premium-input p-4 font-semibold"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-body">
          <span>
            {isGeorgian ? "მისამართი" : "Address"} <RequiredMark />
          </span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            maxLength={160}
            className="premium-input p-4 font-semibold"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-body">
          {isGeorgian ? "ტელეფონი" : "Phone"}
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            inputMode="tel"
            maxLength={40}
            className="premium-input p-4 font-semibold"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={resubmitting}
        onClick={() =>
          onResubmit(business.id, { name, businessType, address, phone })
        }
        className="premium-button mt-5 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {resubmitting
          ? isGeorgian
            ? "იგზავნება..."
            : "Sending..."
          : isGeorgian
          ? "ხელახლა გაგზავნა დასამტკიცებლად"
          : "Resubmit for approval"}
      </button>
    </div>
  );
}
