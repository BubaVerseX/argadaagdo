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
import {
  getEmailNotificationPlaceholders,
  type EmailNotificationPlaceholder,
} from "@/lib/emailNotifications";
import type { Language } from "@/lib/i18n";
import { translateUserMessage } from "@/lib/messageTranslations";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

function getRoleLabel(role?: string | null, language: Language = "en") {
  if (role === "admin") return language === "ka" ? "ადმინი" : "Admin";
  if (role === "business") return language === "ka" ? "ბიზნესი" : "Business";
  return language === "ka" ? "მომხმარებელი" : "Customer";
}

// Georgian display text for the email notification list. The English text
// comes from lib/emailNotifications.ts.
const georgianEmailPlaceholderCopy: Partial<
  Record<
    EmailNotificationPlaceholder["event"],
    { title: string; trigger: string; note: string }
  >
> = {
  account_verification: {
    title: "ანგარიშის დადასტურება",
    trigger: "ანგარიშის შექმნისას ან დადასტურების ბმულის ხელახლა მოთხოვნისას",
    note: "შეიცავს ბმულს, რომლითაც ელფოსტას დაადასტურებ.",
  },
  password_reset: {
    title: "პაროლის აღდგენა",
    trigger: "როცა შესვლის გვერდზე „დაგავიწყდა პაროლი?“ აირჩევ",
    note: "შეიცავს უსაფრთხო ბმულს ახალი პაროლის დასაყენებლად.",
  },
  business_approved: {
    title: "ბიზნესი დამტკიცდა",
    trigger: "როცა ჩვენი გუნდი ბიზნესის განაცხადს დაამტკიცებს",
    note: "მფლობელს აცნობებს, რომ შეთავაზებების გამოქვეყნება შეუძლია.",
  },
  reservation_confirmed: {
    title: "ჯავშანი დადასტურდა",
    trigger: "როცა გადახდა დადასტურდება",
    note: "შეიცავს ჯავშნის დეტალებს. წაღების კოდი შეკვეთებშია.",
  },
  reservation_cancelled: {
    title: "ჯავშანი გაუქმდა",
    trigger: "როცა ჯავშანს ვადამდე გააუქმებ",
    note: "ადასტურებს გაუქმებას და თანხის დაბრუნებას.",
  },
  pickup_reminder: {
    title: "წაღების შეხსენება",
    trigger: "წაღების დღეს, დილით",
    note: "გახსენებს წაღების დროსა და ადგილს.",
  },
  pickup_completed: {
    title: "წაღება დასრულდა",
    trigger: "როცა ბიზნესი წაღებას დაადასტურებს",
    note: "ადასტურებს, რომ შეკვეთა წაიღე.",
  },
  rating_reminder: {
    title: "შეფასების შეხსენება",
    trigger: "წაღების შემდეგ",
    note: "გთავაზობს ბიზნესის შეფასებას.",
  },
};

// Who receives each email (the internal sending channel isn't shown).
const englishEmailRecipientLabels: Record<
  EmailNotificationPlaceholder["recipient"],
  string
> = {
  customer: "To customers",
  business: "To businesses",
  admin: "To admins",
};

const georgianEmailRecipientLabels: Record<
  EmailNotificationPlaceholder["recipient"],
  string
> = {
  customer: "მომხმარებლებს",
  business: "ბიზნესებს",
  admin: "ადმინებს",
};

export default function SettingsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"warning" | "error">(
    "warning"
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const emailPlaceholders = getEmailNotificationPlaceholders();
  const deleteConfirmWord = isGeorgian ? "წაშლა" : "DELETE";
  const deleteConfirmed =
    deleteConfirmText.trim().toUpperCase() === deleteConfirmWord.toUpperCase();

  async function deleteAccount() {
    if (!deleteConfirmed || deletingAccount) return;

    setDeletingAccount(true);
    setDeleteError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setDeletingAccount(false);
      router.replace("/login?redirect=/settings");
      return;
    }

    let response: Response;

    try {
      response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: true }),
      });
    } catch {
      setDeletingAccount(false);
      setDeleteError("Network problem. Please check your connection and try again.");
      return;
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setDeletingAccount(false);
      setDeleteError(
        typeof result?.error === "string"
          ? result.error
          : "Your account could not be deleted. Please try again or contact support."
      );
      return;
    }

    // The account no longer exists; drop the local session too.
    await supabase.auth.signOut().catch(() => undefined);
    router.replace("/?account=deleted");
  }

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
          <div className="mx-auto h-72 max-w-5xl animate-pulse rounded-3xl bg-well" />
        </section>
      </main>
    );
  }

  const verified = isEmailConfirmed(user);
  const roleLabel = getRoleLabel(profile?.role, language);
  const availableLabel = isGeorgian ? "ხელმისაწვდომია" : "Available";

  const settingsCards = [
    {
      title: isGeorgian ? "ზოგადი" : "General",
      text: isGeorgian
        ? "მართე პროფილის ძირითადი მონაცემები, ტელეფონის ნომერი და სასურველი ენა."
        : "Manage your basic profile details, phone number and preferred language.",
      action: isGeorgian ? "პროფილის რედაქტირება" : "Edit profile",
      href: "/profile",
      status: availableLabel,
    },
    {
      title: isGeorgian ? "შეტყობინებები" : "Notifications",
      text: isGeorgian
        ? "ტრანზაქციული წერილები გამართულია ანგარიშის, ჯავშნის, წაღებისა და შეფასების მოვლენებისთვის."
        : "Transactional emails are configured for account, reservation, pickup and rating events.",
      action: isGeorgian ? "წერილების ნახვა" : "Review emails",
      href: "#notifications",
      status: isGeorgian ? "გამართულია" : "Configured",
    },
    {
      title: isGeorgian ? "კონფიდენციალურობა" : "Privacy",
      text: isGeorgian
        ? "ნახე, როგორ გამოიყენება ანგარიშის, შეკვეთებისა და მხარდაჭერის ინფორმაცია."
        : "Review how account, order and support information is used.",
      action: isGeorgian ? "კონფიდენციალურობის გვერდი" : "Privacy page",
      href: "/privacy",
      status: availableLabel,
    },
    {
      title: isGeorgian ? "ანგარიში" : "Account",
      text: isGeorgian
        ? "შეამოწმე დადასტურების სტატუსი, როლი, ანგარიშის შექმნის თარიღი და ბოლო შესვლა."
        : "Check verification status, role, account creation and last sign-in.",
      action: isGeorgian ? "პროფილის ნახვა" : "View profile",
      href: "/profile",
      status: availableLabel,
    },
  ];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-3xl sm:p-8 md:rounded-3xl md:p-12">
            <p className="premium-badge px-4 py-2">
              {isGeorgian ? "პარამეტრები" : "Settings"}
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl md:text-5xl">
              {isGeorgian ? "ანგარიშის მართვა" : "Account management"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-body sm:text-lg">
              {isGeorgian
                ? "მართე ენა, პროფილი, შეტყობინებები და ანგარიშის უსაფრთხოება ერთი მარტივი ადგილიდან."
                : "Manage language, profile, notifications and account security from one simple place."}
            </p>
          </div>

          {message && (
            <div className="mt-5">
              <Notice tone={messageTone}>
                {translateUserMessage(message, language)}
              </Notice>
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
                    <p className="text-xs font-semibold uppercase tracking-widest text-mint">
                      {card.title}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-cream">
                      {card.text}
                    </h2>
                  </div>
                  <span className="w-fit rounded-full bg-well px-3 py-1 text-xs font-semibold text-mint">
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
              <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
                {isGeorgian ? "ენა" : "Language"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {isGeorgian ? "აირჩიე ენა" : "Choose your language"}
              </h2>
              <p className="mt-2 leading-7 text-body">
                {isGeorgian
                  ? "ენის გადამრთველი ამ მოწყობილობაზე ენას მაშინვე ცვლის. სასურველი ენის ანგარიშში შენახვა პროფილის გვერდზეა შესაძლებელი."
                  : "The language switcher updates this device immediately. Saving a preferred language to your account is available on the profile page."}
              </p>
              <div className="mt-5 inline-flex rounded-2xl bg-well p-3">
                <LanguageSwitcher />
              </div>
            </div>

            <div className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
                {isGeorgian ? "ანგარიშის უსაფრთხოება" : "Account security"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {isGeorgian ? "დადასტურება და როლი" : "Verification and role"}
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-well p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mint">
                    {isGeorgian ? "ელფოსტის სტატუსი" : "Email status"}
                  </p>
                  <p className="mt-1 font-semibold text-cream">
                    {verified
                      ? isGeorgian
                        ? "ელფოსტა დადასტურებულია"
                        : "Verified email"
                      : isGeorgian
                      ? "ელფოსტა დადასტურებული არ არის"
                      : "Email not verified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-well p-4">
                  <p className="text-xs uppercase tracking-wide text-body">
                    {isGeorgian ? "ანგარიშის როლი" : "Account role"}
                  </p>
                  <p className="mt-1 font-semibold text-cream">{roleLabel}</p>
                </div>

                <div className="rounded-2xl bg-well p-4">
                  <p className="text-xs uppercase tracking-wide text-body">
                    {isGeorgian ? "შექმნის თარიღი" : "Created"}
                  </p>
                  <p className="mt-1 font-semibold text-cream">
                    {formatAccountDate(user?.created_at, language)}
                  </p>
                </div>

                <div className="rounded-2xl bg-well p-4">
                  <p className="text-xs uppercase tracking-wide text-body">
                    {isGeorgian ? "ბოლო შესვლა" : "Last sign-in"}
                  </p>
                  <p className="mt-1 font-semibold text-cream">
                    {formatAccountDate(user?.last_sign_in_at, language)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            id="notifications"
            className="ui-card mt-6 rounded-3xl p-5 sm:mt-8 sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {isGeorgian ? "შეტყობინებები" : "Notifications"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {isGeorgian ? "ელფოსტის შეტყობინებები" : "Email notifications"}
            </h2>
            <p className="mt-2 leading-7 text-body">
              {isGeorgian
                ? "არ გადააგდო ელფოსტით გატყობინებს ანგარიშის, ჯავშნების, წაღებისა და შეფასებების შესახებ."
                : "ArGadaagdo emails you about your account, reservations, pickups and ratings."}
            </p>

            <div className="mt-6 grid gap-3">
              {emailPlaceholders.map((placeholder) => {
                const georgianCopy = isGeorgian
                  ? georgianEmailPlaceholderCopy[placeholder.event]
                  : undefined;

                return (
                  <div
                    key={placeholder.event}
                    className="rounded-2xl bg-well p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-cream">
                          {georgianCopy?.title ?? placeholder.title}
                        </p>
                        <p className="mt-1 text-sm text-body">
                          {georgianCopy?.trigger ?? placeholder.trigger}
                        </p>
                      </div>
                      <span className="ui-card w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mint">
                        {isGeorgian
                          ? georgianEmailRecipientLabels[placeholder.recipient]
                          : englishEmailRecipientLabels[placeholder.recipient]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-body">
                      {georgianCopy?.note ?? placeholder.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="premium-card rounded-3xl p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
                {isGeorgian ? "კონფიდენციალურობა" : "Privacy"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {isGeorgian ? "მონაცემების მართვა" : "Data controls"}
              </h2>
              <p className="mt-2 leading-7 text-body">
                {isGeorgian
                  ? "მონაცემების ექსპორტისთვის ან სხვა კითხვებისთვის დაუკავშირდი მხარდაჭერას."
                  : "For a copy of your data or any other privacy question, contact support."}
              </p>
              <div className="mt-5 grid gap-3">
                <Link
                  href="/contact"
                  className="premium-button px-5 py-3 text-center"
                >
                  {isGeorgian
                    ? "მხარდაჭერასთან დაკავშირება ჩემი მონაცემების შესახებ"
                    : "Contact support about my data"}
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-danger-soft p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-danger sm:text-sm">
                {isGeorgian ? "საშიში ზონა" : "Danger Zone"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-danger">
                {isGeorgian ? "ანგარიშის წაშლა" : "Delete account"}
              </h2>
              <p className="mt-2 font-semibold leading-7 text-danger">
                {isGeorgian
                  ? "ანგარიში, ელფოსტა და რჩეულები სამუდამოდ წაიშლება. შეკვეთებისა და გადახდების ჩანაწერები ბუღალტრული აღრიცხვისთვის რჩება, მაგრამ შენთან აღარ იქნება დაკავშირებული. ბიზნესის ანგარიშის წაშლისას ბიზნესი და მისი შეთავაზებები დაიმალება."
                  : "Your account, email and favorites are permanently deleted. Order and payment records are kept for accounting, but no longer linked to you. Deleting a business account also hides the business and its offers."}
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteError("");
                  }}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-danger-solid px-6 py-3 font-semibold text-cream transition hover:bg-danger-solid sm:w-auto"
                >
                  {isGeorgian ? "ჩემი ანგარიშის წაშლა" : "Delete my account"}
                </button>
              ) : (
                <div className="mt-5 grid gap-3">
                  <label
                    htmlFor="delete-account-confirm"
                    className="font-semibold leading-6 text-danger"
                  >
                    {isGeorgian
                      ? `დასადასტურებლად ჩაწერე „${deleteConfirmWord}“. ამის გაუქმება შეუძლებელია.`
                      : `Type ${deleteConfirmWord} to confirm. This can't be undone.`}
                  </label>
                  <input
                    id="delete-account-confirm"
                    value={deleteConfirmText}
                    onChange={(event) => setDeleteConfirmText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void deleteAccount();
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    disabled={deletingAccount}
                    className="min-h-12 rounded-2xl border border-danger-line bg-well px-4 font-semibold text-danger outline-none focus:border-danger"
                  />
                  {deleteError && (
                    <p role="alert" className="font-semibold leading-6 text-danger">
                      {translateUserMessage(deleteError, language)}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void deleteAccount()}
                      disabled={!deleteConfirmed || deletingAccount}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-danger-solid px-6 py-3 font-semibold text-cream transition hover:bg-danger-solid disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingAccount
                        ? isGeorgian
                          ? "იშლება..."
                          : "Deleting..."
                        : isGeorgian
                        ? "ანგარიშის სამუდამოდ წაშლა"
                        : "Permanently delete account"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                        setDeleteError("");
                      }}
                      disabled={deletingAccount}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-well px-6 py-3 font-semibold text-danger transition hover:bg-danger-soft"
                    >
                      {isGeorgian ? "გაუქმება" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 premium-card rounded-3xl p-5 sm:p-8">
            <h2 className="text-2xl font-semibold">
              {isGeorgian ? "პაროლის მართვა" : "Password management"}
            </h2>
            <p className="mt-2 leading-7 text-body">
              {isGeorgian
                ? "დაგავიწყდა პაროლი? აღდგენის ბმული მოითხოვე შესვლის გვერდიდან."
                : "Forgot your password? Request a reset link from the sign-in page."}
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
