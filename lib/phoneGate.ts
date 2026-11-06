import { supabase } from "@/lib/supabase";

/**
 * True when this account must confirm a phone number by SMS before its next
 * reservation (no confirmed phone yet; App Review demo logins are exempt).
 * The database enforces it on every new order; this only decides whether to
 * show the one-time step first. On any error it returns false and the order
 * itself is still guarded.
 */
export async function needsPhoneVerification() {
  const { data, error } = await supabase.rpc("phone_verification_required");
  return !error && data === true;
}

/** The checkout error the server returns when the phone step was skipped. */
export function isPhoneRequiredError(message?: string | null) {
  return /verify your phone/i.test(message || "");
}
