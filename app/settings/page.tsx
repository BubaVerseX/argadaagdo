"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { ChevronRightIcon } from "@/components/icons";
import {
  deleteMyAccount,
  getDeleteConfirmWord,
  isDeleteConfirmed,
} from "@/lib/accountDeletion";
import {
  getConfirmedProfile,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { translateUserMessage } from "@/lib/messageTranslations";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeSettingsScreen } from "@/components/native/screens";

function SettingsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteConfirmWord = getDeleteConfirmWord(language);
  const [deletePassword, setDeletePassword] = useState("");
  const deleteConfirmed = isDeleteConfirmed(deleteConfirmText) && deletePassword.length > 0;

  async function deleteAccount() {
    if (!deleteConfirmed || deletingAccount) return;

    setDeletingAccount(true);
    setDeleteError("");

    const result = await deleteMyAccount(deletePassword);

    if (result.status === "signed_out") {
      router.replace("/login?redirect=/settings");
      return;
    }

    if (result.status === "error") {
      setDeletingAccount(false);
      setDeleteError(
        translateUserMessage(
          result.error || "Your account could not be deleted. Please try again or contact support.",
          language
        )
      );
      return;
    }

    router.replace("/?account=deleted");
  }

  const loadSettings = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (profileResult.status === "signed_out") {
      router.replace("/login?redirect=/settings");
      return;
    }

    if (profileResult.status === "unverified") {
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
    } else if (profileResult.status !== "confirmed") {
      setMessage(
        "Your account profile is still being prepared. Please refresh in a moment."
      );
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadSettings(), 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadSettings]);

  const rowClass =
    "flex min-h-[3.25rem] items-center gap-3 border-t border-line px-4 text-[15px] text-cream transition first:border-t-0 hover:bg-well";
  const links = [
    { href: "/profile", label: L("პროფილი", "Profile") },
    { href: "/login?mode=forgot-password", label: L("პაროლის აღდგენა", "Reset password") },
    { href: "/privacy", label: L("კონფიდენციალურობა", "Privacy") },
    { href: "/faq", label: L("დახმარება", "Help") },
  ];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-xl gap-4">
          <h1 className="font-serif text-[1.625rem] font-bold text-cream sm:text-3xl">
            {L("პარამეტრები", "Settings")}
          </h1>

          {message && (
            <Notice tone="warning">{translateUserMessage(message, language)}</Notice>
          )}

          {loading ? (
            <div className="h-56 animate-pulse rounded-[22px] bg-well" />
          ) : (
            <>
              <div className="overflow-hidden rounded-[22px] bg-card">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className={rowClass}>
                    <span className="flex-1">{link.label}</span>
                    <ChevronRightIcon className="h-4 w-4 text-muted" strokeWidth={2} />
                  </Link>
                ))}
              </div>

              <div className="rounded-[22px] bg-card p-4">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setDeleteError("");
                    }}
                    className="flex min-h-11 w-full items-center text-left text-[15px] font-semibold text-danger"
                  >
                    {L("ანგარიშის წაშლა", "Delete account")}
                  </button>
                ) : (
                  <div className="grid gap-3">
                    <label
                      htmlFor="delete-account-confirm"
                      className="text-sm leading-6 text-body"
                    >
                      {L(
                        `ანგარიში და პირადი მონაცემები სამუდამოდ წაიშლება. დასადასტურებლად ჩაწერე „${deleteConfirmWord}“.`,
                        `Your account and personal data will be deleted for good. Type ${deleteConfirmWord} to confirm.`
                      )}
                    </label>
                    <input
                      id="delete-account-confirm"
                      value={deleteConfirmText}
                      onChange={(event) => setDeleteConfirmText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void deleteAccount();
                      }}
                      placeholder={deleteConfirmWord}
                      autoComplete="off"
                      autoCapitalize="characters"
                      disabled={deletingAccount}
                      className="min-h-12 rounded-2xl border border-danger-line bg-well px-4 font-semibold text-danger outline-none focus:border-danger"
                    />
                    <input
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void deleteAccount();
                      }}
                      type="password"
                      autoComplete="current-password"
                      aria-label={L("პაროლი", "Password")}
                      placeholder={L("პაროლი", "Password")}
                      disabled={deletingAccount}
                      className="min-h-12 rounded-2xl border border-danger-line bg-well px-4 font-semibold text-cream outline-none focus:border-danger"
                    />
                    {deleteError && (
                      <p role="alert" className="text-sm font-semibold text-danger">
                        {translateUserMessage(deleteError, language)}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void deleteAccount()}
                        disabled={!deleteConfirmed || deletingAccount}
                        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-danger-solid px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingAccount
                          ? L("იშლება...", "Deleting...")
                          : L("სამუდამოდ წაშლა", "Delete for good")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                          setDeleteError("");
                        }}
                        disabled={deletingAccount}
                        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-well px-6 font-semibold text-cream"
                      >
                        {L("გაუქმება", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default withNativeScreen(SettingsPage, NativeSettingsScreen);
