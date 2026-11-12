"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { RequiredMark } from "@/components/RequiredMark";
import { getWeekdayLabel, ISO_WEEKDAYS } from "@/lib/greenBag";
import { useLanguage } from "@/lib/useLanguage";
import type { OpeningHours, OpeningHoursDay } from "@/types/business";
import { IMAGE_INPUT_ACCEPT, type ImageUploadResult } from "@/lib/business/prepareImage";
import { translateUserMessage } from "@/lib/messageTranslations";

// The business's public profile (owner decision 6): name, category, address,
// logo, cover photo, description and opening hours, shown on /businesses/<id>.
// The contact phone stays private (only we see it).

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

type DayKey = keyof OpeningHours;

type BusinessProfileSectionProps = {
  businessId: number;
  profileName: string;
  profileType: string;
  profileAddress: string;
  profilePhone: string;
  profileDescription: string;
  profileLogoUrl: string;
  profileCoverUrl: string;
  profileHours: OpeningHours;
  savingProfile: boolean;
  onProfileNameChange: (value: string) => void;
  onProfileTypeChange: (value: string) => void;
  onProfileAddressChange: (value: string) => void;
  onProfilePhoneChange: (value: string) => void;
  onProfileDescriptionChange: (value: string) => void;
  onProfileLogoUrlChange: (value: string) => void;
  onProfileCoverUrlChange: (value: string) => void;
  onProfileHoursChange: (value: OpeningHours) => void;
  /** Uploads to offer-images/business-<id>/ and returns the public URL. */
  onUploadImage: (file: File) => Promise<ImageUploadResult>;
  onSave: (actionTime: number) => void;
};

export function BusinessProfileSection({
  businessId,
  profileName,
  profileType,
  profileAddress,
  profilePhone,
  profileDescription,
  profileLogoUrl,
  profileCoverUrl,
  profileHours,
  savingProfile,
  onProfileNameChange,
  onProfileTypeChange,
  onProfileAddressChange,
  onProfilePhoneChange,
  onProfileDescriptionChange,
  onProfileLogoUrlChange,
  onProfileCoverUrlChange,
  onProfileHoursChange,
  onUploadImage,
  onSave,
}: BusinessProfileSectionProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [imageError, setImageError] = useState("");
  // Stored values are English; older free-text types stay selectable.
  const typeOptions =
    profileType && !BUSINESS_TYPES.includes(profileType)
      ? [...BUSINESS_TYPES, profileType]
      : BUSINESS_TYPES;
  const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-body";
  const inputClass = "premium-input w-full min-w-0 p-4 font-semibold";

  async function handleImage(kind: "logo" | "cover", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError("");
    setUploading(kind);
    const result = await onUploadImage(file);
    setUploading(null);
    if (!result.url) {
      setImageError(translateUserMessage(result.error ?? "", language));
      return;
    }
    if (kind === "logo") onProfileLogoUrlChange(result.url);
    else onProfileCoverUrlChange(result.url);
  }

  function setDay(day: DayKey, value: OpeningHoursDay | undefined) {
    const next: OpeningHours = { ...profileHours };
    if (value === undefined) delete next[day];
    else next[day] = value;
    onProfileHoursChange(next);
  }

  function copyMondayToAll() {
    const monday = profileHours["1"];
    if (monday === undefined) return;
    const next: OpeningHours = {};
    for (const day of ISO_WEEKDAYS) next[String(day) as DayKey] = monday;
    onProfileHoursChange(next);
  }

  return (
    <div className="mt-4 grid gap-5">
      {/* Pictures */}
      <div className="grid gap-3">
        <p className="text-sm font-semibold text-body">{L("ფოტოები", "Pictures")}</p>
        <div className="relative overflow-hidden rounded-3xl bg-well">
          <div className="aspect-[16/7] w-full">
            {profileCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileCoverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                {L("ყდის ფოტო", "Cover photo")}
              </div>
            )}
          </div>
          <div className="absolute bottom-3 left-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-card">
            {profileLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted">{L("ლოგო", "Logo")}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["logo", "cover"] as const).map((kind) => (
            <label
              key={kind}
              className="premium-button-secondary flex min-h-11 cursor-pointer items-center px-4 py-2 text-sm"
            >
              {uploading === kind
                ? L("იტვირთება...", "Uploading...")
                : kind === "logo"
                ? L("ლოგოს ატვირთვა", "Upload logo")
                : L("ყდის ფოტოს ატვირთვა", "Upload cover photo")}
              <input
                type="file"
                accept={IMAGE_INPUT_ACCEPT}
                className="sr-only"
                disabled={uploading !== null}
                onChange={(event) => void handleImage(kind, event)}
              />
            </label>
          ))}
          {(profileLogoUrl || profileCoverUrl) && (
            <button
              type="button"
              onClick={() => {
                onProfileLogoUrlChange("");
                onProfileCoverUrlChange("");
              }}
              className="min-h-11 px-3 text-sm font-semibold text-body underline underline-offset-4"
            >
              {L("ფოტოების მოშორება", "Remove pictures")}
            </button>
          )}
        </div>
        {imageError && (
          <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            {imageError}
          </p>
        )}
        <p className="text-xs text-body">
          {L(
            "ლოგო: კვადრატული. ყდის ფოტო: ჰორიზონტალური, მაგ. შენი ვიტრინა. ნებისმიერი ფოტო ტელეფონიდან — ზომას თავად ვამცირებთ.",
            "Logo: square. Cover: landscape, e.g. your shop window. Any phone photo works — we make it smaller for you."
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          <span>
            {L("სახელი", "Name")} <RequiredMark />
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
            {L("კატეგორია", "Category")} <RequiredMark />
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

        <label className={`${labelClass} md:col-span-2`}>
          <span>
            {L("მისამართი", "Address")} <RequiredMark />
          </span>
          <input
            value={profileAddress}
            onChange={(event) => onProfileAddressChange(event.target.value)}
            maxLength={160}
            className={inputClass}
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          {L("აღწერა", "Description")}
          <textarea
            value={profileDescription}
            onChange={(event) => onProfileDescriptionChange(event.target.value)}
            maxLength={600}
            rows={4}
            className={`${inputClass} min-h-28 font-normal`}
            placeholder={L(
              "მაგ.: ყოველდღე ახალი პური და ნამცხვრები. დღის ბოლოს დარჩენილს ლანჩ ბოქსებში ვყიდით.",
              "E.g. Fresh bread and pastries every day. What's left in the evening goes into Lunch Boxes."
            )}
          />
          <span className="text-right text-xs font-normal text-muted">{profileDescription.length}/600</span>
        </label>
      </div>

      {/* Opening hours */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-body">{L("სამუშაო საათები", "Opening hours")}</p>
          {profileHours["1"] !== undefined && (
            <button
              type="button"
              onClick={copyMondayToAll}
              className="min-h-11 text-sm font-semibold text-mint underline underline-offset-4"
            >
              {L("ორშაბათის ყველა დღეზე გადატანა", "Copy Monday to all days")}
            </button>
          )}
        </div>
        <div className="grid gap-2">
          {ISO_WEEKDAYS.map((day) => {
            const key = String(day) as DayKey;
            const value = profileHours[key];
            const state = value === undefined ? "unset" : value === null ? "closed" : "open";
            return (
              <div key={day} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 rounded-2xl bg-well px-3 py-2">
                <span className="text-sm font-semibold text-cream">
                  {getWeekdayLabel(day, language)}
                </span>
                <select
                  value={state}
                  aria-label={`${getWeekdayLabel(day, language)}: ${L("სტატუსი", "status")}`}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === "unset") setDay(key, undefined);
                    else if (next === "closed") setDay(key, null);
                    else setDay(key, { open: "09:00", close: "20:00" });
                  }}
                  className="premium-input min-h-11 w-full px-3 py-2 text-sm font-semibold"
                >
                  <option value="unset">{L("არ არის მითითებული", "Not set")}</option>
                  <option value="open">{L("ღიაა", "Open")}</option>
                  <option value="closed">{L("დაკეტილია", "Closed")}</option>
                </select>
                {value && (
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="time"
                      value={value.open}
                      aria-label={`${getWeekdayLabel(day, language)}: ${L("იხსნება", "opens")}`}
                      onChange={(event) => setDay(key, { ...value, open: event.target.value })}
                      className="premium-input min-h-11 min-w-0 flex-1 px-3 py-2 text-sm font-semibold"
                    />
                    <span aria-hidden="true" className="text-body">–</span>
                    <input
                      type="time"
                      value={value.close}
                      aria-label={`${getWeekdayLabel(day, language)}: ${L("იკეტება", "closes")}`}
                      onChange={(event) => setDay(key, { ...value, close: event.target.value })}
                      className="premium-input min-h-11 min-w-0 flex-1 px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <label className={labelClass}>
        {L("საკონტაქტო ტელეფონი (საჯაროდ არ ჩანს)", "Contact phone (not shown publicly)")}
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={(event) => onSave(event.timeStamp)}
          disabled={savingProfile || uploading !== null}
          className="premium-button w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {savingProfile ? L("ინახება...", "Saving...") : L("შენახვა", "Save")}
        </button>
        <Link
          href={`/businesses/${businessId}`}
          className="min-h-11 px-2 py-3 text-sm font-semibold text-mint underline underline-offset-4"
        >
          {L("საჯარო გვერდის ნახვა", "View public page")}
        </Link>
      </div>
    </div>
  );
}
