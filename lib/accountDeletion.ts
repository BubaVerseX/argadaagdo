import { disablePush } from "@/lib/push/client";
import { supabase } from "@/lib/supabase";

// Self-service account deletion, shared by the website (app/settings) and the
// app (components/native/NativeSettings). The server route does the work.

/** The word the person types to confirm: "DELETE" or "წაშლა" (either works). */
export function getDeleteConfirmWord(language: string) {
  return language === "ka" ? "წაშლა" : "DELETE";
}

export function isDeleteConfirmed(text: string) {
  const value = text.trim().normalize("NFC");
  // Upper-case only the Latin word: toUpperCase() turns Georgian letters into
  // Mtavruli capitals ("ᲬᲐᲨᲚᲐ"), so "წაშლა" would never match.
  return value.toUpperCase() === "DELETE" || value === "წაშლა";
}

export type DeleteAccountResult =
  | { status: "deleted" }
  | { status: "signed_out" }
  | { status: "error"; error: string | null };

/** Deletes the signed-in account, then signs out locally. */
/** The password is checked again on the server (check_user_password). */
export async function deleteMyAccount(password: string): Promise<DeleteAccountResult> {
  const { data } = await supabase.auth.getSession();

  if (!data.session?.access_token) return { status: "signed_out" };

  const response = await fetch("/api/account/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirm: true, password }),
  }).catch(() => null);

  if (!response?.ok) {
    const result = await response?.json().catch(() => null);
    return {
      status: "error",
      error:
        typeof result?.error === "string"
          ? result.error
          : response
          ? null
          : "Network problem. Please check your connection and try again.",
    };
  }

  // The account no longer exists; drop the push token and local session too.
  await disablePush({ turnedOff: false });
  await supabase.auth.signOut().catch(() => undefined);
  return { status: "deleted" };
}
