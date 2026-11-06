// Guests can browse the app (Nearby, the map, offer pages) without an account.
// An account is asked for only when they reserve, save a favourite or open
// Orders, Profile or notifications: askForAccount() opens a small sheet
// (components/native/AccountSheet.tsx) with Create account / Sign in, which
// bring them back to `redirect` afterwards.

export const ACCOUNT_NEEDED_EVENT = "argadaagdo:account-needed";

export function askForAccount(redirect: string) {
  window.dispatchEvent(new CustomEvent(ACCOUNT_NEEDED_EVENT, { detail: { redirect } }));
}

// The welcome screen shows on the first app start only.
const WELCOMED_KEY = "argadaagdo-welcomed";

export function hasSeenWelcome() {
  try {
    return localStorage.getItem(WELCOMED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOMED_KEY, "1");
  } catch {
    // Private mode: the welcome may show again, nothing breaks.
  }
}
