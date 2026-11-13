"use client";

import { PhoneVerification } from "@/components/PhoneVerification";
import Footer from "@/components/Footer";
import { ImpactCard } from "@/components/ImpactCard";
import Navbar from "@/components/Navbar";
import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeProfileScreen } from "@/components/native/screens";
import Notice from "@/components/Notice";
import {
  CheckIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  LogOutIcon,
  PhoneIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
} from "@/components/icons";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileNameEditor from "@/components/profile/ProfileNameEditor";
import {
  getConfirmedProfile,
  logoutUser,
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
import { formatGeorgianPhone } from "@/lib/profileFields";
import { loadMyIdentity, type MyIdentity } from "@/lib/profileIdentity";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Name and photo live in public.profiles (see lib/profileIdentity.ts); the
// metadata keeps only the preferred language here. Old metadata display_name
// is a read-only fallback.
type EditableMetadata = {
  display_name?: string | null;
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
  const [identity, setIdentity] = useState<MyIdentity | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [preferredLanguage, setPreferredLanguage] =
    useState<Language>(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [completedPickups, setCompletedPickups] = useState(0);
  // Business and admin accounts don't collect boxes: no customer impact block.
  const [isCustomer, setIsCustomer] = useState(true);
  const [isBusiness, setIsBusiness] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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
    setIsCustomer(!profileResult.profile || profileResult.profile.role === "customer");
    setIsBusiness(profileResult.profile?.role === "business");
    setPhoneVerified(
      Boolean(profileResult.user.phone_confirmed_at && profileResult.user.phone)
    );
    void supabase.rpc("phone_verification_required").then(({ data }) => {
      setPhoneRequired(data === true);
    });
    const loadedIdentity = await loadMyIdentity(profileResult.user.id);
    setIdentity(
      loadedIdentity || {
        displayName: "",
        displayNameChangedAt: null,
        avatarPath: null,
      }
    );
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

  // The language saves as soon as it's picked; the name has its own save.
  async function saveLanguage(nextLanguage: Language) {
    if (!user || saving) return;

    const previous = preferredLanguage;
    setPreferredLanguage(nextLanguage);
    setMessage("");
    setSaving(true);

    const currentMetadata = (user.user_metadata || {}) as EditableMetadata;
    const { data, error } = await supabase.auth.updateUser({
      data: { ...currentMetadata, preferred_language: nextLanguage },
    });

    setSaving(false);

    if (error || !data.user) {
      setPreferredLanguage(previous);
      setMessageTone("error");
      setMessage("Account details could not be saved. Please try again.");
      return;
    }

    setUser(data.user);
    setLanguage(nextLanguage);
    notifyAccountUpdated();
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await logoutUser();
    router.replace("/");
    router.refresh();
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
  const metadata = (user?.user_metadata || {}) as EditableMetadata;
  const shownName = identity?.displayName || getMetadataText(metadata, "display_name");

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-2xl gap-4">
          {message && (
            <Notice tone={messageTone}>
              {translateUserMessage(message, language)}
            </Notice>
          )}

          {/* Who you are */}
          <div className="theme-forest relative overflow-hidden rounded-[28px] bg-page p-5 sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_220px_at_100%_0%,rgba(184,230,196,0.2),transparent_65%)]"
            />
            <div className="relative flex items-center gap-4">
              {user && (
                <ProfileAvatar
                  userId={user.id}
                  name={shownName}
                  avatarPath={identity?.avatarPath}
                  isGeorgian={isGeorgian}
                  size={76}
                  onChange={(avatarPath) =>
                    setIdentity((current) => (current ? { ...current, avatarPath } : current))
                  }
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-mint">
                  {isBusiness ? L("ბიზნესის ანგარიში", "Business account") : L("პროფილი", "Profile")}
                </p>
                <h1 className="mt-0.5 break-words text-2xl font-bold leading-tight text-cream sm:text-3xl">
                  {shownName || L("პროფილი", "Profile")}
                </h1>
                {user?.email && <p className="mt-1 truncate text-sm text-body">{user.email}</p>}
              </div>
            </div>
            {phoneVerified && user?.phone && (
              <p className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold text-cream">
                <PhoneIcon className="h-4 w-4 text-mint" strokeWidth={2} />
                {formatGeorgianPhone(user.phone)}
                <CheckIcon
                  className="h-4 w-4 text-mint"
                  strokeWidth={2.6}
                  aria-label={L("დადასტურებულია", "Confirmed")}
                />
              </p>
            )}
          </div>

          {phoneRequired && !phoneVerified && (
            <div className="ui-card rounded-[24px] p-5">
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

          {/* Business shortcuts */}
          {isBusiness && (
            <nav aria-label={L("ბიზნესი", "Business")} className="grid grid-cols-2 gap-3">
              {[
                {
                  href: "/business/dashboard",
                  label: L("ბიზნესის პანელი", "Business panel"),
                  hint: L("დღევანდელი ბოქსი, გაცემა", "Today's box, handover"),
                  Icon: LayoutGridIcon,
                },
                {
                  href: "/business/dashboard#business-profile",
                  label: L("მაღაზიის პროფილი", "Shop profile"),
                  hint: L("ლოგო, მისამართი, საათები", "Logo, address, hours"),
                  Icon: StoreIcon,
                },
                {
                  href: "/business/dashboard#business-departments-section",
                  label: L("თანამშრომლები", "Staff"),
                  hint: L("თანამშრომლის გვერდი (არჩევითი)", "PINs for handover"),
                  Icon: UsersIcon,
                },
                {
                  href: "/support",
                  label: L("დახმარება", "Help"),
                  hint: L("ჩატი და კითხვები", "Chat and questions"),
                  Icon: HelpCircleIcon,
                },
              ].map(({ href, label, hint, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="ui-card flex min-h-28 flex-col justify-between gap-3 rounded-2xl p-4 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-forest text-brand-mint">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span>
                    <span className="block font-bold leading-tight text-cream">{label}</span>
                    <span className="mt-0.5 block text-xs leading-tight text-body">{hint}</span>
                  </span>
                </Link>
              ))}
            </nav>
          )}

          {/* Name and language */}
          <div className="ui-card grid gap-5 rounded-[24px] p-5 sm:p-6">
            <h2 className="text-lg font-bold text-cream">{L("ანგარიში", "Account")}</h2>

            {identity && (
              <ProfileNameEditor
                name={identity.displayName}
                changedAt={identity.displayNameChangedAt}
                isGeorgian={isGeorgian}
                label={L("სახელი", "Name")}
                inputClassName="premium-input p-4 font-semibold"
                buttonClassName="premium-button w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                onSaved={(displayName, displayNameChangedAt) => {
                  setIdentity((current) =>
                    current ? { ...current, displayName, displayNameChangedAt } : current
                  );
                  notifyAccountUpdated();
                }}
              />
            )}

            <div className={labelClass} role="group" aria-label={L("ენა", "Language")}>
              {L("ენა", "Language")}
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-well p-1">
                {supportedLanguages.map((nextLanguage) => {
                  const selected = preferredLanguage === nextLanguage;
                  return (
                    <button
                      key={nextLanguage}
                      type="button"
                      aria-pressed={selected}
                      disabled={saving}
                      onClick={() => {
                        if (!selected) void saveLanguage(nextLanguage);
                      }}
                      className={`min-h-12 rounded-xl px-3 text-[15px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint disabled:opacity-60 ${
                        selected
                          ? "bg-card font-bold text-cream shadow-[0_2px_8px_rgba(11,43,38,0.12)]"
                          : "font-semibold text-body hover:text-cream"
                      }`}
                    >
                      {languageNames[nextLanguage]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {isCustomer && <ImpactCard language={language} bags={completedPickups} subject="you" />}

          {/* Settings and sign out */}
          <div className="ui-card overflow-hidden rounded-[24px]">
            <Link
              href="/settings"
              className="flex min-h-14 items-center gap-3 px-5 text-[15px] font-semibold text-cream transition hover:bg-well"
            >
              <SettingsIcon className="h-5 w-5 text-mint" strokeWidth={1.9} />
              <span className="flex-1">{L("პარამეტრები", "Settings")}</span>
              <ChevronRightIcon className="h-4 w-4 text-muted" strokeWidth={2} />
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="flex min-h-14 w-full items-center gap-3 border-t border-line px-5 text-left text-[15px] font-semibold text-danger transition hover:bg-well disabled:opacity-60"
            >
              <LogOutIcon className="h-5 w-5" strokeWidth={1.9} />
              {signingOut ? L("გასვლა...", "Signing out...") : L("გასვლა", "Sign out")}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default withNativeScreen(ProfilePage, NativeProfileScreen);
