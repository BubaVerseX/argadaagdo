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

function formatAccountDate(value?: string | null, language: Language = "en") {
  if (!value) return language === "ka" ? "მიუწვდომელია" : "Not available";

  return new Intl.DateTimeFormat(language === "ka" ? "ka-GE" : "en", {
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

function getRoleLabel(role?: string | null, language: Language = "en") {
  if (role === "admin") return language === "ka" ? "ადმინი" : "Admin";
  if (role === "business") return language === "ka" ? "ბიზნესი" : "Business";
  return language === "ka" ? "მომხმარებელი" : "Customer";
}

export default function ProfilePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const isGeorgian = language === "ka";
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
    setDisplayName(getMetadataText(metadata, "display_name"));
    setPhone(getMetadataText(metadata, "phone"));
    setPreferredLanguage(
      isSupportedLanguage(savedLanguage) ? savedLanguage : languageRef.current
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
          <div className="mx-auto h-72 max-w-5xl animate-pulse rounded-3xl bg-[#f4efe4]" />
        </section>
      </main>
    );
  }

  const verified = isEmailConfirmed(user);
  const roleLabel = getRoleLabel(profile?.role, language);

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="premium-surface rounded-3xl p-5 sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="premium-badge px-4 py-2">
              {isGeorgian ? "ანგარიში" : "Account"}
            </p>
            <h1 className="mt-4 text-3xl font-black text-[#2e2a22] sm:text-4xl md:text-5xl">
              {isGeorgian ? "პროფილის პარამეტრები" : "Profile settings"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[#6b6152] sm:text-lg">
              {isGeorgian
                ? "მართე ანგარიშის პირადი მონაცემები ისე, რომ ანგარიშის როლი და მარკეტის უფლებები არ შეიცვალოს."
                : "Manage your personal account details without changing your account role or marketplace permissions."}
            </p>
          </div>

          {message && (
            <div className="mt-5">
              <Notice tone={messageTone}>
                {translateUserMessage(message, language)}
              </Notice>
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                {isGeorgian ? "პირადი მონაცემები" : "Personal details"}
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {isGeorgian
                  ? "შენი ანგარიშის ინფორმაცია"
                  : "Your account information"}
              </h2>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-black text-[#6b6152]">
                  {isGeorgian ? "ელფოსტის მისამართი" : "Email address"}
                  <input
                    value={user?.email || ""}
                    disabled
                    className="premium-input p-4 font-semibold opacity-70"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-[#6b6152]">
                  {isGeorgian ? "საჩვენებელი სახელი" : "Display name"}
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={80}
                    placeholder={isGeorgian ? "შენი სახელი" : "Your name"}
                    className="premium-input p-4 font-semibold"
                  />
                  <span className="text-xs font-bold text-[#6b6152]">
                    {isGeorgian ? "არასავალდებულო" : "Optional"} ·{" "}
                    {displayName.length}/80
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-black text-[#6b6152]">
                  {isGeorgian ? "ტელეფონის ნომერი" : "Phone number"}
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    type="tel"
                    inputMode="tel"
                    maxLength={40}
                    placeholder="+995 555 123 456"
                    className="premium-input p-4 font-semibold"
                  />
                  <span className="text-xs font-bold text-[#6b6152]">
                    {isGeorgian ? "არასავალდებულო" : "Optional"} ·{" "}
                    {phone.length}/40
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-black text-[#6b6152]">
                  {isGeorgian ? "სასურველი ენა" : "Preferred language"}
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
              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || !user || !profile}
                className="premium-button mt-6 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving
                  ? isGeorgian
                    ? "ანგარიში ინახება..."
                    : "Saving account..."
                  : isGeorgian
                  ? "ანგარიშის მონაცემების შენახვა"
                  : "Save account details"}
              </button>
            </div>

            <aside className="grid gap-6">
              <div className="premium-card rounded-3xl p-5 sm:p-8">
                <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                  {isGeorgian ? "ანგარიშის უსაფრთხოება" : "Account security"}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {isGeorgian ? "უსაფრთხოების სტატუსი" : "Security status"}
                </h2>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-[#f4efe4] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-[#a67c52]">
                      {isGeorgian ? "ელფოსტა" : "Email"}
                    </p>
                    <p className="mt-1 font-black text-[#2e2a22]">
                      {verified
                        ? isGeorgian
                          ? "ელფოსტა დადასტურებულია"
                          : "Verified email"
                        : isGeorgian
                        ? "ელფოსტა დადასტურებული არ არის"
                        : "Email not verified"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f4efe4] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                      {t("login.accountType")}
                    </p>
                    <p className="mt-1 font-black text-[#2e2a22]">{roleLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-[#6b6152]">
                      {isGeorgian
                        ? "როლებს ArGadaagdo მართავს და აქ მათი შეცვლა შეუძლებელია."
                        : "Roles are managed by ArGadaagdo and cannot be changed here."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f4efe4] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                      {isGeorgian ? "შექმნის თარიღი" : "Created"}
                    </p>
                    <p className="mt-1 font-black text-[#2e2a22]">
                      {formatAccountDate(user?.created_at, language)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f4efe4] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                      {isGeorgian ? "ბოლო შესვლა" : "Last sign-in"}
                    </p>
                    <p className="mt-1 font-black text-[#2e2a22]">
                      {formatAccountDate(user?.last_sign_in_at, language)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="premium-card rounded-3xl p-5 sm:p-8">
                <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                  {isGeorgian ? "ანგარიშის ინსტრუმენტები" : "Account tools"}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {isGeorgian ? "მონაცემების მართვა" : "Data controls"}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#6b6152]">
                  {isGeorgian
                    ? "გჭირდება მონაცემების ექსპორტი ან ანგარიშის წაშლის განხილვა? დაუკავშირდი მხარდაჭერას და მოთხოვნაში დაგეხმარებით."
                    : "Need a data export or account deletion review? Contact support and we will help with the request."}
                </p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href="/contact"
                    className="premium-button px-5 py-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
                  >
                    {isGeorgian
                      ? "მხარდაჭერასთან დაკავშირება ჩემი მონაცემების შესახებ"
                      : "Contact support about my data"}
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-6">
            <section className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                {isGeorgian ? "აქტივობა მარკეტზე" : "Marketplace activity"}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {isGeorgian
                  ? "შენი საკვების გადარჩენის სტატისტიკა"
                  : "Your food rescue stats"}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: isGeorgian ? "ჯავშნები" : "Reservations",
                    value: growthStats.reservations,
                    helper: isGeorgian
                      ? "ამ ანგარიშით გაკეთებული ყველა ჯავშანი"
                      : "All reservations made by this account",
                  },
                  {
                    title: isGeorgian
                      ? "დასრულებული წაღებები"
                      : "Completed Pickups",
                    value: growthStats.completedPickups,
                    helper: isGeorgian
                      ? "წარმატებით წაღებული შეკვეთები"
                      : "Orders collected successfully",
                  },
                  {
                    title: isGeorgian ? "გაკეთებული შეფასებები" : "Ratings Given",
                    value: growthStats.ratingsGiven,
                    helper: isGeorgian
                      ? "წაღების შემდეგ გაგზავნილი შეფასებები"
                      : "Reviews submitted after pickup",
                  },
                  {
                    title: isGeorgian ? "რჩეული ბიზნესები" : "Favorite Businesses",
                    value: growthStats.favoriteBusinesses,
                    helper: isGeorgian
                      ? "რჩეული შეთავაზებებით შენახული ბიზნესები"
                      : "Businesses saved through favorite offers",
                  },
                  {
                    title: isGeorgian ? "რჩეული შეთავაზებები" : "Favorite Offers",
                    value: growthStats.favoriteOffers,
                    helper: isGeorgian
                      ? "მოგვიანებისთვის შენახული შეთავაზებები"
                      : "Offers saved for later",
                  },
                ].map((stat) => (
                  <div key={stat.title} className="rounded-2xl bg-[#f4efe4] p-4">
                    <p className="text-sm font-black text-[#6b6152]">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-black text-[#2e2a22]">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6152]">
                      {stat.helper}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 premium-card rounded-3xl p-5 sm:p-8">
            <h2 className="text-2xl font-black">
              {isGeorgian
                ? "პაროლთან დაკავშირებით დახმარება გჭირდება?"
                : "Need password help?"}
            </h2>
            <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
              {isGeorgian
                ? "გამოიყენე პაროლის აღდგენა შესვლის გვერდიდან. ანგარიშის ელფოსტაზე უსაფრთხო აღდგენის ბმულს გამოგიგზავნით."
                : "Use the password reset flow from the sign-in page. We will email a secure reset link to your account email."}
            </p>
            <Link
              href="/login?mode=forgot-password"
              className="mt-5 inline-flex premium-button w-full px-6 py-3 sm:w-auto"
            >
              {isGeorgian ? "პაროლის აღდგენა" : "Reset password"}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
