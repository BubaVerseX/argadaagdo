import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  return getProfileById(user.id);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProfileById(userId: string, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role")
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
