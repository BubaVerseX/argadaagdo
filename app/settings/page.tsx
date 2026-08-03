"use client";

import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import {
  getConfirmedProfile,
  isEmailConfirmed,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { getEmailNotificationPlaceholders } from "@/lib/emailNotifications";
import { useLanguage } from "@/lib/useLanguage";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "Admin";
  if (role === "business") return "Business";
  return "Customer";
}

export default function SettingsPage() {
  const router = useRouter();
  useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"warning" | "error">(
    "warning"
  );
  const emailPlaceholders = getEmailNotificationPlaceholders();

  const loadSettings = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (profileResult.status === "signed_out") {
      router.replace("/login?redirect=/settings");
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

    setUser(profileResult.user);
    setProfile(profileResult.profile);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadSettings(), 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadSettings]);

  if (loading) {
    return (
      <main className="app-shell">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <div className="mx-auto h-72 max-w-5xl animate-pulse rounded-3xl bg-[#f4efe4]" />
        </section>
      </main>
    );
  }

  const verified = isEmailConfirmed(user);
  const roleLabel = getRoleLabel(profile?.role);

  const settingsCards = [
    {
      title: "General",
      text: "Manage your basic profile details, phone number and preferred language.",
      action: "Edit profile",
      href: "/profile",
      status: "Available",
    },
    {
      title: "Notifications",
      text: "Transactional emails are configured for account, reservation, pickup and rating events.",
      action: "Review emails",
      href: "#notifications",
      status: "Configured",
    },
    {
      title: "Privacy",
      text: "Review how account, order and support information is used.",
      action: "Privacy page",
      href: "/privacy",
      status: "Available",
    },
    {
      title: "Account",
      text: "Check verification status, role, account creation and last sign-in.",
      action: "View profile",
      href: "/profile",
      status: "Available",
    },
  ];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="premium-badge px-4 py-2">
              Settings
            </p>
            <h1 className="mt-4 text-3xl font-black text-[#2e2a22] sm:text-4xl md:text-5xl">
              Account management
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[#6b6152] sm:text-lg">
              Manage language, profile, notifications and account security from
              one simple place.
            </p>
          </div>

          {message && (
            <div className="mt-5">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {settingsCards.map((card) => (
              <div
                key={card.title}
                className="premium-card rounded-3xl p-5 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#a67c52]">
                      {card.title}
                    </p>
                    <h2 className="mt-2 text-xl font-black text-[#2e2a22]">
                      {card.text}
                    </h2>
                  </div>
                  <span className="w-fit rounded-full bg-[#f4efe4] px-3 py-1 text-xs font-black text-[#a67c52]">
                    {card.status}
                  </span>
                </div>

                <Link
                  href={card.href}
                  className="premium-button mt-5 w-full px-5 py-3 sm:w-auto"
                >
                  {card.action}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                Language
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Choose your language
              </h2>
              <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
                The language switcher updates this device immediately. Saving a
                preferred language to your account is available on the profile
                page.
              </p>
              <div className="mt-5 inline-flex rounded-2xl bg-[#f4efe4] p-3">
                <LanguageSwitcher />
              </div>
            </div>

            <div className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                Account security
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Verification and role
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f4efe4] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#a67c52]">
                    Email status
                  </p>
                  <p className="mt-1 font-black text-[#2e2a22]">
                    {verified ? "Verified email" : "Email not verified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f4efe4] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                    Account role
                  </p>
                  <p className="mt-1 font-black text-[#2e2a22]">{roleLabel}</p>
                </div>

                <div className="rounded-2xl bg-[#f4efe4] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                    Created
                  </p>
                  <p className="mt-1 font-black text-[#2e2a22]">
                    {formatAccountDate(user?.created_at)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f4efe4] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                    Last sign-in
                  </p>
                  <p className="mt-1 font-black text-[#2e2a22]">
                    {formatAccountDate(user?.last_sign_in_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            id="notifications"
            className="soft-raised mt-6 rounded-3xl p-5 sm:mt-8 sm:p-8"
          >
            <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
              Notifications
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Email notifications
            </h2>
            <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
              ArGadaagdo sends important account, reservation, pickup and
              rating emails through the configured transactional email provider.
            </p>

            <div className="mt-6 grid gap-3">
              {emailPlaceholders.map((placeholder) => (
                <div
                  key={placeholder.event}
                  className="rounded-2xl bg-[#f4efe4] p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-[#2e2a22]">
                        {placeholder.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#6b6152]">
                        {placeholder.trigger}
                      </p>
                    </div>
                    <span className="soft-raised w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide text-[#a67c52]">
                      {placeholder.status} · {placeholder.recipient}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#6b6152]">
                    {placeholder.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                Privacy
              </p>
              <h2 className="mt-2 text-2xl font-black">Data controls</h2>
              <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
                For data export or account deletion requests, contact support.
                We review these requests carefully because reservations,
                ratings and business records may need to remain in marketplace
                history.
              </p>
              <div className="mt-5 grid gap-3">
                <Link
                  href="/contact"
                  className="premium-button px-5 py-3 text-center"
                >
                  Contact support about my data
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-red-50 p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-red-700 sm:text-sm">
                Danger Zone
              </p>
              <h2 className="mt-2 text-2xl font-black text-red-950">
                Account deletion request
              </h2>
              <p className="mt-2 font-semibold leading-7 text-red-800">
                Account deletion should be reviewed by support because orders,
                ratings and business records may need to remain for marketplace
                history.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700 sm:w-auto"
              >
                Request account help
              </Link>
            </div>
          </div>

          <div className="mt-6 premium-card rounded-3xl p-5 sm:p-8">
            <h2 className="text-2xl font-black">Password management</h2>
            <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
              Forgot your password? Request a reset link from the sign-in page.
            </p>
            <Link
              href="/login?mode=forgot-password"
              className="mt-5 inline-flex premium-button w-full px-6 py-3 sm:w-auto"
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
