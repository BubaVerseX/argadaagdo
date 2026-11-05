import type { CapacitorConfig } from '@capacitor/cli';

// ArGadaagdo is a full server-rendered Next.js app (Supabase auth, API
// routes, payments) — it can't be statically exported, so this wraps the
// live deployed site instead of bundling local web assets. `webDir` still
// has to point at an existing folder (native-shell/index.html) — Capacitor
// only shows it briefly before handing off to `server.url`.
//
// App binaries hardcode `server.url` at build time, so changing it needs a new
// store submission (the web app redeploys instantly). Builds up to 1.0.0 load
// the old Vercel address: keep it serving the app and never redirect it to
// argadaagdo.ge. The app treats any other host as external, so a redirect
// would open the browser at launch and leave those builds blank.
// native-shell/offline.html hard-codes the same URL for its "Try again" button.
const config: CapacitorConfig = {
  appId: 'com.argadaagdo.app',
  appName: 'ArGadaagdo',
  webDir: 'native-shell',
  // Same deep green as the site, so launching doesn't flash white before
  // the remote page paints.
  backgroundColor: '#051f20',
  server: {
    url: 'https://argadaagdo.ge',
    androidScheme: 'https',
    // Shown when the remote site can't load (no network at launch, server
    // error) instead of a blank screen or the browser's error page.
    errorPath: 'offline.html',
  },
  plugins: {
    SystemBars: {
      // Light status-bar icons on the dark green app (Android; iOS follows
      // UIUserInterfaceStyle=Dark in Info.plist).
      style: 'DARK',
    },
  },
};

export default config;
