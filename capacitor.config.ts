import type { CapacitorConfig } from '@capacitor/cli';

// ArGadaagdo is a full server-rendered Next.js app (Supabase auth, API
// routes, payments) — it can't be statically exported, so this wraps the
// live deployed site instead of bundling local web assets. `webDir` still
// has to point at an existing folder (native-shell/index.html) — Capacitor
// only shows it briefly before handing off to `server.url`.
//
// TODO once the custom domain is purchased and live: update `server.url`
// to the new domain instead of the Vercel preview URL below.
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
