"use client";

import { PhoneVerification } from "@/components/PhoneVerification";
import Footer from "@/components/Footer";
import { ImpactCard } from "@/components/ImpactCard";
import Navbar from "@/components/Navbar";
import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeProfileScreen } from "@/components/native/screens";
import Notice from "@/components/Notice";
import { ChevronRightIcon } from "@/components/icons";
import {
  getConfirmedProfile,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import {
  isSupportedLanguage,
  languageNames,
  supportedLanguages,
  type Language,
} from "@/lib/i18n";
import { translateUserMessage } from "@/lib/messageTranslations";
import { notifyAccountUpdated } from "@/lib/notifications";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { validateTextField } from "@/lib/validation";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type EditableMetadata = {
  display_name?: string | null;
  phone?: string | null;
  preferred_language?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

function getMetadataText(metadata: EditableMetadata, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function ProfilePage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isGeorgian = language === "ka";
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [preferredLanguage, setPreferredLanguage] =
    useState<Language>(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [completedPickups, setCompletedPickups] = useState(0);
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");

  // Read the current language through a ref so switching language in the
  // navbar doesn't re-run loadProfile and wipe unsaved form edits.
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const loadProfile = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (profileResult.status === "signed_out") {
      router.replace("/login?redirect=/profile");
      return;
    }

    if (profileResult.status === "unverified") {
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      setLoading(false);
      return;
    }

    if (profileResult.status !== "confirmed") {
      setMessageTone("warning");
      setMessage(
        "Your account profile is still being prepared. Please refresh in a moment."
      );
      setLoading(false);
      return;
    }

    const metadata = (profileResult.user.user_metadata ||
      {}) as EditableMetadata;
    const savedLanguage = getMetadataText(metadata, "preferred_language");

    setUser(profileResult.user);
    setProfile(profileResult.profile);
    setPhoneVerified(
      Boolean(profileResult.user.phone_confirmed_at && profileResult.user.phone)
    );
    void supabase.rpc("phone_verification_required").then(({ data }) => {
      setPhoneRequired(data === true);
    });
    setDisplayName(getMetadataText(metadata, "display_name"));
    setPhone(getMetadataText(metadata, "phone"));
    setPreferredLanguage(
      isSupportedLanguage(savedLanguage) ? savedLanguage : languageRef.current
    );

    const ordersResult = await supabase
      .from("orders")
      .select("id, status")
      .eq("user_id", profileResult.user.id)
      .limit(500);
    const orderRows = (ordersResult.data || []) as Array<{
      id: number;
      status: string;
    }>;

    setCompletedPickups(
      orderRows.filter((order) => isCollectedOrderStatus(order.status as never))
        .length
    );
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadProfile(), 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadProfile]);

  async function saveProfile() {
    if (!user || !profile || saving) return;

    setMessage("");
    setMessageTone("error");

    const displayNameResult = validateTextField({
      label: isGeorgian ? "საჩვენებელი სახელი" : "Display name",
      value: displayName,
      minLength: 2,
      maxLength: 80,
      required: false,
      language,
    });
    const phoneResult = validateTextField({
      label: isGeorgian ? "ტელეფონის ნომერი" : "Phone number",
      value: phone,
      minLength: 5,
      maxLength: 40,
      required: false,
      language,
    });

    const validationError = displayNameResult.error || phoneResult.error;

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);

    const currentMetadata = (user.user_metadata || {}) as EditableMetadata;
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        display_name: displayNameResult.value || null,
        phone: phoneResult.value || null,
        preferred_language: preferredLanguage,
      },
    });

    setSaving(false);

    if (error || !data.user) {
      setMessageTone("error");
      setMessage("Account details could not be saved. Please try again.");
      return;
    }

    setUser(data.user);
    setDisplayName(displayNameResult.value);
    setPhone(phoneResult.value);
    setLanguage(preferredLanguage);
    setMessageTone("success");
    setMessage("Account details saved.");
    notifyAccountUpdated();
  }

  if (loading) {
    return (
      <main className="app-shell">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <div className="mx-auto h-72 max-w-xl animate-pulse rounded-3xl bg-well" />
        </section>
      </main>
    );
  }

  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const labelClass = "grid gap-1.5 text-sm font-semibold text-body";

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-xl gap-4">
          <h1 className="font-serif text-[1.625rem] font-bold text-cream sm:text-3xl">
            {L("პროფილი", "Profile")}
          </h1>

          {message && (
            <Notice tone={messageTone}>
              {translateUserMessage(message, language)}
            </Notice>
          )}

          <div className="grid gap-4 rounded-[22px] bg-card p-5">
            <p className="truncate text-[15px] text-body">{user?.email}</p>

            {phoneVerified && (
              <p className="text-sm font-semibold text-mint">
                {L("ტელეფონი დადასტურებულია ✓", "Phone confirmed ✓")}{" "}
                {user?.phone ? `+${user.phone}` : ""}
              </p>
            )}

            {phoneRequired && !phoneVerified && (
              <div className="rounded-2xl bg-well p-4">
                <p className="mb-3 font-semibold text-cream">
                  {L("დაადასტურე ტელეფონი შეკვეთამდე", "Confirm your phone before ordering")}
                </p>
                <PhoneVerification
                  onVerified={() => {
                    setPhoneVerified(true);
                    setPhoneRequired(false);
                  }}
                />
              </div>
            )}

            <label className={labelClass}>
              {L("სახელი", "Name")}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
                placeholder={L("არასავალდებულო", "Optional")}
                className="premium-input p-4 font-semibold"
              />
            </label>

            <label className={labelClass}>
              {L("ტელეფონი", "Phone")}
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                maxLength={40}
                placeholder="+995 555 123 456"
                className="premium-input p-4 font-semibold"
              />
            </label>

            <label className={labelClass}>
              {L("ენა", "Language")}
              <select
                value={preferredLanguage}
                onChange={(event) => {
                  const nextLanguage = event.target.value;
                  if (isSupportedLanguage(nextLanguage)) {
                    setPreferredLanguage(nextLanguage);
                  }
                }}
                className="premium-input p-4 font-semibold"
              >
                {supportedLanguages.map((nextLanguage) => (
                  <option key={nextLanguage} value={nextLanguage}>
                    {languageNames[nextLanguage]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || !user || !profile}
              className="premium-button w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? L("ინახება...", "Saving...") : L("შენახვა", "Save")}
            </button>
          </div>

          <ImpactCard language={language} bags={completedPickups} subject="you" />

          <Link
            href="/settings"
            className="flex min-h-[3.25rem] items-center gap-3 rounded-[22px] bg-card px-4 text-[15px] text-cream transition hover:bg-well"
          >
            <span className="flex-1">{L("პარამეტრები", "Settings")}</span>
            <ChevronRightIcon className="h-4 w-4 text-muted" strokeWidth={2} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default withNativeScreen(ProfilePage, NativeProfileScreen);
