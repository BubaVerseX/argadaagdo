"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import {
  getProfileById,
  isEmailConfirmed,
  SIGNUP_CONFIRM_EMAIL_MESSAGE,
  VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { TranslationKey } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

function getAuthErrorMessage(message?: string) {
  const normalizedMessage = (message || "").toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please try again.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE;
  }

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("user already registered")
  ) {
    return "This email may already have an account. Try signing in or checking your confirmation email.";
  }

  return "Authentication could not be completed. Please try again.";
}

function subscribeToRedirectChanges() {
  return () => {};
}

function getSafeInternalRedirectPath(value: string | null) {
  if (!value) return null;

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("/")) return null;
  if (trimmedValue.startsWith("//")) return null;
  if (trimmedValue.toLowerCase().startsWith("http://")) return null;
  if (trimmedValue.toLowerCase().startsWith("https://")) return null;

  return trimmedValue;
}

function readRedirectPath() {
  if (typeof window === "undefined") return null;

  const redirectPath = new URLSearchParams(window.location.search).get(
    "redirect"
  );

  return getSafeInternalRedirectPath(redirectPath);
}

function getRedirectMessage(
  path: string | null,
  t: (key: TranslationKey) => string
) {
  if (!path) return "";

  if (path.startsWith("/checkout/")) {
    return t("login.redirectCheckout");
  }

  if (path === "/orders" || path.startsWith("/orders?")) {
    return t("login.redirectOrders");
  }

  if (path === "/favorites" || path.startsWith("/favorites?")) {
    return t("login.redirectFavorites");
  }

  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const redirectPath = useSyncExternalStore(
    subscribeToRedirectChanges,
    readRedirectPath,
    () => null
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [submitting, setSubmitting] = useState(false);

  async function createAccount() {
    setMessage("");
    setMessageTone("error");

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setMessage("Creating account...");
    setMessageTone("success");

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      setSubmitting(false);
      setMessageTone("error");
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    if (data.session) {
      await supabase.auth.signOut();
    }

    setSubmitting(false);
    setMessageTone("success");
    setMessage(SIGNUP_CONFIRM_EMAIL_MESSAGE);
  }

  async function signIn() {
    setMessage("");
    setMessageTone("error");

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (!password.trim()) {
      setMessage("Password is required.");
      return;
    }

    setSubmitting(true);
    setMessage("Signing in...");
    setMessageTone("success");

    const normalizedEmail = email.trim().toLowerCase();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setSubmitting(false);
      setMessageTone("error");
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    if (!authData.user || !isEmailConfirmed(authData.user)) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE);
      return;
    }

    const profile = await getProfileById(authData.user.id, 4);
    const metadataRole = authData.user.user_metadata?.role;
    const resolvedRole =
      profile?.role ||
      (metadataRole === "business" || metadataRole === "customer"
        ? metadataRole
        : "customer");

    setSubmitting(false);

    if (!profile) {
      setMessageTone("warning");
      setMessage(
        "Signed in. Your profile is still being prepared, so dashboard links may appear after a refresh."
      );
    }

    if (redirectPath) {
      router.push(redirectPath);
      router.refresh();
      return;
    }

    if (resolvedRole === "admin") {
      router.push("/admin");
      router.refresh();
      return;
    }

    if (resolvedRole === "business") {
      const { data: ownedBusinesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", authData.user.id)
        .limit(1);

      router.push(
        ownedBusinesses && ownedBusinesses.length > 0
          ? "/business/dashboard"
          : "/business/register"
      );
      router.refresh();
      return;
    }

    router.push("/offers");
    router.refresh();
  }

  const redirectMessage = getRedirectMessage(redirectPath, t);

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-900">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-center">
          <div className="rounded-3xl bg-green-800 p-6 text-white shadow-sm sm:rounded-[2rem] sm:p-8 md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("login.title")}
            </p>

            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
              {t("login.signIn")} · ArGadaagdo
            </h1>

            <p className="mt-4 text-base font-medium leading-7 text-green-50 sm:mt-5 sm:text-lg sm:leading-8">
              {t("home.subtitle")}
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl bg-white/10 p-5">
                <h3 className="text-xl font-black">For customers</h3>
                <p className="mt-2 font-medium text-green-50">
                  Browse discounted food and reserve pickup-only offers.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <h3 className="text-xl font-black">For businesses</h3>
                <p className="mt-2 font-medium text-green-50">
                  Register your business and publish rescue offers.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8 md:p-10">
            <h2 className="text-2xl font-black text-gray-950 sm:text-3xl">
              {authMode === "login"
                ? t("login.signInTitle")
                : t("login.signUpTitle")}
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-gray-600 sm:text-base">
              {authMode === "login"
                ? t("login.signInHint")
                : t("login.signUpHint")}
            </p>

            <div className="mt-6 grid gap-4 sm:gap-5">
              {authMode === "login" && redirectMessage && !message && (
                <Notice tone="warning">{redirectMessage}</Notice>
              )}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                aria-label="Email address"
                placeholder={t("login.email")}
                className="min-h-12 rounded-2xl border bg-white p-4 font-medium outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                aria-label="Password"
                placeholder={t("login.password")}
                className="min-h-12 rounded-2xl border bg-white p-4 font-medium outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />

              {authMode === "signup" && (
                <div>
                  <p className="mb-3 font-black text-gray-800">
                    {t("login.accountType")}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setRole("customer")}
                      className={`rounded-2xl border p-4 text-left font-bold transition focus:outline-none focus:ring-2 focus:ring-green-200 ${
                        role === "customer"
                          ? "border-green-700 bg-green-50 text-green-800"
                          : "bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-2xl">🥡</div>
                      <p className="mt-2">{t("login.customer")}</p>
                      <p className="mt-1 text-sm font-medium leading-5 text-gray-600">
                        {t("login.customerHint")}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("business")}
                      className={`rounded-2xl border p-4 text-left font-bold transition focus:outline-none focus:ring-2 focus:ring-green-200 ${
                        role === "business"
                          ? "border-green-700 bg-green-50 text-green-800"
                          : "bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-2xl">🏪</div>
                      <p className="mt-2">{t("login.business")}</p>
                      <p className="mt-1 text-sm font-medium leading-5 text-gray-600">
                        {t("login.businessHint")}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={authMode === "login" ? signIn : createAccount}
                disabled={submitting}
                className="min-h-12 rounded-full bg-green-700 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
              >
                {authMode === "login" ? t("login.signIn") : t("login.signUp")}
              </button>

              <div className="rounded-2xl bg-[#F7F6EF] px-4 py-3 text-center text-sm font-bold text-gray-700 sm:text-base">
                {authMode === "login"
                  ? t("login.dontHaveAccount")
                  : t("login.alreadyHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setAuthMode(authMode === "login" ? "signup" : "login");
                  }}
                  className="font-black text-green-700 underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  {authMode === "login"
                    ? t("login.signUp")
                    : t("login.signIn")}
                </button>
              </div>

              {message && (
                <Notice tone={messageTone}>{message}</Notice>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
