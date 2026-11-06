"use client";

import Notice from "@/components/Notice";
import { LeafIcon } from "@/components/icons";
import { VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE } from "@/lib/auth";
import { businessLoginUrl } from "@/lib/businessArea";
import SignupConsent from "@/components/legal/SignupConsent";
import { translateUserMessage } from "@/lib/messageTranslations";
import { useAuthForm } from "@/lib/useAuthForm";
import NativeTopBar from "./NativeTopBar";

const field =
  "min-h-14 w-full rounded-2xl border border-line bg-well px-4 text-[16px] text-cream placeholder:text-muted focus:border-mint focus:outline-none";
const primary =
  "native-press flex min-h-14 w-full items-center justify-center rounded-2xl bg-mint font-bold text-ink disabled:opacity-60";

// The app's sign-in screen: two clear tabs, one short form, nothing to scroll.
// Same auth code as the website (lib/useAuthForm.ts).
export default function NativeLogin() {
  const form = useAuthForm();
  const { authMode, isGeorgian, language, message, messageTone, submitting } = form;
  const isLogin = authMode === "login";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);

  return (
    <main className="native-main native-main--bare">
      <NativeTopBar title="" fallbackHref="/" />

      <section className="px-5 pb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-ink">
            <LeafIcon className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <p className="font-serif text-2xl font-bold text-cream">
              {isLogin ? L("კეთილი დაბრუნება", "Welcome back") : L("შემოგვიერთდი", "Join ArGadaagdo")}
            </p>
            <p className="text-sm text-body">
              {L("ლანჩ ბოქსები ფასდაკლებით, თბილისში", "Lunch Boxes at a discount in Tbilisi")}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label={L("შესვლა ან რეგისტრაცია", "Sign in or create account")}
          className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-well p-1"
        >
          {(["login", "signup"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={authMode === mode}
              onClick={() => {
                form.setMessage("");
                form.setAuthMode(mode);
              }}
              className={`min-h-12 rounded-xl text-[15px] font-bold ${
                authMode === mode ? "bg-mint text-ink" : "text-body"
              }`}
            >
              {mode === "login" ? L("შესვლა", "Sign in") : L("ანგარიშის შექმნა", "Create account")}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {isLogin && form.redirectMessage && !message && (
            <Notice tone="warning">{translateUserMessage(form.redirectMessage, language)}</Notice>
          )}

          <input
            value={form.email}
            onChange={(event) => form.setEmail(event.target.value)}
            onKeyDown={form.submitOnEnter}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            aria-label={L("ელფოსტა", "Email")}
            placeholder={L("ელფოსტა", "Email")}
            className={field}
          />
          <input
            value={form.password}
            onChange={(event) => form.setPassword(event.target.value)}
            onKeyDown={form.submitOnEnter}
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            aria-label={L("პაროლი", "Password")}
            placeholder={L("პაროლი", "Password")}
            className={field}
          />

          {isLogin ? (
            <button
              type="button"
              onClick={() => {
                form.setMessage("");
                form.setPasswordHelpMode(
                  form.effectivePasswordHelpMode === "forgot" ? "hidden" : "forgot"
                );
              }}
              className="justify-self-end py-1 text-sm font-bold text-mint"
            >
              {L("დაგავიწყდა პაროლი?", "Forgot password?")}
            </button>
          ) : (
            <p className="text-xs leading-5 text-body">
              {L(
                "მინიმუმ 8 სიმბოლო: პატარა და დიდი ლათინური ასო და ციფრი.",
                "At least 8 characters, with a lowercase and an uppercase letter and a number."
              )}
            </p>
          )}

          {isLogin && form.effectivePasswordHelpMode === "forgot" && (
            <div className="rounded-2xl bg-card p-4">
              <p className="text-sm leading-6 text-body">
                {L(
                  "ჩაწერე ელფოსტა ზემოთ და გამოგიგზავნით ბმულს ახალი პაროლისთვის.",
                  "Type your email above and we'll send you a link to choose a new password."
                )}
              </p>
              <button
                type="button"
                onClick={form.requestPasswordReset}
                disabled={submitting}
                className="native-press mt-3 min-h-12 w-full rounded-xl border border-mint font-bold text-mint disabled:opacity-60"
              >
                {L("ბმულის გაგზავნა", "Send link")}
              </button>
            </div>
          )}

          {isLogin && form.effectivePasswordHelpMode === "reset" && (
            <div className="grid gap-3 rounded-2xl bg-card p-4">
              <p className="font-bold text-cream">{L("ახალი პაროლი", "New password")}</p>
              <input
                value={form.newPassword}
                onChange={(event) => form.setNewPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                aria-label={L("ახალი პაროლი", "New password")}
                placeholder={L("ახალი პაროლი", "New password")}
                className={field}
              />
              <input
                value={form.confirmNewPassword}
                onChange={(event) => form.setConfirmNewPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                aria-label={L("გაიმეორე პაროლი", "Repeat password")}
                placeholder={L("გაიმეორე პაროლი", "Repeat password")}
                className={field}
              />
              <button type="button" onClick={form.updatePassword} disabled={submitting} className={primary}>
                {L("პაროლის შეცვლა", "Change password")}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={isLogin ? form.signIn : form.createAccount}
            disabled={submitting}
            className={`${primary} mt-1`}
          >
            {submitting
              ? L("ერთი წამით...", "One moment...")
              : isLogin
              ? L("შესვლა", "Sign in")
              : L("ანგარიშის შექმნა", "Create account")}
          </button>

          {!isLogin && <SignupConsent isGeorgian={isGeorgian} />}

          {message && <Notice tone={messageTone}>{translateUserMessage(message, language)}</Notice>}

          {message === VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE && (
            <button
              type="button"
              onClick={form.resendVerificationEmail}
              disabled={form.resendingVerification || submitting}
              className="min-h-11 text-sm font-bold text-mint underline underline-offset-4 disabled:opacity-60"
            >
              {L("დადასტურების წერილის ხელახლა გაგზავნა", "Resend confirmation email")}
            </button>
          )}

          {!isLogin && (
            <a
              href={`${businessLoginUrl}?tab=signup`}
              className="mt-2 inline-flex min-h-11 items-center justify-center text-sm font-bold text-body"
            >
              {L("ბიზნესისთვის →", "For businesses →")}
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
