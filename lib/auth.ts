import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export const SIGNUP_CONFIRM_EMAIL_MESSAGE =
  "Account created. Please verify your email before continuing. Check your inbox for the verification email, then sign in again.";

export const SIGNUP_VERIFIED_EMAIL_MESSAGE =
  "Account created. You can sign in now.";

export const VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE =
  "Please verify your email before using ArGadaagdo.";

export const VERIFY_EMAIL_BEFORE_SIGNIN_MESSAGE =
  "Please verify your email before signing in. Check your inbox and spam folder for the confirmation link.";

export type ConfirmedUserResult =
  | { status: "confirmed"; user: User }
  | { status: "signed_out"; user: null }
  | { status: "unverified"; user: User };

export type ConfirmedProfileResult =
  | { status: "confirmed"; user: User; profile: Profile }
  | { status: "missing_profile"; user: User; profile: null }
  | { status: "signed_out"; user: null; profile: null }
  | { status: "unverified"; user: User; profile: null };

let warnedMissingEmailConfirmationFields = false;

export function isEmailConfirmed(user: User | null | undefined) {
  if (!user) return false;

  const hasEmailConfirmedAt = Object.prototype.hasOwnProperty.call(
    user,
    "email_confirmed_at"
  );
  const hasConfirmedAt = Object.prototype.hasOwnProperty.call(
    user,
    "confirmed_at"
  );

  if (
    !hasEmailConfirmedAt &&
    !hasConfirmedAt &&
    !warnedMissingEmailConfirmationFields
  ) {
    warnedMissingEmailConfirmationFields = true;
    console.warn(
      "Supabase user object did not expose email confirmation fields. Treating user as unverified."
    );
  }

  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;
  if (!isEmailConfirmed(user)) return null;

  return getProfileById(user.id);
}

export async function getConfirmedUser(): Promise<ConfirmedUserResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "signed_out", user: null };
  }

  if (!isEmailConfirmed(user)) {
    return { status: "unverified", user };
  }

  return { status: "confirmed", user };
}

export async function getConfirmedProfile(
  retries = 3
): Promise<ConfirmedProfileResult> {
  const authResult = await getConfirmedUser();

  if (authResult.status !== "confirmed") {
    return { ...authResult, profile: null };
  }

  const profile = await getProfileById(authResult.user.id, retries);

  if (!profile) {
    return {
      status: "missing_profile",
      user: authResult.user,
      profile: null,
    };
  }

  return {
    status: "confirmed",
    user: authResult.user,
    profile,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProfileById(userId: string, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        role,
        reliability_score,
        reliability_status,
        no_show_count,
        completed_pickup_count,
        cancelled_order_count
      `)
      .eq("id", userId)
      .maybeSingle();

    if (data) return data as Profile;

    if (error) {
      return null;
    }

    if (attempt < retries) {
      await wait(250 * (attempt + 1));
    }
  }

  return null;
}

export async function getCurrentRole() {
  const profile = await getCurrentProfile();
  return profile?.role || "";
}

export async function logoutUser() {
  await supabase.auth.signOut();
}
