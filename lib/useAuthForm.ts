"use client";

import { businessSiteUrl, isBusinessHostname } from "@/lib/businessArea";
import { isNativeApp } from "@/lib/native";
import {
  getProfileById,
  isEmailConfirmed,
  SIGNUP_VERIFIED_EMAIL_MESSAGE,
  VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE,
} from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { TranslationKey } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { TURNSTILE_SITE_KEY } from "@/components/Captcha";
import { DATA_TRANSFER_CONSENT_VERSION } from "@/lib/consents";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

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
  if (
    mode === "reset-password" ||
    mode === "reset" ||
    params.get("type") === "recovery" ||
    hash.includes("type=recovery")
  ) {
    return "reset";
  }

  return "none";
}

// The reset email (supabase/templates/recovery.html) links straight here with
// ?mode=reset&token_hash=…&type=recovery; the page verifies the token itself.
// Older emails go through Supabase's /verify page and arrive already signed
// in (#access_token=…&type=recovery), which detectSessionInUrl handles.
function readRecoveryTokenHash() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  return params.get("type") === "recovery" ? params.get("token_hash") : null;
}

const RECOVERY_LINK_FAILED_MESSAGE =
  "This reset link has expired or was already used. Enter your email to get a new one.";

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
  // Written consent to transfers abroad (PDP Law Art. 37), required to sign up.
  const [transferConsent, setTransferConsent] = useState(false);
  // Turnstile token (components/Captcha.tsx); only used once the site key is set.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  function captchaReady() {
    if (!TURNSTILE_SITE_KEY || captchaToken) return true;
    setMessageTone("warning");
    setMessage("Please wait a moment for the security check, then try again.");
    return false;
  }

  function captchaOptions() {
    return TURNSTILE_SITE_KEY && captchaToken ? { captchaToken } : {};
  }

  function spendCaptcha() {
    // Tokens work once: fetch a fresh one for the next request.
    if (!TURNSTILE_SITE_KEY) return;
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
  }
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
  // Email confirmation by 6-digit code: the address waiting for its code.
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [passwordHelpMode, setPasswordHelpMode] =
    useState<PasswordHelpOverride>("none");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const recoveryTokenHash = useSyncExternalStore(
    subscribeToPasswordHelpModeChanges,
    readRecoveryTokenHash,
    () => null
  );
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const recoveryStarted = useRef(false);
  const recoveryChecking = Boolean(recoveryTokenHash) && !recoveryChecked;

  // Exchanges the emailed token for a session, once, then drops it from the
  // address bar so a reload doesn't try a used token again.
  useEffect(() => {
    if (!recoveryTokenHash || recoveryStarted.current) return;
    recoveryStarted.current = true;

    void supabase.auth
      .verifyOtp({ type: "recovery", token_hash: recoveryTokenHash })
      .then(({ error }) => ({ failed: Boolean(error) }))
      .catch(() => ({ failed: true }))
      .then(({ failed }) => {
        const url = new URL(window.location.href);
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`
        );

        setRecoveryChecked(true);
        if (failed) {
          setPasswordHelpMode("forgot");
          setMessageTone("error");
          setMessage(RECOVERY_LINK_FAILED_MESSAGE);
        }
      });
  }, [recoveryTokenHash]);
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

    if (!transferConsent) {
      setMessage("Please tick the box to agree to the data transfer.");
      return;
    }

    setSubmitting(true);
    setMessage("Creating account...");
    setMessageTone("success");
    setEmail(normalizedEmail);

    if (!captchaReady()) {
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        // handle_new_user stores the consent with the server time.
        data: { role, data_transfer_consent: DATA_TRANSFER_CONSENT_VERSION },
        ...captchaOptions(),
      },
    });
    spendCaptcha();

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

    if (signupUserIsVerified) {
      setMessageTone("success");
      setMessage(SIGNUP_VERIFIED_EMAIL_MESSAGE);
      setAuthMode("login");
      return;
    }

    // The email carries a 6-digit code: ask for it right here.
    openCodeStep(normalizedEmail, true);
  }

  function openCodeStep(address: string, justSent: boolean) {
    setCodeEmail(address);
    setCode("");
    setMessage("");
    setResendAvailableAt(justSent ? Date.now() + 60_000 : 0);
  }

  function leaveCodeStep() {
    setCodeEmail(null);
    setCode("");
    setMessage("");
  }

  async function verifyEmailCode(value = code) {
    const token = value.replace(/\D/g, "");
    if (!codeEmail || token.length !== 6 || verifyingCode) return;

    setVerifyingCode(true);
    setMessage("");
    const { data, error } = await supabase.auth.verifyOtp({
      email: codeEmail,
      token,
      type: "email",
    });

    if (error || !data.user) {
      setVerifyingCode(false);
      setCode("");
      setMessageTone("error");
      setMessage(
        isGeorgian
          ? "კოდი არასწორია ან ვადა გაუვიდა."
          : "That code is wrong or has expired."
      );
      return;
    }

    setVerifyingCode(false);
    setCodeEmail(null);
    setSubmitting(true);
    await finishSignIn(data.user);
  }

  async function resendCode() {
    if (!codeEmail || resendingVerification || Date.now() < resendAvailableAt) return;

    setResendingVerification(true);
    setMessage("");
    if (!captchaReady()) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: codeEmail,
      options: captchaOptions(),
    });
    spendCaptcha();
    setResendingVerification(false);

    if (error) {
      setMessageTone("error");
      setMessage(
        isGeorgian
          ? "კოდი ვერ გაიგზავნა. მოიცადე ცოტა და სცადე ხელახლა."
          : "The code could not be sent. Wait a moment and try again."
      );
      return;
    }

    setResendAvailableAt(Date.now() + 60_000);
    setMessageTone("success");
    setMessage(isGeorgian ? "ახალი კოდი გამოგზავნილია." : "A new code is on its way.");
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

    if (!captchaReady()) {
      setSubmitting(false);
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
      options: captchaOptions(),
    });
    spendCaptcha();

    if (error && /email not confirmed/i.test(error.message)) {
      // Not confirmed yet: the code step, with "resend code" available now.
      setSubmitting(false);
      openCodeStep(normalizedEmail, false);
      return;
    }

    if (error) {
      setSubmitting(false);
      setMessageTone("error");
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    if (!authData.user || !isEmailConfirmed(authData.user)) {
      await supabase.auth.signOut();
      setSubmitting(false);
      openCodeStep(normalizedEmail, false);
      return;
    }

    await finishSignIn(authData.user);
  }

  // After a confirmed sign-in (password or email code): route by role.
  async function finishSignIn(user: User) {
    const authData = { user };

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
      const { data: ownedBusinesses } = await supabase.rpc("get_my_businesses");

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

    if (!captchaReady()) {
      setResendingVerification(false);
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: captchaOptions(),
    });
    spendCaptcha();

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

    if (!captchaReady()) {
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
      ...captchaOptions(),
    });
    spendCaptcha();

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
    if (recoveryChecking || submitting) return;

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
    transferConsent,
    setTransferConsent,
    setCaptchaToken,
    captchaKey,
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
    recoveryChecking,
    createAccount,
    signIn,
    submitOnEnter,
    resendVerificationEmail,
    codeEmail,
    code,
    setCode,
    verifyingCode,
    resendAvailableAt,
    verifyEmailCode,
    resendCode,
    leaveCodeStep,
    requestPasswordReset,
    updatePassword,
  };
}
