"use client";

import { businessSiteUrl, isBusinessHostname } from "@/lib/businessArea";
import { isNativeApp } from "@/lib/native";
import {
  getProfileById,
  isEmailConfirmed,
  SIGNUP_CONFIRM_EMAIL_MESSAGE,
  SIGNUP_VERIFIED_EMAIL_MESSAGE,
  VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE,
} from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import type { TranslationKey } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type KeyboardEvent } from "react";

// Sign in, create account, resend confirmation, forgot and reset password.
// Shared by the website's /login page and the app's login screen, so both run
// exactly the same auth code; only the layout differs.

type PasswordHelpMode = "none" | "forgot" | "reset";
type PasswordHelpOverride = PasswordHelpMode | "hidden";

// Same rule as Supabase Auth (min 8, a-z, A-Z, 0-9), so users get the
// message here instead of a generic error from the server.
export function meetsPasswordRule(value: string) {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

// The messages set on this page stay in English in state; the notice
// translates them with translateUserMessage when rendering.
function getAuthErrorMessage(message?: string) {
  const normalizedMessage = (message || "").toLowerCase();

  if (
    normalizedMessage.includes("password should") ||
    normalizedMessage.includes("weak password")
  ) {
    return "Password needs at least 8 characters, with a lowercase letter, an uppercase letter and a number.";
  }

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
  // Browsers treat "\" like "/" and strip tabs/newlines, so "/\evil.com"
  // or "/<tab>/evil.com" would resolve to another origin.
  if (/[\\\u0000-\u001f\u007f]/.test(trimmedValue)) return null;

  try {
    const resolvedUrl = new URL(trimmedValue, window.location.origin);

    if (resolvedUrl.origin !== window.location.origin) return null;

    return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
  } catch {
    return null;
  }
}

function readRedirectPath() {
  if (typeof window === "undefined") return null;

  const redirectPath = new URLSearchParams(window.location.search).get(
    "redirect"
  );

  return getSafeInternalRedirectPath(redirectPath);
}

function subscribeToPasswordHelpModeChanges() {
  return () => {};
}

function readPasswordHelpMode(): PasswordHelpMode {
  if (typeof window === "undefined") return "none";

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const hash = window.location.hash.toLowerCase();

  if (mode === "forgot-password") return "forgot";
  if (mode === "reset-password" || hash.includes("type=recovery")) {
    return "reset";
  }

  return "none";
}

export function getRedirectMessage(
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

  if (path === "/profile" || path === "/settings") {
    return "Please sign in to manage your account settings.";
  }

  return "";
}


// Set after a successful sign-in on this device: returning people land on
// "Sign in", first-timers on "Create account".
export const HAS_SIGNED_IN_KEY = "argadaagdo-has-signed-in";

function readHasSignedInBefore() {
  try {
    return window.localStorage.getItem(HAS_SIGNED_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAuthForm() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";
  const redirectPath = useSyncExternalStore(
    subscribeToRedirectChanges,
    readRedirectPath,
    () => null
  );
  const urlPasswordHelpMode = useSyncExternalStore(
    subscribeToPasswordHelpModeChanges,
    readPasswordHelpMode,
    () => "none"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // No account-type choice: each area creates its own kind of account.
  const isBusinessArea = useSyncExternalStore(
    subscribeToRedirectChanges,
    () =>
      isBusinessHostname(window.location.hostname) ||
      Boolean(readRedirectPath()?.startsWith("/business")),
    () => false
  );
  const role: UserRole = isBusinessArea ? "business" : "customer";
  // Customers start on "Create account" unless they have signed in here
  // before, came from a page that needs an account, or a reset link.
  const prefersSignIn = useSyncExternalStore(
    subscribeToRedirectChanges,
    () =>
      new URLSearchParams(window.location.search).get("tab") !== "signup" &&
      (isBusinessArea ||
      readHasSignedInBefore() ||
      Boolean(readRedirectPath()) ||
      readPasswordHelpMode() !== "none" ||
      new URLSearchParams(window.location.search).get("tab") === "signin"),
    () => true
  );
  const [chosenAuthMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const authMode = chosenAuthMode ?? (prefersSignIn ? "login" : "signup");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [passwordHelpMode, setPasswordHelpMode] =
    useState<PasswordHelpOverride>("none");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const authModeOptions = [
    {
      value: "login" as const,
      label: t("login.signIn"),
      helper: t("login.signInModeHelper"),
    },
    {
      value: "signup" as const,
      label: t("login.signUp"),
      helper: t("login.signUpModeHelper"),
    },
  ];
  const effectivePasswordHelpMode =
    passwordHelpMode === "hidden"
      ? "none"
      : passwordHelpMode === "none"
        ? urlPasswordHelpMode
        : passwordHelpMode;

  async function createAccount() {
    setMessage("");
    setMessageTone("error");

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setMessage("Email is required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (!meetsPasswordRule(password)) {
      setMessage(
        "Password needs at least 8 characters, with a lowercase letter, an uppercase letter and a number."
      );
      return;
    }

    if (password.trim() !== password) {
      setMessage("Password cannot start or end with spaces.");
      return;
    }

    setSubmitting(true);
    setMessage("Creating account...");
    setMessageTone("success");
    setEmail(normalizedEmail);

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

    const signupUserIsVerified = isEmailConfirmed(data.user);

    setSubmitting(false);
    setMessageTone("success");
    setMessage(
      signupUserIsVerified
        ? SIGNUP_VERIFIED_EMAIL_MESSAGE
        : SIGNUP_CONFIRM_EMAIL_MESSAGE
    );

    if (signupUserIsVerified) {
      setAuthMode("login");
    }
  }

  // The page isn't a <form> (it hosts several flows), so Enter in the email
  // or password field didn't submit.
  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || submitting) return;

    event.preventDefault();
    void (authMode === "login" ? signIn() : createAccount());
  }

  async function signIn() {
    setMessage("");
    setMessageTone("error");

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setMessage("Email is required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setMessage("Password is required.");
      return;
    }

    setSubmitting(true);
    setMessage("Signing in...");
    setMessageTone("success");
    setEmail(normalizedEmail);

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

    try {
      window.localStorage.setItem(HAS_SIGNED_IN_KEY, "1");
    } catch {
      // Only chooses the default tab next time.
    }

    const profile = await getProfileById(authData.user.id, 4);
    const metadataRole = authData.user.user_metadata?.role;
    const resolvedRole =
      profile?.role ||
      (metadataRole === "business" || metadataRole === "customer"
        ? metadataRole
        : "customer");

    setSubmitting(false);

    // Each area signs in its own kind of account. Sessions aren't shared
    // between hosts, so the person signs in again on the right one.
    if (isBusinessHostname(window.location.hostname) && resolvedRole === "customer") {
      await supabase.auth.signOut({ scope: "local" });
      setMessageTone("warning");
      setMessage(
        isGeorgian
          ? "ეს მომხმარებლის ანგარიშია. შედი მთავარ საიტზე."
          : "This is a customer account. Please sign in on the main site."
      );
      return;
    }

    if (
      businessSiteUrl &&
      !isBusinessHostname(window.location.hostname) &&
      !isNativeApp() &&
      resolvedRole === "business"
    ) {
      await supabase.auth.signOut({ scope: "local" });
      window.location.assign(`${businessSiteUrl}/login`);
      return;
    }

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

    router.push("/discover");
    router.refresh();
  }

  async function resendVerificationEmail() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessageTone("warning");
      setMessage("Enter your email address first, then request a new verification link.");
      return;
    }

    setResendingVerification(true);
    setMessageTone("success");
    setMessage("Sending verification email...");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
    });

    setResendingVerification(false);

    if (error) {
      setMessageTone("error");
      setMessage(
        "Verification email could not be sent. Please wait a moment and try again."
      );
      return;
    }

    setMessageTone("success");
    setMessage("Verification email sent. Please check your inbox and spam folder.");
  }

  async function requestPasswordReset() {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setMessageTone("warning");
      setMessage("Enter your email address first, then request a reset link.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setMessageTone("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setMessageTone("success");
    setMessage("Sending password reset email...");
    setEmail(normalizedEmail);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?mode=reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );

    setSubmitting(false);

    if (error) {
      setMessageTone("error");
      setMessage("Password reset email could not be sent. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Password reset email sent. Please check your inbox.");
  }

  async function updatePassword() {
    setMessage("");
    setMessageTone("error");

    if (!meetsPasswordRule(newPassword)) {
      setMessage(
        "New password needs at least 8 characters, with a lowercase letter, an uppercase letter and a number."
      );
      return;
    }

    if (newPassword.trim() !== newPassword) {
      setMessage("New password cannot start or end with spaces.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setMessageTone("success");
    setMessage("Updating password...");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSubmitting(false);

    if (error) {
      setMessageTone("error");
      setMessage("Password could not be updated. Please request a new reset link.");
      return;
    }

    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordHelpMode("hidden");
    setMessageTone("success");
    setMessage("Password updated. You can continue using ArGadaagdo.");
  }

  const redirectMessage = getRedirectMessage(redirectPath, t);

  return {
    language,
    isGeorgian,
    t,
    authMode,
    setAuthMode,
    authModeOptions,
    redirectPath,
    redirectMessage,
    email,
    setEmail,
    password,
    setPassword,
    isBusinessArea,
    message,
    setMessage,
    messageTone,
    submitting,
    resendingVerification,
    effectivePasswordHelpMode,
    setPasswordHelpMode,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    createAccount,
    signIn,
    submitOnEnter,
    resendVerificationEmail,
    requestPasswordReset,
    updatePassword,
  };
}
