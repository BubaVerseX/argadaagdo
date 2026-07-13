# App Store Packaging (Capacitor)

This documents the state of native app packaging: what's done, what's
deliberately left for a machine with real iOS/Android tooling, and the exact
steps to finish it there. It complements the PWA work (service worker,
install prompt, `/offline` fallback) which ships as part of the regular web
app and needs none of this.

## Why "wrap", not "rewrite"

ArGadaagdo is a full server-rendered Next.js app — Supabase auth, live API
routes, payments — not a static site. It can't be `next export`-ed to plain
HTML/JS, so the native shells don't bundle local web assets. Instead,
[Capacitor](https://capacitorjs.com) is configured in **remote URL mode**:
the iOS/Android apps are a thin native wrapper (real app icon, splash
screen, native APIs if ever needed) that loads the live deployed site
directly. `capacitor.config.ts`'s `server.url` points at
`https://argadaagdo-silk.vercel.app`.

**Update `server.url` to the real domain once it's purchased and live**,
then run `npx cap sync` again before the next native build.

## What's done (this machine — scaffolding only)

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
  installed as dev dependencies.
- `capacitor.config.ts` — app id `com.argadaagdo.app`, app name
  "ArGadaagdo", `server.url` set to the production URL.
- `native-shell/` — a minimal placeholder `index.html` Capacitor requires to
  exist locally even in remote-URL mode (shown for an instant before
  `server.url` takes over).
- `ios/` and `android/` — full native project scaffolding generated via
  `npx cap add ios` / `npx cap add android`, each with Capacitor's own
  `.gitignore` (excludes `Pods/`, `build/`, `local.properties`, etc. — none
  of that is committed).

## What could NOT be done here, and why

This machine only has **Xcode Command Line Tools**, not full Xcode, and has
**no Android Studio and no working Java runtime** (`java -version` fails —
"Unable to locate a Java Runtime"). Concretely, that means:

- `ios/App/App.xcodeproj` was generated, but CocoaPods was never run
  (`pod install`) and the project has never been opened, built, or code
  signed. It cannot produce an `.ipa` here.
- `android/` was generated and `capacitor.config.json` synced into it, but
  `./gradlew` cannot run without a JRE — no APK/AAB has been built here.
- Neither app has ever been launched in a simulator/emulator or on a real
  device. "Scaffolded" is the honest word — not "tested," not "working app."

Beyond tooling, actually **submitting** to either store also needs accounts
this session has no way to create or pay for on your behalf:
- An **Apple Developer Program** account ($99/year) — required for
  TestFlight and App Store submission, and for a real signing certificate.
- A **Google Play Console** account ($25 one-time) — required for any Play
  Store listing.

## What you need to do, on a Mac with full Xcode installed

1. Install Xcode from the Mac App Store (not just Command Line Tools), then
   install CocoaPods if you don't have it: `sudo gem install cocoapods`.
2. `npx cap open ios` — opens `ios/App/App.xcworkspace` in Xcode (use the
   `.xcworkspace`, not `.xcodeproj`, once CocoaPods has run).
3. In Xcode: set your Team under Signing & Capabilities, confirm the Bundle
   Identifier matches `com.argadaagdo.app` (or change it in
   `capacitor.config.ts` first and re-run `npx cap sync ios` if you want a
   different one).
4. Generate real app icons/splash screens — the current setup has none
   configured beyond Capacitor's defaults. The
   [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets)
   tool can generate the full icon/splash set from a single source image.
5. Build → Archive → upload to App Store Connect, add it to TestFlight for
   real-device testing before public submission.

## What you need to do, on a machine with Android Studio + a JDK

1. Install Android Studio (bundles a compatible JDK) or install a standalone
   JDK 17+ and the Android SDK/command-line tools.
2. `npx cap open android` — opens the project in Android Studio.
3. Confirm `applicationId` in `android/app/build.gradle` matches
   `com.argadaagdo.app` (or your chosen id).
4. Generate a signing keystore (`keytool -genkeypair ...` or via Android
   Studio's Build → Generate Signed Bundle/APK wizard) — **back this up
   somewhere safe**; losing it means you can never update the app under the
   same listing again.
5. Build a signed `.aab`, upload it to Google Play Console, and set up an
   internal testing track before a public release.

## Store listing prerequisites (both platforms)

- Screenshots (device-specific sizes — both stores are strict about this).
- Store listing copy (short/long description).
- A privacy policy URL — `/privacy` already exists on the live site and can
  be used directly.
- Content rating questionnaire (Play Store) / App Privacy details (App
  Store) — both ask about data collection; answer based on what Supabase
  Auth + the app actually collects (see `README.md`'s data overview).

## Not done, and intentionally out of scope this session

- No app icons/splash screens generated — Capacitor's defaults are still in
  place in both native projects.
- No push notification setup (`@capacitor/push-notifications` isn't
  installed) — nothing in the current app sends native push, this would be
  new scope.
- No real device or simulator testing of either native shell — impossible
  without the tooling above.
- Payments/BOG/TBC — unrelated to this packaging work, being handled
  separately per current project status.
