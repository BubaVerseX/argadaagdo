"use client";

import Captcha from "@/components/Captcha";
import Notice from "@/components/Notice";
import SignupConsent from "@/components/legal/SignupConsent";
import { translateUserMessage } from "@/lib/messageTranslations";
import type { useAuthForm } from "@/lib/useAuthForm";
import { useEffect, useRef } from "react";

type AuthForm = ReturnType<typeof useAuthForm>;
type Tone = "web" | "app";

const STYLES: Record<Tone, { field: string; primary: string; switchActive: string }> = {
  web: {
    field: "premium-input px-4 py-3",
    primary:
      "premium-button cta-glow mt-1 w-full py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4",
    switchActive: "bg-card text-cream shadow-sm",
  },
  app: {
    field:
      "min-h-14 w-full rounded-2xl border border-line bg-well px-4 text-[16px] text-cream placeholder:text-muted focus:border-mint focus:outline-none",
    primary:
      "native-press action-pill mt-1 flex min-h-14 w-full items-center justify-center rounded-2xl font-bold disabled:opacity-60",
    switchActive: "bg-card text-cream shadow-sm",
  },
};

/**
 * "With phone / With email" for customers. Hidden unless phone sign-in is
 * switched on (NEXT_PUBLIC_PHONE_SIGNUP) and this is not the business area.
 */
export function SignInMethodSwitch({ form, tone = "web" }: { form: AuthForm; tone?: Tone }) {
  if (!form.phoneSignInAvailable) return null;
  const L = (ka: string, en: string) => (form.isGeorgian ? ka : en);
  const options = [
    { value: "phone" as const, label: L("ტელეფონით", "With phone") },
    { value: "email" as const, label: L("ელფოსტით", "With email") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={L("როგორ შეხვალ", "How to sign in")}
      className="grid grid-cols-2 gap-1 rounded-2xl border border-line p-1"
    >
      {options.map((option) => {
        const active = form.signInMethod === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              form.setMessage("");
              form.setSignInMethod(option.value);
            }}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${
              active ? STYLES[tone].switchActive : "text-body"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Phone number, then the 6-digit SMS code. No password. */
export function PhoneSignIn({ form, tone = "web" }: { form: AuthForm; tone?: Tone }) {
  const L = (ka: string, en: string) => (form.isGeorgian ? ka : en);
  const styles = STYLES[tone];
  const isLogin = form.authMode === "login";
  const codeRef = useRef<HTMLInputElement>(null);
  const waitingForCode = Boolean(form.phoneSentTo);

  useEffect(() => {
    if (waitingForCode) codeRef.current?.focus();
  }, [waitingForCode]);

  const message = form.message ? (
    <Notice tone={form.messageTone}>{translateUserMessage(form.message, form.language)}</Notice>
  ) : null;

  if (waitingForCode) {
    return (
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-body">
          {L("SMS კოდი გამოგიგზავნეთ ნომერზე", "We sent an SMS code to")}{" "}
          <span className="font-semibold text-cream">{form.phoneSentTo}</span>
        </p>
        <input
          ref={codeRef}
          value={form.phoneCode}
          onChange={(event) => {
            const clean = event.target.value.replace(/\D/g, "").slice(0, 6);
            form.setPhoneCode(clean);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void form.verifyPhoneCode();
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          aria-label={L("SMS კოდი", "SMS code")}
          placeholder={L("6-ციფრიანი კოდი", "6-digit code")}
          className={`${styles.field} text-center text-2xl font-semibold tracking-[0.4em]`}
        />
        <button
          type="button"
          onClick={() => void form.verifyPhoneCode()}
          disabled={form.submitting || form.phoneCode.length !== 6}
          className={styles.primary}
        >
          {form.submitting ? L("მოწმდება…", "Checking…") : L("დადასტურება", "Confirm")}
        </button>
        {message}
        <button
          type="button"
          onClick={form.leavePhoneCodeStep}
          className="min-h-11 text-sm font-semibold text-mint underline-offset-4 hover:underline"
        >
          {L("კოდი არ მოვიდა? ნომრის შეცვლა / თავიდან გაგზავნა", "No code? Change number / send again")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-stretch gap-2">
        <span
          className={`${styles.field} flex w-auto shrink-0 items-center font-semibold text-body`}
          aria-hidden="true"
        >
          +995
        </span>
        <input
          value={form.phone}
          onChange={(event) => form.setPhone(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void form.sendPhoneCode();
          }}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-label={L("მობილურის ნომერი", "Mobile number")}
          placeholder="5XX XXX XXX"
          className={`${styles.field} min-w-0 flex-1`}
        />
      </div>
      <p className="-mt-1 text-xs leading-5 text-body">
        {isLogin
          ? L("SMS-ით მოგივა 6-ციფრიანი კოდი. პაროლი არ გჭირდება.", "You'll get a 6-digit code by SMS. No password needed.")
          : L(
              "SMS-ით მოგივა 6-ციფრიანი კოდი. პაროლი არ გჭირდება, შემდეგ აპი დაგიმახსოვრებს.",
              "You'll get a 6-digit code by SMS. No password; the app keeps you signed in."
            )}
      </p>

      {!isLogin && (
        <SignupConsent
          isGeorgian={form.isGeorgian}
          checked={form.transferConsent}
          onChange={form.setTransferConsent}
        />
      )}

      <Captcha onToken={form.setCaptchaToken} resetKey={form.captchaKey} language={form.language} />

      <button
        type="button"
        onClick={() => void form.sendPhoneCode()}
        disabled={form.submitting}
        className={styles.primary}
      >
        {form.submitting ? L("იგზავნება…", "Sending…") : L("კოდის გაგზავნა", "Send code")}
      </button>
      {message}
    </div>
  );
}
