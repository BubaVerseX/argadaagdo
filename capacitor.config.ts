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
// is correctly what this still points at.
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
  server: {
    url: 'https://argadaagdo-silk.vercel.app',
    androidScheme: 'https',
  },
};

export default config;
