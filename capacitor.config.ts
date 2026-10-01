import type { CapacitorConfig } from '@capacitor/cli';

// ArGadaagdo is a full server-rendered Next.js app (Supabase auth, API
// routes, payments) — it can't be statically exported, so this wraps the
// live deployed site instead of bundling local web assets. `webDir` still
// has to point at an existing folder (native-shell/index.html) — Capacitor
// only shows it briefly before handing off to `server.url`.
//
// Re-verified 2026-09-24: `argadaagdo.ge` is NOT yet registered under the
// Vercel account (`vercel domains ls` shows only blackseacomplex.ge and
// tryourcoach.app — argadaagdo.ge isn't there) and doesn't resolve
// (`dig argadaagdo.ge` returns nothing). `argadaagdo-silk.vercel.app` is
// confirmed the current production URL (`vercel project ls`, HTTP 200) and
// is correctly what this still points at. native-shell/offline.html hard-codes
// the same URL for its "Try again" button — update both on domain day.
//
// TODO once the custom domain is purchased and live: update `server.url`
// to the new domain instead of the Vercel preview URL below, then
// regenerate this config, rebuild, and resubmit — app binaries hardcode
// this URL at build time, native updates require a new store submission
// (unlike the web app, which redeploys instantly).
const config: CapacitorConfig = {
  appId: 'com.argadaagdo.app',
  appName: 'ArGadaagdo',
  webDir: 'native-shell',
  // Same beige as the site, so launching doesn't flash white (or black in
  // dark mode) before the remote page paints.
  backgroundColor: '#ece4d6',
  server: {
    url: 'https://argadaagdo-silk.vercel.app',
    androidScheme: 'https',
    // Shown when the remote site can't load (no network at launch, server
    // error) instead of a blank screen or the browser's error page.
    errorPath: 'offline.html',
  },
  plugins: {
    SystemBars: {
      // Dark status-bar icons on the light beige app (Android; iOS follows
      // UIUserInterfaceStyle=Light in Info.plist).
      style: 'LIGHT',
    },
  },
};

export default config;
