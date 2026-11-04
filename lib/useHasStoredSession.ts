import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

function hasStoredSession() {
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      if (/^sb-.*-auth-token$/.test(window.localStorage.key(index) || "")) {
        return true;
      }
    }
  } catch {
    // Blocked site data: treat as signed out.
  }

  return false;
}

function subscribe(onChange: () => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => onChange());
  window.addEventListener("storage", onChange);

  return () => {
    subscription.unsubscribe();
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Whether this browser holds a session. For choosing how a page looks only;
 * it proves nothing about who the user is, so never use it to grant access.
 */
export function useHasStoredSession() {
  return useSyncExternalStore(subscribe, hasStoredSession, () => false);
}
