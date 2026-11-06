"use client";

import Notice from "@/components/Notice";
import { ChevronRightIcon, LockIcon, LogOutIcon, MailIcon, TrashIcon } from "@/components/icons";
import {
  deleteMyAccount,
  getDeleteConfirmWord,
  isDeleteConfirmed,
} from "@/lib/accountDeletion";
import { logoutUser } from "@/lib/auth";
import { disablePush } from "@/lib/push/client";
import { supabase } from "@/lib/supabase";
import { meetsPasswordRule } from "@/lib/useAuthForm";
import { translateUserMessage } from "@/lib/messageTranslations";
import { useLanguage } from "@/lib/useLanguage";
import { getLoginRedirectUrl } from "@/lib/orders";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NativeTopBar from "./NativeTopBar";
import PushDebug from "./PushDebug";
import PushToggle from "./PushToggle";

const field =
  "min-h-13 w-full rounded-2xl border border-line bg-well px-4 py-3 text-[16px] text-cream placeholder:text-muted focus:border-mint focus:outline-none";

// Only real settings: account, notifications, sign out, delete account.
// Language lives on the home screen; legal pages in the profile footer.
export default function NativeSettings() {
  const router = useRouter();
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [session, setSession] = useState<Session | null>(null);
  const [panel, setPanel] = useState<"none" | "password" | "delete">("none");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [deleteWord, setDeleteWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const confirmWord = getDeleteConfirmWord(language);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace(getLoginRedirectUrl("/settings"));
        return;
      }
      setSession(data.session);
    });
  }, [router]);

  function toggle(next: "password" | "delete") {
    setNote(null);
    setPanel((current) => (current === next ? "none" : next));
  }

  async function changePassword() {
    if (!currentPassword) {
      setNote({
        tone: "error",
        text: L("ჩაწერე ახლანდელი პაროლი.", "Enter your current password."),
      });
      return;
    }
    if (!meetsPasswordRule(password) || password.trim() !== password) {
      setNote({
        tone: "error",
        text: L(
          "მინიმუმ 8 სიმბოლო: პატარა და დიდი ლათინური ასო და ციფრი.",
          "At least 8 characters, with a lowercase and an uppercase letter and a number."
        ),
      });
      return;
    }
    if (password !== repeat) {
      setNote({ tone: "error", text: L("პაროლები არ ემთხვევა.", "The passwords don't match.") });
      return;
    }

    const email = session?.user.email;
    if (!email) {
      setNote({
        tone: "error",
        text: L(
          "პაროლი ვერ შეიცვალა. სცადე ხელახლა.",
          "The password couldn't be changed. Please try again."
        ),
      });
      return;
    }

    setBusy(true);
    // Supabase doesn't ask for the old password: check it here first.
    const { error: currentError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (currentError) {
      setBusy(false);
      setNote({
        tone: "error",
        text: L("ახლანდელი პაროლი არასწორია.", "Your current password is wrong."),
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setNote({
        tone: "error",
        text: L(
          "პაროლი ვერ შეიცვალა. სცადე ხელახლა.",
          "The password couldn't be changed. Please try again."
        ),
      });
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setRepeat("");
    setPanel("none");
    setNote({ tone: "success", text: L("პაროლი შეიცვალა.", "Password changed.") });
  }

  async function deleteAccount() {
    if (!isDeleteConfirmed(deleteWord) || busy) return;

    setBusy(true);
    setNote(null);
    const result = await deleteMyAccount();

    if (result.status === "signed_out") {
      router.replace(getLoginRedirectUrl("/settings"));
      return;
    }

    if (result.status === "error") {
      setBusy(false);
      setNote({
        tone: "error",
        text: result.error
          ? translateUserMessage(result.error, language)
          : L(
              "ანგარიში ვერ წაიშალა. სცადე ხელახლა ან მოგვწერე.",
              "Your account couldn't be deleted. Please try again or contact support."
            ),
      });
      return;
    }

    router.replace("/?account=deleted");
  }

  async function signOut() {
    await disablePush({ turnedOff: false });
    await logoutUser();
    router.replace("/");
    router.refresh();
  }

  const rowClass =
    "native-press flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left text-[15px] text-cream";
  const label = "px-1 pt-2 text-xs font-medium text-body";

  return (
    <main className="native-main native-main--bare">
      <NativeTopBar title={L("პარამეტრები", "Settings")} />

      <div className="grid gap-2 px-5 pb-8">
        {note && <Notice tone={note.tone}>{note.text}</Notice>}

        <h2 className={label}>{L("ანგარიში", "Account")}</h2>
        <section className="overflow-hidden rounded-[22px] bg-card">
          <p className="flex min-h-[3.25rem] items-center gap-3 px-4 text-[15px] text-cream">
            <MailIcon className="h-[18px] w-[18px] shrink-0 text-sage" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate">
              {session?.user.email || <span className="native-skeleton inline-block h-4 w-40 rounded" />}
            </span>
          </p>
          <button
            type="button"
            onClick={() => toggle("password")}
            aria-expanded={panel === "password"}
            className={`${rowClass} border-t border-line`}
          >
            <LockIcon className="h-[18px] w-[18px] shrink-0 text-sage" strokeWidth={1.8} />
            <span className="flex-1">{L("პაროლის შეცვლა", "Change password")}</span>
            <ChevronRightIcon
              className={`h-4 w-4 text-muted transition-transform ${panel === "password" ? "rotate-90" : ""}`}
              strokeWidth={2}
            />
          </button>
          {panel === "password" && (
            <div className="grid gap-3 border-t border-line p-4">
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={L("ახლანდელი პაროლი", "Current password")}
                aria-label={L("ახლანდელი პაროლი", "Current password")}
                className={field}
              />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={L("ახალი პაროლი", "New password")}
                aria-label={L("ახალი პაროლი", "New password")}
                className={field}
              />
              <input
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(event) => setRepeat(event.target.value)}
                placeholder={L("გაიმეორე პაროლი", "Repeat password")}
                aria-label={L("გაიმეორე პაროლი", "Repeat password")}
                className={field}
              />
              <button
                type="button"
                onClick={() => void changePassword()}
                disabled={busy}
                className="native-press min-h-11 rounded-2xl bg-brand-forest text-sm font-semibold text-brand-ground disabled:opacity-60"
              >
                {L("შენახვა", "Save")}
              </button>
            </div>
          )}
        </section>

        <PushToggle heading={L("შეტყობინებები", "Notifications")} />

        <div className="h-2" aria-hidden="true" />
        <section className="overflow-hidden rounded-[22px] bg-card">
          <button type="button" onClick={() => void signOut()} className={rowClass}>
            <LogOutIcon className="h-[18px] w-[18px] shrink-0 text-sage" strokeWidth={1.8} />
            <span className="flex-1">{L("გასვლა", "Sign out")}</span>
          </button>
          <button
            type="button"
            onClick={() => toggle("delete")}
            aria-expanded={panel === "delete"}
            className={`${rowClass} border-t border-line text-danger`}
          >
            <TrashIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            <span className="flex-1">{L("ანგარიშის წაშლა", "Delete account")}</span>
          </button>
          {panel === "delete" && (
            <div className="grid gap-3 border-t border-line p-4">
              <p className="text-sm leading-6 text-body">
                {L(
                  "ანგარიში და პირადი მონაცემები სამუდამოდ წაიშლება. აქტიური ჯავშნის შემთხვევაში ჯერ ის დაასრულე ან გააუქმე.",
                  "Your account and personal data will be deleted for good. If you have an active reservation, finish or cancel it first."
                )}{" "}
                {L(`დასადასტურებლად ჩაწერე „${confirmWord}“.`, `Type "${confirmWord}" to confirm.`)}
              </p>
              <input
                value={deleteWord}
                onChange={(event) => setDeleteWord(event.target.value)}
                aria-label={L("დადასტურება", "Confirmation")}
                placeholder={confirmWord}
                autoCapitalize="characters"
                className={field}
              />
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={busy || !isDeleteConfirmed(deleteWord)}
                className="native-press min-h-11 rounded-2xl bg-danger-solid text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? L("იშლება...", "Deleting...") : L("სამუდამოდ წაშლა", "Delete for good")}
              </button>
            </div>
          )}
        </section>

        <PushDebug />
      </div>
    </main>
  );
}
