"use client";

import { RequiredMark } from "@/components/RequiredMark";
import { useLanguage } from "@/lib/useLanguage";

// Same values as the sign-up wizard. Stored in English, shown in Georgian.
const BUSINESS_TYPES = ["Cafe", "Bakery", "Restaurant", "Supermarket", "Hotel", "Other"];
const georgianBusinessTypes: Record<string, string> = {
  Cafe: "კაფე",
  Bakery: "საცხობი",
  Restaurant: "რესტორანი",
  Supermarket: "სუპერმარკეტი",
  Hotel: "სასტუმრო",
  Other: "სხვა",
};

function getBusinessTypeLabel(type: string, language: string) {
  return language === "ka" ? georgianBusinessTypes[type] ?? type : type;
}

type BusinessProfileSectionProps = {
  profileName: string;
  profileType: string;
  profileAddress: string;
  profilePhone: string;
  savingProfile: boolean;
  onProfileNameChange: (value: string) => void;
  onProfileTypeChange: (value: string) => void;
  onProfileAddressChange: (value: string) => void;
  onProfilePhoneChange: (value: string) => void;
  onSave: (actionTime: number) => void;
};

export function BusinessProfileSection({
  profileName,
  profileType,
  profileAddress,
  profilePhone,
  savingProfile,
  onProfileNameChange,
  onProfileTypeChange,
  onProfileAddressChange,
  onProfilePhoneChange,
  onSave,
}: BusinessProfileSectionProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  // Stored values are English; older free-text types stay selectable.
  const typeOptions =
    profileType && !BUSINESS_TYPES.includes(profileType)
      ? [...BUSINESS_TYPES, profileType]
      : BUSINESS_TYPES;
  const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-body";
  const inputClass = "premium-input w-full min-w-0 p-4 font-semibold";

  return (
    <div className="mt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          <span>
            {isGeorgian ? "სახელი" : "Name"} <RequiredMark />
          </span>
          <input
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span>
            {isGeorgian ? "ტიპი" : "Type"} <RequiredMark />
          </span>
          <select
            value={profileType}
            onChange={(event) => onProfileTypeChange(event.target.value)}
            className={inputClass}
          >
            {!profileType && <option value="" />}
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {getBusinessTypeLabel(type, language)}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span>
            {isGeorgian ? "მისამართი" : "Address"} <RequiredMark />
          </span>
          <input
            value={profileAddress}
            onChange={(event) => onProfileAddressChange(event.target.value)}
            maxLength={160}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {isGeorgian ? "ტელეფონი" : "Phone"}
          <input
            value={profilePhone}
            onChange={(event) => onProfilePhoneChange(event.target.value)}
            type="tel"
            inputMode="tel"
            maxLength={40}
            className={inputClass}
            placeholder="+995 555 123 456"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={(event) => onSave(event.timeStamp)}
        disabled={savingProfile}
        className="premium-button mt-4 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {savingProfile
          ? isGeorgian
            ? "ინახება..."
            : "Saving..."
          : isGeorgian
          ? "შენახვა"
          : "Save"}
      </button>
    </div>
  );
}
