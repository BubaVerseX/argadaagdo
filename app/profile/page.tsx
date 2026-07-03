"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import {
  getConfirmedProfile,
  isEmailConfirmed,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import {
  isSupportedLanguage,
  languageNames,
  supportedLanguages,
  type Language,
} from "@/lib/i18n";
import { notifyAccountUpdated } from "@/lib/notifications";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { validateTextField } from "@/lib/validation";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type EditableMetadata = {
  display_name?: string | null;
  phone?: string | null;
  preferred_language?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

type ProfileGrowthStats = {
  reservations: number;
  completedPickups: number;
  ratingsGiven: number;
  favoriteBusinesses: number;
  favoriteOffers: number;
};

type FavoriteBusinessRow = {
  offers?: {
    business_id?: number | null;
  } | null;
};

function formatAccountDate(value?: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMetadataText(metadata: EditableMetadata, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "Admin";
  if (role === "business") return "Business";
  return "Customer";
}

export default function ProfilePage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] =
    useState<Language>(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [growthStats, setGrowthStats] = useState<ProfileGrowthStats>({
    reservations: 0,
    completedPickups: 0,
    ratingsGiven: 0,
    favoriteBusinesses: 0,
    favoriteOffers: 0,
  });
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");

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
    setDisplayName(getMetadataText(metadata, "display_name"));
    setPhone(getMetadataText(metadata, "phone"));
    setPreferredLanguage(
      isSupportedLanguage(savedLanguage) ? savedLanguage : language
    );

    const [ordersResult, favoritesResult, ratingsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id, status")
        .eq("user_id", profileResult.user.id)
        .limit(500),
      supabase
        .from("favorites")
        .select("id, offer_id, offers(business_id)")
        .eq("user_id", profileResult.user.id)
        .limit(500),
      supabase
        .from("business_ratings")
        .select("id")
        .eq("user_id", profileResult.user.id)
        .limit(500),
    ]);

    const orderRows = (ordersResult.data || []) as Array<{
      id: number;
      status: string;
    }>;
    const favoriteRows = (favoritesResult.data || []) as FavoriteBusinessRow[];
    const favoriteBusinessIds = new Set(
      favoriteRows
        .map((favorite) => favorite.offers?.business_id)
        .filter((businessId): businessId is number => Boolean(businessId))
    );

    setGrowthStats({
      reservations: ordersResult.error ? 0 : orderRows.length,
      completedPickups: ordersResult.error
        ? 0
        : orderRows.filter((order) =>
            isCollectedOrderStatus(order.status as never)
          ).length,
      ratingsGiven: ratingsResult.error ? 0 : ratingsResult.data?.length || 0,
      favoriteBusinesses: favoritesResult.error ? 0 : favoriteBusinessIds.size,
      favoriteOffers: favoritesResult.error ? 0 : favoriteRows.length,
    });
    setLoading(false);
  }, [language, router]);

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
      label: "Display name",
      value: displayName,
      minLength: 2,
      maxLength: 80,
      required: false,
    });
    const phoneResult = validateTextField({
      label: "Phone number",
      value: phone,
      minLength: 5,
      maxLength: 40,
      required: false,
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
      <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <div className="mx-auto h-72 max-w-5xl animate-pulse rounded-3xl bg-white" />
        </section>
      </main>
    );
  }

  const verified = isEmailConfirmed(user);
  const roleLabel = getRoleLabel(profile?.role);

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              Account
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
              Profile settings
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-green-50 sm:text-lg">
              Manage your personal account details without changing your account
              role or marketplace permissions.
            </p>
          </div>

          {message && (
            <div className="mt-5">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Personal details
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Your account information
              </h2>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-black text-gray-700">
                  Email address
                  <input
                    value={user?.email || ""}
                    disabled
                    className="min-h-12 rounded-2xl border bg-gray-50 p-4 font-semibold text-gray-600"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  Display name
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={80}
                    placeholder="Your name"
                    className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                  <span className="text-xs font-bold text-gray-500">
                    Optional · {displayName.length}/80
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  Phone number
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={40}
                    placeholder="+995 555 123 456"
                    className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                  <span className="text-xs font-bold text-gray-500">
                    Optional · {phone.length}/40
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  Preferred language
                  <select
                    value={preferredLanguage}
                    onChange={(event) => {
                      const nextLanguage = event.target.value;
                      if (isSupportedLanguage(nextLanguage)) {
                        setPreferredLanguage(nextLanguage);
                      }
                    }}
                    className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  >
                    {supportedLanguages.map((nextLanguage) => (
                      <option key={nextLanguage} value={nextLanguage}>
                        {languageNames[nextLanguage]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || !user || !profile}
                className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving account..." : "Save account details"}
              </button>
            </div>

            <aside className="grid gap-6">
              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
                <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                  Account security
                </p>
                <h2 className="mt-2 text-2xl font-black">Security status</h2>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-green-800">
                      Email
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {verified ? "Verified email" : "Email not verified"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F7F6EF] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Account type
                    </p>
                    <p className="mt-1 font-black text-gray-950">{roleLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-600">
                      Roles are managed by ArGadaagdo and cannot be changed here.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F7F6EF] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Created
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {formatAccountDate(user?.created_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F7F6EF] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Last sign-in
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {formatAccountDate(user?.last_sign_in_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
                <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                  Account tools
                </p>
                <h2 className="mt-2 text-2xl font-black">Data controls</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-gray-600">
                  Need a data export or account deletion review? Contact
                  support and we will help with the request.
                </p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href="/contact"
                    className="min-h-12 rounded-full bg-green-700 px-5 py-3 text-center font-black text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                  >
                    Contact support about my data
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-6">
            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Marketplace activity
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Your food rescue stats
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Reservations",
                    value: growthStats.reservations,
                    helper: "All reservations made by this account",
                  },
                  {
                    title: "Completed Pickups",
                    value: growthStats.completedPickups,
                    helper: "Orders collected successfully",
                  },
                  {
                    title: "Ratings Given",
                    value: growthStats.ratingsGiven,
                    helper: "Reviews submitted after pickup",
                  },
                  {
                    title: "Favorite Businesses",
                    value: growthStats.favoriteBusinesses,
                    helper: "Businesses saved through favorite offers",
                  },
                  {
                    title: "Favorite Offers",
                    value: growthStats.favoriteOffers,
                    helper: "Offers saved for later",
                  },
                ].map((stat) => (
                  <div key={stat.title} className="rounded-2xl bg-[#F7F6EF] p-4">
                    <p className="text-sm font-black text-gray-500">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-black text-gray-950">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                      {stat.helper}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black">Need password help?</h2>
            <p className="mt-2 font-semibold leading-7 text-gray-600">
              Use the password reset flow from the sign-in page. We will email a
              secure reset link to your account email.
            </p>
            <Link
              href="/login?mode=forgot-password"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 sm:w-auto"
            >
              Reset password
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
