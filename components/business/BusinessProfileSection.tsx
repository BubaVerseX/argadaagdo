"use client";

import { RequiredMark } from "@/components/RequiredMark";
import { useLanguage } from "@/lib/useLanguage";

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

  return (
    <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-3xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
            {isGeorgian ? "ბიზნესის პროფილი" : "Business Profile"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {isGeorgian ? "მართე საჯარო ინფორმაცია" : "Manage public details"}
          </h2>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-body">
            {isGeorgian
              ? "ბიზნესის საჯარო ინფორმაცია მკაფიო გქონდეს, რომ მომხმარებლებმა იცოდნენ, სად წაიღონ სიურპრიზის ყუთი."
              : "Keep your public business information clear so customers know where to collect their surprise bag."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
          <div className="ui-card rounded-3xl p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mint text-2xl font-semibold text-cream">
              {profileName.trim().slice(0, 2).toUpperCase() || "AG"}
            </div>
            <p className="mt-3 text-sm font-semibold text-mint">
              {isGeorgian ? "ლოგოს გადახედვა" : "Logo preview"}
            </p>
          </div>
          <div className="rounded-3xl bg-well p-5 text-center">
            <div className="ui-well mx-auto h-16 rounded-2xl" />
            <p className="mt-3 text-sm font-semibold text-body">
              {isGeorgian ? "ქავერის სურათის გადახედვა" : "Cover image preview"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-body">
          <span>
            {isGeorgian ? "ბიზნესის სახელი" : "Business name"} <RequiredMark />
          </span>
          <input
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            maxLength={80}
            className="premium-input p-4 font-semibold"
            placeholder="GMBH1 Bakery"
          />
          <span className="text-xs font-semibold text-body">
            {profileName.length}/80
          </span>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-body">
          <span>
            {isGeorgian ? "ბიზნესის ტიპი" : "Business type"} <RequiredMark />
          </span>
          <input
            value={profileType}
            onChange={(event) => onProfileTypeChange(event.target.value)}
            maxLength={60}
            className="premium-input p-4 font-semibold"
            placeholder={isGeorgian ? "საცხობი" : "Bakery"}
          />
          <span className="text-xs font-semibold text-body">
            {profileType.length}/60
          </span>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-body">
          <span>
            {isGeorgian ? "მისამართი" : "Address"} <RequiredMark />
          </span>
          <input
            value={profileAddress}
            onChange={(event) => onProfileAddressChange(event.target.value)}
            maxLength={160}
            className="premium-input p-4 font-semibold"
            placeholder={
              isGeorgian
                ? "რუსთაველის გამზირი, თბილისი"
                : "Rustaveli Avenue, Tbilisi"
            }
          />
          <span className="text-xs font-semibold text-body">
            {profileAddress.length}/160
          </span>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-body">
          {isGeorgian ? "ტელეფონი" : "Phone"}
          <input
            value={profilePhone}
            onChange={(event) => onProfilePhoneChange(event.target.value)}
            type="tel"
            inputMode="tel"
            maxLength={40}
            className="premium-input p-4 font-semibold"
            placeholder="+995 555 123 456"
          />
          <span className="text-xs font-semibold text-body">
            {profilePhone.length}/40
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={(event) => onSave(event.timeStamp)}
        disabled={savingProfile}
        className="premium-button mt-5 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {savingProfile
          ? isGeorgian
            ? "პროფილი ინახება..."
            : "Saving profile..."
          : isGeorgian
          ? "პროფილის შენახვა"
          : "Save profile"}
      </button>
    </div>
  );
}
