"use client";

import { businessLoginUrl } from "@/lib/businessArea";
import Navbar from "@/components/Navbar";
import SignupConsent from "@/components/legal/SignupConsent";
import Notice from "@/components/Notice";
import { VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE } from "@/lib/auth";
import { translateUserMessage } from "@/lib/messageTranslations";
import { useAuthForm } from "@/lib/useAuthForm";
import EmailCodeStep from "@/components/EmailCodeStep";
import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeLoginScreen } from "@/components/native/screens";

// Sign in and Create account are two clear tabs. Customer sign-up is the main
// path; businesses have their own area (business.argadaagdo.ge).
function LoginPage() {
  const form = useAuthForm();
  const {
    authMode,
    authModeOptions,
    effectivePasswordHelpMode,
    isBusinessArea,
    isGeorgian,
    language,
    message,
    messageTone,
    redirectMessage,
    submitting,
    t,
  } = form;
  const isLogin = authMode === "login";
  const isResetting = effectivePasswordHelpMode === "reset";

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 py-5 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto grid max-w-md gap-8 md:max-w-6xl md:grid-cols-2 md:items-center">
          {isBusinessArea ? (
            <div className="theme-forest hidden rounded-3xl bg-brand-forest p-12 md:block">
              <p className="premium-badge px-4 py-2">{t("login.business")}</p>
              <h1 className="mt-4 text-6xl font-semibold leading-tight text-cream">
                {t("login.businessTitle")}
              </h1>
              <p className="mt-5 text-lg leading-8 text-body">
                {t("login.forBusinessesText")}
              </p>
            </div>
          ) : (
            <div className="premium-surface hidden rounded-3xl p-12 md:block">
              <p className="premium-badge px-4 py-2">{t("login.title")}</p>
              <p className="mt-4 text-6xl font-semibold leading-tight text-cream">
                ArGadaagdo
              </p>
              <p className="mt-5 text-lg leading-8 text-body">{t("home.subtitle")}</p>
              <div className="premium-card mt-8 rounded-3xl p-5">
                <h3 className="text-xl font-semibold text-cream">{t("login.forCustomers")}</h3>
                <p className="mt-2 text-body">{t("login.forCustomersText")}</p>
              </div>
            </div>
          )}

          <div className="premium-card rounded-3xl p-5 sm:p-8 md:p-10">
            {form.codeEmail ? (
              <EmailCodeStep form={form} tone="app" />
            ) : isResetting ? (
              // From the reset email: only the new password, nothing to mix up.
              <div className="grid gap-3">
                <h1 className="text-2xl font-semibold text-cream sm:text-3xl">
                  {isGeorgian ? "აირჩიე ახალი პაროლი" : "Choose a new password"}
                </h1>
                <p className="text-sm leading-6 text-body">
                  {isGeorgian
                    ? "მინიმუმ 8 სიმბოლო: პატარა და დიდი ლათინური ასო და ციფრი."
                    : "At least 8 characters, with a lowercase and an uppercase letter and a number."}
                </p>
                <input
                  value={form.newPassword}
                  onChange={(event) => form.setNewPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  aria-label={isGeorgian ? "ახალი პაროლი" : "New password"}
                  placeholder={isGeorgian ? "ახალი პაროლი" : "New password"}
                  className="premium-input px-4 py-3"
                />
                <input
                  value={form.confirmNewPassword}
                  onChange={(event) => form.setConfirmNewPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void form.updatePassword();
                  }}
                  type="password"
                  autoComplete="new-password"
                  aria-label={isGeorgian ? "გაიმეორე ახალი პაროლი" : "Confirm new password"}
                  placeholder={isGeorgian ? "გაიმეორე ახალი პაროლი" : "Confirm new password"}
                  className="premium-input px-4 py-3"
                />
                <button
                  type="button"
                  onClick={form.updatePassword}
                  disabled={submitting || form.recoveryChecking}
                  className="premium-button cta-glow mt-1 w-full py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
                >
                  {form.recoveryChecking
                    ? isGeorgian
                      ? "ბმული მოწმდება..."
                      : "Checking the link..."
                    : submitting
                    ? isGeorgian
                      ? "ახლდება..."
                      : "Updating..."
                    : isGeorgian
                    ? "პაროლის განახლება"
                    : "Update password"}
                </button>
                {message && (
                  <Notice tone={messageTone}>
                    {translateUserMessage(message, language)}
                  </Notice>
                )}
                <button
                  type="button"
                  onClick={() => {
                    form.setMessage("");
                    form.setPasswordHelpMode("hidden");
                  }}
                  className="min-h-11 text-sm font-semibold text-mint underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                >
                  {isGeorgian ? "შესვლაზე დაბრუნება" : "Back to sign in"}
                </button>
              </div>
            ) : (
              <>
            <div
              role="tablist"
              aria-label={t("login.title")}
              className="grid grid-cols-2 gap-1 rounded-2xl bg-well p-1"
            >
              {authModeOptions.map((option) => {
                const active = authMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      form.setMessage("");
                      form.setAuthMode(option.value);
                    }}
                    className={`min-h-11 rounded-xl px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${
                      active ? "bg-mint text-ink shadow-sm" : "text-body"
                    }`}
                  >
                    {option.value === "signup" && !isBusinessArea
                      ? isGeorgian
                        ? "რეგისტრაცია"
                        : "Create account"
                      : option.label}
                  </button>
                );
              })}
            </div>

            <h1 className="mt-5 text-2xl font-semibold text-cream sm:text-3xl">
              {isLogin ? t("login.signInTitle") : t("login.signUpTitle")}
            </h1>
            {isBusinessArea ? (
              <p className="mt-1 text-sm font-semibold leading-6 text-mint">
                {isGeorgian ? "ბიზნეს ანგარიში" : "Business account"}
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-body">
                {isLogin ? t("login.signInHint") : t("login.signUpHint")}
              </p>
            )}

            <div className="mt-5 grid gap-3">
              {isLogin && redirectMessage && !message && (
                <Notice tone="warning">
                  {translateUserMessage(redirectMessage, language)}
                </Notice>
              )}

              <input
                value={form.email}
                onChange={(event) => form.setEmail(event.target.value)}
                onKeyDown={form.submitOnEnter}
                type="email"
                autoComplete="email"
                aria-label={isGeorgian ? "ელფოსტის მისამართი" : "Email address"}
                placeholder={t("login.email")}
                className="premium-input px-4 py-3"
              />

              <input
                value={form.password}
                onChange={(event) => form.setPassword(event.target.value)}
                onKeyDown={form.submitOnEnter}
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                aria-label={t("login.password")}
                placeholder={t("login.password")}
                className="premium-input px-4 py-3"
              />

              {!isLogin && (
                <p className="-mt-1 text-xs leading-5 text-body">
                  {isGeorgian
                    ? "მინიმუმ 8 სიმბოლო: პატარა და დიდი ლათინური ასო და ციფრი."
                    : "At least 8 characters, with a lowercase and an uppercase letter and a number."}
                </p>
              )}

              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    form.setMessage("");
                    form.setPasswordHelpMode(
                      effectivePasswordHelpMode === "forgot" ? "hidden" : "forgot"
                    );
                  }}
                  className="-mt-1 justify-self-end text-sm font-semibold text-mint underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                >
                  {isGeorgian ? "დაგავიწყდა პაროლი?" : "Forgot password?"}
                </button>
              )}

              {isLogin && effectivePasswordHelpMode === "forgot" && (
                <div className="ui-card rounded-2xl p-4">
                  <p className="text-sm leading-6 text-body">
                    {isGeorgian
                      ? "ჩაწერე ანგარიშის ელფოსტა ზემოთ და გამოგიგზავნით აღდგენის ბმულს."
                      : "Enter your account email above and we'll send you a reset link."}
                  </p>
                  <button
                    type="button"
                    onClick={form.requestPasswordReset}
                    disabled={submitting}
                    className="premium-button mt-3 w-full py-3 disabled:opacity-60"
                  >
                    {submitting
                      ? isGeorgian
                        ? "იგზავნება..."
                        : "Sending..."
                      : isGeorgian
                      ? "აღდგენის ბმულის გაგზავნა"
                      : "Send reset link"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={isLogin ? form.signIn : form.createAccount}
                disabled={submitting}
                className="premium-button cta-glow mt-1 w-full py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
              >
                {isLogin
                  ? t("login.signIn")
                  : isGeorgian
                  ? "ანგარიშის შექმნა"
                  : "Create account"}
              </button>

              {!isLogin && <SignupConsent isGeorgian={isGeorgian} />}

              {message && (
                <Notice tone={messageTone}>
                  {translateUserMessage(message, language)}
                </Notice>
              )}

              {message === VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE && (
                <button
                  type="button"
                  onClick={form.resendVerificationEmail}
                  disabled={form.resendingVerification || submitting}
                  className="min-h-11 text-sm font-semibold text-mint underline underline-offset-4 disabled:opacity-60"
                >
                  {form.resendingVerification
                    ? isGeorgian
                      ? "იგზავნება..."
                      : "Sending..."
                    : isGeorgian
                    ? "დადასტურების წერილის ხელახლა გაგზავნა"
                    : "Resend confirmation email"}
                </button>
              )}

              {!isBusinessArea && (
                <a
                  href={`${businessLoginUrl}?tab=signup`}
                  className="mt-1 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-body underline-offset-4 hover:text-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                >
                  {isGeorgian ? "ბიზნესისთვის →" : "For businesses →"}
                </a>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default withNativeScreen(LoginPage, NativeLoginScreen);
