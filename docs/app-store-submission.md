# App Store / Play Store submission readiness

Prepared 2026-09-24, branch `feature/native-app-store-readiness`. Everything
in this document was done **without** an Apple Developer or Google Play
Console account — those cost $99/yr and $25 one-time respectively, and the
user doesn't have them yet. Payments/TBC integration is completely out of
scope here, unrelated to this doc, and untouched.

Source images: `argadaagdo_logo_profile_final.png` (square mark, sage
`#5C7A5C` bg / cream `#F2EFE6` bag) and the app's real background color
`#ece4d6` (from `app/globals.css`). Generated assets live in `assets/`
(regeneration source) and `store-assets/` (upload-ready files). Regenerate
icons/splash any time the logo changes:

```
npx capacitor-assets generate --iconBackgroundColor '#5c7a5c' --splashBackgroundColor '#ece4d6'
```

---

## 1. Capacitor scaffolding — verified, no changes needed

- `com.argadaagdo.app`, version `1.0` (build `1`), matches across
  `capacitor.config.ts`, Android's `build.gradle`/`MainActivity.java`, and
  iOS's `project.pbxproj` — nothing was out of sync.
- `server.url` in `capacitor.config.ts` still correctly points at
  `https://argadaagdo-silk.vercel.app` — re-verified this is the *only* live
  URL (`vercel project ls`) and that `argadaagdo.ge` is **not yet
  registered** on the Vercel account (`vercel domains ls` shows only
  `blackseacomplex.ge` and `tryourcoach.app`) and doesn't resolve
  (`dig argadaagdo.ge` returns nothing).
- Added a code comment noting that the URL is baked into the binary at
  build time — switching to the real domain later means rebuild +
  resubmit to both stores, not just a redeploy.

## 2 & 3. App icons and splash screens — generated, replacing placeholders

The `ios/` and `android/` folders (from an earlier session) still had
Capacitor's **default unbranded placeholder** icon/splash (a blue "X" on
white) — confirmed by opening the actual files before touching anything.
Replaced with the real logo:

- **iOS**: single 1024×1024 universal icon (flattened, no alpha, sRGB — the
  modern single-size format Xcode 14+ uses) + 3 splash scale variants.
- **Android**: full launcher icon set at ldpi–xxxhdpi (48/72/96/144/192px),
  adaptive icon foreground+background layers (bag glyph scaled to stay
  inside the ~56% safe-zone radius so it isn't clipped by circular/squircle
  launcher masks — verified this numerically, not just visually), and 12
  splash density/orientation variants.
- Splash background uses the app's actual `#ece4d6` background color with
  the icon mark centered, so the native launch screen matches the in-app
  background instead of flashing white before the WebView loads.
- Deleted the orphaned old placeholder files no longer referenced by
  `Contents.json`.
- `@capacitor/assets` also auto-generated PWA icons + a `manifest.webmanifest`
  in the wrong location (project-root `icons/`, outside `public/`, so
  Next.js would never serve it) — **deleted both**. The project already has
  a complete, working PWA setup (`app/manifest.json` + `public/sw.js`,
  referencing SVG icons) that this task didn't ask for and shouldn't
  duplicate or conflict with.

## 4. Store listing copy (draft)

Based on the site's actual copy (`app/page.tsx`) and
`ArGadaagdo_Documentation.pdf` — no new claims invented. All fields verified
against current character limits via live doc lookups (Sept 2026), not
assumed from memory.

### Apple App Store (App Store Connect)

| Field | Limit | Draft | Length |
|---|---|---|---|
| Name | 30 | `ArGadaagdo: Food Rescue` | 23 |
| Subtitle | 30 | `Surprise bags near you` | 22 |
| Promotional text | 170 | `Tbilisi's food-rescue marketplace. Reserve discounted surprise bags from local bakeries, cafes and restaurants, then pick up in person. New offers all day.` | 155 |
| Keywords | 100 | `food,rescue,discount,surplus,bakery,cafe,restaurant,pickup,Tbilisi,Georgia,deals,marketplace,waste` | 98 |

- **Primary category**: Food & Drink. **Secondary category**: Shopping.
  (Same pairing Too Good To Go and similar food-rescue apps use.)
- **What's New (v1)**: "Welcome to ArGadaagdo — Tbilisi's new food-rescue
  marketplace. Browse surprise bags from local bakeries, cafes, and
  restaurants, reserve and pay online, and pick up in person. Thank you for
  helping us cut food waste in Tbilisi!"

### Google Play Console

| Field | Limit | Draft | Length |
|---|---|---|---|
| App name | 30 | `ArGadaagdo: Food Rescue` | 23 |
| Short description | 80 | `Rescue surplus food from Tbilisi bakeries & cafes. Reserve, pay, pick up.` | 73 |

- **Category**: Food & Drink.
- **Release notes (v1)**: same text as App Store "What's New" above.

### Full description (both stores — 2,006 / 4,000 chars, identical copy works for both)

```
Rescue great food from local Tbilisi businesses — at a real discount.

Every day, bakeries, cafes, and restaurants across Tbilisi prepare more food than they sell. What doesn't sell by closing time usually gets thrown away. ArGadaagdo connects you directly with these businesses so surplus food finds a home instead of a bin, and you get a genuinely good deal.

HOW IT WORKS
1. Discover - Browse surprise bags from real Tbilisi favorites, updated throughout the day.
2. Reserve - Pay securely in the app and get your pickup code instantly.
3. Collect - Swing by during the pickup window, show your code, and enjoy.

WHAT'S IN A SURPRISE BAG?
Contents vary by business and day, since they depend on what's genuinely left over. The category and business are always shown before you buy; specific contents are typically a surprise, so every pickup feels a little different.

WHY IT'S A GOOD DEAL
Surprise bags are typically 50-70% below retail price. Businesses recover value from food they'd otherwise throw away, and you get real food for real savings.

PICKUP, NOT DELIVERY
ArGadaagdo is pickup-only by design. It keeps prices low, keeps things simple, and mirrors how food-rescue platforms work successfully elsewhere. Reserve online, then collect in person during the stated pickup window.

TRUST AND SAFETY
- Every business is manually reviewed and approved before it can list anything.
- Payment is handled entirely by a licensed banking partner. ArGadaagdo never stores your card details.
- Every reservation gets a unique pickup code, so only you can claim your bag.
- After pickup, you can rate your experience, building a transparent track record for every business.

FOR BUSINESSES
Running a bakery, cafe, restaurant, or food shop in Tbilisi? List today's surplus in under a minute and recover value from food you'd otherwise throw away. No listing fees, no subscriptions, just a simple commission on completed sales.

Now live in Tbilisi, with more neighborhoods and businesses joining regularly.
```

### Georgian localization — worth doing, not done here

The app itself is already fully bilingual (`app/page.tsx` has a complete
`isGeorgian` copy branch) and both stores support Georgian (`ka`) store
listings. Rather than generate new Georgian marketing copy myself (risk of
it reading as awkward machine translation), here are the **existing,
presumably human-written** Georgian strings already shipping in the app,
which a native speaker could adapt into a Georgian listing:

- Hero: `გადაარჩინე კარგი საკვები თბილისის ადგილობრივი ბიზნესებიდან.`
- Subhead: `ArGadaagdo აკავშირებს მომხმარებლებს კაფეებთან, საცხობებთან და რესტორნებთან, რომლებსაც დღის ბოლოს დარჩენილი კარგი საკვები აქვთ.`
- Badge: `🇬🇪 უკვე ხელმისაწვდომია თბილისში`

Recommend: get a native speaker to review/trim these to the store limits
before submitting a Georgian listing. Not required for v1 — English-only is
fine to launch with, especially since App Review itself is in English.

## 5. Screenshots — generated, with one real gap found

`scripts/capture-store-screenshots.mjs` (Playwright, installed as a dev
dependency) captures the live production site at exact store-required
pixel dimensions. Re-run any time with `node
scripts/capture-store-screenshots.mjs`. Sizes used (verified against
current Apple/Google docs, not assumed):

- **iOS 6.5"** — `1284×2778` — the one Apple documents as **required** if
  the app runs on iPhone.
- **iOS 6.9"** — `1290×2796` — optional but the current flagship display
  size; this is what most people actually see by default in the listing.
- **Android phone** — `1080×1920` — Play's recommended baseline, well
  inside its `320–3840px` / ≤2:1 ratio rule.

Output: `store-assets/screenshots/{ios-6.5in-1284x2778,ios-6.9in-1290x2796,android-1080x1920}/`

| # | Screen | Status |
|---|---|---|
| 01 | Home | ✅ Captured, looks strong — real hero copy, clean layout |
| 02 | Offers (browse) | ⚠️ Captured, but **shows an empty result list** |
| 03 | Offer detail | ❌ **Not captured** — no offer to link to |
| 04 | Sign-in | ✅ Captured (see note below on why this replaced checkout) |

**Two things worth knowing:**

1. **Production currently has zero live offers.** The script waits for a
   real `/offers/<id>` link to appear and found none — confirmed this is
   real production state, not a script bug. This isn't something I can or
   should fix by creating fake listings (that's fabricated data in a real
   marketplace DB). Once a pilot business has an active offer up, re-run
   the script to get real "browse" and "offer detail" shots — those will
   likely be your two strongest screenshots, so it's worth doing before
   final submission.
2. **Checkout and business registration both hard-redirect anonymous
   visitors to `/login`** (`getConfirmedUser()` → `router.replace()` in
   both `app/checkout/[id]/page.tsx` and presumably `app/business/register`)
   — there's no way to screenshot either page's real UI without a signed-in
   session. I didn't create a test account or attempt to sign in (that
   starts touching auth, which is out of scope here). The login page itself
   turned out to double as a decent dual-sided ("For customers" / "For
   businesses") value-prop screen, so it's kept as the 4th shot. If you want
   the literal checkout UI photographed, give me a test customer account's
   credentials and I'll recapture it — the script already suppresses the
   "Install ArGadaagdo" PWA prompt that would otherwise cover the content.

## 6. Privacy & permissions audit

**Clean result — nothing to flag for App Review.**

- **Android**: `AndroidManifest.xml` requests exactly one permission —
  `android.permission.INTERNET`. No camera, location, notifications,
  storage, contacts, microphone.
- **iOS**: `Info.plist` has **no usage-description keys at all** (no
  `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc.)
  — meaning even if some code path tried to call a permission-gated API,
  it would fail/crash rather than silently work, since iOS requires the
  matching usage string to be present.
- **Code search**: no `geolocation`/`getCurrentPosition`, no
  `getUserMedia`/camera, no `Notification.requestPermission`/push
  subscription code anywhere in `app/`, `components/`, or `lib/`.
  `lib/notifications.ts` is an in-app event bus (toast-style), not the
  browser Notification API — confirmed by reading it, not just its name.
- **No native Capacitor plugins installed** beyond
  `core`/`ios`/`android`/`cli` — so there's no plugin that could be
  requesting device permissions under the hood either.
- **Privacy policy**: `/privacy` is live, public, returns HTTP 200, no auth
  gate. Same for `/terms`. Both satisfy the "privacy policy URL" requirement
  both stores ask for at submission.

Bottom line: this app requests **zero** sensitive permissions today. Nothing
to write a permissions-justification note for in App Review.

## 7. Day-one checklist — once you have both paid accounts

This is a reference for later, not something to execute now.

### Apple ($99/yr Apple Developer Program)

1. Enroll at developer.apple.com (can take up to 48h for identity
   verification).
2. In Xcode (open `ios/App/App.xcodeproj` — this project uses Swift Package
   Manager for Capacitor's dependencies, not CocoaPods, so there's no
   separate `.xcworkspace` to look for), sign in with the new Apple ID
   under Settings → Accounts, then select the team in the project's
   Signing & Capabilities tab.
3. Let Xcode auto-manage signing (simplest) — it creates the App ID
   (`com.argadaagdo.app`), a Development certificate, and a provisioning
   profile automatically the first time you build to a device or archive.
4. In App Store Connect: create the app record (bundle ID
   `com.argadaagdo.app`, name/SKU), fill in the metadata from section 4
   above, upload `store-assets/app-store-icon-1024.png` and the
   `ios-6.5in-1284x2778/` (required) + `ios-6.9in-1290x2796/` (recommended)
   screenshots — **re-capture these first** if offers are live by then (see
   section 5).
5. Set the privacy policy URL to `https://argadaagdo-silk.vercel.app/privacy`
   (or the real domain, if live by then — update `capacitor.config.ts`'s
   `server.url` **first** and rebuild if so).
6. Archive the app in Xcode (Product → Archive), upload to App Store
   Connect via the Organizer.
7. Add the build to a TestFlight internal testing group, test on a real
   device end-to-end (this is also your last real chance to catch anything
   before Apple's reviewers see it).
8. Submit the build for App Review from the app's version page. Answer the
   Export Compliance question (uses HTTPS only — standard encryption
   exemption applies) and the advertising/tracking questions (no ad SDKs in
   this app, so "No" across the board).
9. Wait for review (historically ~24–48h, can vary).

### Google ($25 one-time Play Console)

1. Create the Play Console account, pay the one-time fee.
2. Create the app (package name `com.argadaagdo.app`).
3. Generate an upload key (`keytool -genkey -v -keystore
   argadaagdo-upload.keystore -alias argadaagdo -keyalg RSA -keysize 2048
   -validity 10000`) — **back this up somewhere durable**, losing it is a
   real problem later. Configure it in `android/app/build.gradle`'s signing
   config, or let Android Studio's Build → Generate Signed Bundle wizard do
   it.
4. Build a release AAB: `cd android && ./gradlew bundleRelease`.
5. Complete Play Console's required setup: App content questionnaire
   (target audience, ads declaration — "No ads", data safety form — based
   on section 6's audit, this should be a short, clean form since almost
   nothing is collected beyond account email/order history per the PDF),
   store listing (section 4's copy), upload
   `store-assets/play-store-icon-512.png` and
   `store-assets/play-store-feature-graphic-1024x500.png`, plus the
   `android-1080x1920/` screenshots (min 2, re-capture first if offers are
   live by then).
6. Create an Internal Testing release, upload the AAB, add test accounts,
   verify install + core flows on a real device.
7. Promote to Production (or a staged rollout, e.g. 20% → 100%) once
   satisfied.
8. Play Console review is typically faster than Apple's, but budget a
   similar buffer for a first submission.

## Bottom line: how much work remains once you have both accounts?

Roughly **half a day to a day of hands-on work per platform**, not
counting store review wait times — most of what's normally the slow part
(icons, splash, listing copy, permissions review, scaffolding verification)
is already done in this branch. What's left is genuinely account-gated:
signing certs/keys, the TestFlight/Internal Testing round-trip, and the
actual submit action, plus ideally re-capturing the offers/detail/checkout
screenshots once real listings and a test login exist. The one thing that'd
meaningfully shrink or reshuffle this estimate is if `argadaagdo.ge` goes
live before submission — that forces a `capacitor.config.ts` change and a
full rebuild before either store upload, so if the domain purchase is close,
it's worth sequencing that before, not after, first submission.
