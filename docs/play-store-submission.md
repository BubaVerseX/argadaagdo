# Google Play submission pack — Android 1.0.0 (1)

Prepared 2026-11-01 on branch `claude/android-play-release`. Companion to
`docs/app-store-submission.md` (iOS); the reviewer demo accounts, demo
bakery and refresh cron are shared and described there in section 2.

**No passwords in this file — the repo is public.** The demo passwords are
on the private copy page ("ArGadaagdo Play Store Kit" artifact) and were
given to the founder directly. Reset them in Supabase Dashboard →
Authentication → Users if lost.

Nothing has been uploaded to Play Console yet. Sections 3–7 are what to
enter there; the copy page has the same values with Copy buttons.

## 1. Build

| | |
|---|---|
| Application ID | `com.argadaagdo.app` |
| versionCode / versionName | `1` / `1.0.0` (`android/app/build.gradle`) |
| minSdk / target & compile SDK | 24 (Android 7.0) / 36 (Android 16) |
| Loads | `https://argadaagdo.ge` (`capacitor.config.ts` → `server.url`), offline page `native-shell/offline.html` |
| Icon / splash | leaf icon (adaptive: foreground + `#051F20` background) and dark-green splash, generated 2026-10-27 by `npx capacitor-assets generate` from `assets/` |
| Plugins | `@capacitor/app`, `@capacitor/browser` (TBC payment page opens in a Custom Tab) |
| Output | `android/app/build/outputs/bundle/release/app-release.aab` (gitignored), 4.4 MB, copy at `~/Desktop/play-upload/ArGadaagdo-1.0.0-1.aab` |

Built and verified 2026-11-01: `jarsigner -verify` passes, the bundle's
merged manifest reads versionCode 1, versionName 1.0.0, minSdk 24,
targetSdk 36.

### Permissions (merged manifest of the release bundle)

| Permission | Why | Sensitive? |
|---|---|---|
| `android.permission.INTERNET` | loads the web app | No |
| `com.argadaagdo.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | signature-level permission AndroidX adds automatically for its own broadcast receivers; invisible to users | No |

Nothing else: no location, camera, storage, contacts, notifications,
`AD_ID`, or `QUERY_ALL_PACKAGES`. The `<queries>` block comes from
`@capacitor/browser` (to find a Custom Tabs browser) and is not a
permission. The FileProvider in the manifest is Capacitor boilerplate and
needs no permission. There is nothing to remove.

### Target API level

Google Play Help (Target API level requirements, read 2026-11-01): new
apps and updates must target **Android 16 (API 36)** since 31 August 2026,
with an optional extension to 1 November 2026. This build targets 36, so
it passes with no extension.

### Toolchain on this Mac

- JDK 21: `/opt/homebrew/opt/openjdk@21` (installed 2026-11-01; Capacitor 8
  compiles with `--release 21`, so JDK 17 fails with "invalid source
  release: 21"). Android Studio's bundled JDK 25 was not used.
- Android SDK: `~/Library/Android/sdk` (platform 36, build-tools 36.0.0 and
  35.0.0, platform-tools), installed with the Homebrew `sdkmanager`.
  `android/local.properties` (gitignored) points at it.
- Gradle 8.14.3 wrapper, Android Gradle Plugin 8.13.0.

Rebuild:

```
cd ~/Documents/argadaagdo && npm ci && npx cap sync android
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew bundleRelease
```

For every later upload: bump `versionCode` (2, 3, …) and `versionName` in
`android/app/build.gradle`; Play rejects a reused versionCode.

### Signing (upload key)

| | |
|---|---|
| Keystore | `~/.android/argadaagdo/upload-keystore.jks` (PKCS12, RSA 4096, valid until 2054-03-19) |
| Alias | `argadaagdo-upload` |
| Passwords | `~/.android/argadaagdo/keystore.properties` (mode 600; store and key password are the same) |
| Backup | `~/Documents/argadaagdo-keys/` — same two files plus `upload_certificate.pem` (public certificate only) |
| Upload certificate SHA-256 | `98:CD:93:CD:12:4C:F5:FF:EA:78:A3:7A:70:90:5F:E9:AB:BD:8C:34:BD:CE:A5:1E:FF:82:D4:61:55:83:A4:FC` |

`android/app/build.gradle` reads the properties file from
`$ARGADAAGDO_KEYSTORE_PROPERTIES` or the default path above and signs the
release build type with it; without the file the release build is simply
unsigned. `*.jks`, `*.keystore` and `keystore.properties` are gitignored in
`android/.gitignore`.

Keep a third copy of the backup folder off this Mac (password manager
attachment or encrypted drive). With Play App Signing (on by default for
new apps, keep "Use a Google-generated key") Google holds the real app
signing key and this is only the upload key: if it is ever lost, Play
Console → Setup → App signing → "Request upload key reset" replaces it
within a few days; if it leaks, do the same immediately.

## 2. Reviewer demo

Same as iOS, `docs/app-store-submission.md` section 2: customer login
`argadaagdo.support+review.customer@gmail.com`, business login
`argadaagdo.support+review.business@gmail.com`, demo business "Demo Bakery
(App Review)" with the free "Demo surprise bag (free, App Review)",
refreshed daily by the payment-maintenance cron. Check the box is visible
as the demo customer before uploading the first closed-testing release and
once a day while anything is in review or pre-launch testing (Play's
pre-launch report signs in with the App access credentials and crawls the
app). If it is gone: `select public.refresh_review_demo_offers();`.

## 3. Create the app (Play Console → All apps → Create app)

| Field | Value |
|---|---|
| App name | `ArGadaagdo` (10/30) |
| Default language | English (United Kingdom) – en-GB |
| App or game | App |
| Free or paid | Free (cannot be changed to paid later; fine) |
| Declarations | tick Developer Program Policies and US export laws |

## 4. Store listing

Play supports a Georgian listing (`ka-GE`), unlike App Store Connect, so
there are two listings: English (default) and Georgian. Devices set to
Georgian see the Georgian one. Store listing → Main store listing, then
"Manage translations" → Add languages → Georgian.

### English (United Kingdom), default

| Field | Value | Limit |
|---|---|---|
| App name | `ArGadaagdo` | 10/30 |
| Short description | `Lunch Boxes of leftover food from Tbilisi bakeries and cafes, at a discount.` | 76/80 |
| Full description | below | 1,589/4,000 |

```
Rescue good food from local Tbilisi businesses, at a real discount.

Every day, bakeries, cafes and restaurants in Tbilisi are left with good food they couldn't sell. ArGadaagdo connects you with them, so that food gets eaten instead of thrown away, and you get a genuinely good deal.

HOW IT WORKS
1. Discover: browse Lunch Boxes from local businesses, updated through the day.
2. Reserve: pay securely by card through TBC Bank and get your pickup code instantly.
3. Collect: visit during the pickup window, show your code and enjoy.

WHAT'S IN A LUNCH BOX?
It depends on what's left that day. You always see the business, category, price and pickup time before you reserve; the exact contents are a surprise.

PICKUP, NOT DELIVERY
ArGadaagdo is pickup-only: reserve in the app, then collect in person at the business during the pickup window.

FAIR AND SAFE
- Every business is reviewed and approved before it can list offers.
- Payments are handled by TBC Bank on its secure payment page. ArGadaagdo never sees or stores your card details.
- Each reservation has its own pickup code, so only you can collect your box.
- Plans changed? Cancel up to 2 hours before pickup and the payment is refunded to your card.
- After pickup you can rate the business, so everyone can see which places deliver.

FOR BUSINESSES
Run a bakery, cafe, restaurant or food shop in Tbilisi? List today's leftover food in a minute, verify pickups with the customer's code and earn from food you would otherwise throw away. No listing fees or subscriptions, just a commission on each sale.

Now live in Tbilisi.
```

### Georgian (ka-GE)

| Field | Value | Limit |
|---|---|---|
| App name | `არ გადააგდო – ArGadaagdo` | 24/30 |
| Short description | `დარჩენილი საკვების ლანჩ ბოქსები თბილისის საცხობებიდან, ფასდაკლებით.` | 67/80 |
| Full description | below | 1,580/4,000 |

```
გადაარჩინე კარგი საკვები თბილისის ადგილობრივი ბიზნესებიდან, რეალური ფასდაკლებით.

ყოველდღე თბილისის საცხობებს, კაფეებსა და რესტორნებს რჩებათ კარგი საკვები, რომელიც ვერ გაიყიდა. ArGadaagdo გაკავშირებს მათთან, რომ ეს საკვები არ გადაიყაროს, შენ კი კარგ ფასად მიიღო.

როგორ მუშაობს
1. აღმოაჩინე: დაათვალიერე ლანჩ ბოქსები ადგილობრივი ბიზნესებიდან, რომლებიც დღის განმავლობაში ახლდება.
2. დაჯავშნე: გადაიხადე ბარათით, უსაფრთხოდ, თიბისი ბანკის მეშვეობით და მაშინვე მიიღე წაღების კოდი.
3. წაიღე: მიდი წაღების დროს, აჩვენე კოდი და ისიამოვნე.

რა არის ლანჩ ბოქსში?
ეს დამოკიდებულია იმაზე, რა დარჩა იმ დღეს. დაჯავშნამდე ყოველთვის ხედავ ბიზნესს, კატეგორიას, ფასსა და წაღების დროს; ზუსტი შემადგენლობა კი სიურპრიზია.

მხოლოდ წაღება, მიტანის გარეშე
დაჯავშნე აპში და შეკვეთა თავად წაიღე ბიზნესიდან, წაღების დროს.

სამართლიანი და უსაფრთხო
- ყველა ბიზნესი შეთავაზების განთავსებამდე მოწმდება და დასტურდება.
- გადახდას თიბისი ბანკი ამუშავებს თავის დაცულ გვერდზე. ArGadaagdo ვერ ხედავს და არ ინახავს შენი ბარათის მონაცემებს.
- ყველა ჯავშანს საკუთარი წაღების კოდი აქვს, ამიტომ ყუთს მხოლოდ შენ წაიღებ.
- გეგმები შეგეცვალა? გააუქმე წაღებამდე 2 საათით ადრე და თანხა ბარათზე დაგიბრუნდება.
- წაღების შემდეგ შეგიძლია ბიზნესი შეაფასო, რომ ყველამ იცოდეს, რომელი ადგილი ღირს.

ბიზნესებისთვის
გაქვს საცხობი, კაფე, რესტორანი ან სასურსათო მაღაზია თბილისში? განათავსე დღეს დარჩენილი საკვები ერთ წუთში, გადაამოწმე წაღება მომხმარებლის კოდით და მიიღე შემოსავალი საკვებიდან, რომელიც სხვა შემთხვევაში გადაიყრებოდა. არც განთავსების საფასური, არც გამოწერა, მხოლოდ საკომისიო თითოეულ გაყიდვაზე.

უკვე ხელმისაწვდომია თბილისში.
```

Have a native speaker read the Georgian before submitting (same text as
the iOS description's Georgian half).

### Graphics (`store-assets/play/`)

| Asset | File | Spec |
|---|---|---|
| App icon | `icon-512.png` | 512 × 512 PNG, 188 KB (limit 1 MB), resized from `~/Downloads/argadaagdo_brand_green/icon_1024.png` |
| Feature graphic | `feature-graphic-1024x500-ka.png` (= `banner_ka.png`, byte-identical) | 1024 × 500 PNG. Use on both listings as asked; `feature-graphic-1024x500-en.png` exists if you prefer English text on the English listing |
| Phone screenshots | `screenshots-phone-1080x2340/01-home.jpg … 06-orders.jpg` | 1080 × 2340 JPEG (9:19.5), 200–312 KB each; Play wants 2–8 per listing, 16:9 to 9:16 or taller is accepted up to 2:1… see note |

Note on ratio: Play's phone screenshot rule is 320–3840 px per side and
an aspect ratio no taller than 2:1 for the listing to qualify for
promotion; 1080 × 2340 is 2.17:1 and uploads fine (it is a standard phone
size), but if Play Console shows a "not eligible for promotion" hint,
either crop to 1080 × 2160 (`sips -c 2160 1080`) or ignore it. Use the
same six Georgian shots on both listings; English-UI shots can be made by
dropping the `argadaagdo-language` localStorage line from the capture
script.

Captured 2026-11-01 from production with Playwright (360 × 780 CSS px at
3×, Android user agent, Georgian UI) against a temporary copy of Old Town
Bakery's offer (offer 24, order 27 for the demo customer); afterwards the
order was cancelled and the offer expired, as in October. Tablet
screenshots are optional for a phone app; leave them empty.

Order and content: 01 home, 02 browse (offer card), 03 offer page, 04
discover, 05 checkout, 06 orders with pickup code.

### Store settings and contact

| Field | Value |
|---|---|
| App category | Food & Drink (Application) |
| Tags | Food & Drink; optional |
| Contact email (shown publicly) | `argadaagdo.support@gmail.com` |
| Website | `https://argadaagdo.ge` |
| Phone | optional |
| External marketing | leave on |

## 5. App content (Policy → App content)

### Privacy policy

`https://argadaagdo.ge/privacy`

### Ads

"No, my app does not contain ads." (No ad SDKs; nothing in the web app.)

### App access

"All or some functionality is restricted" → Add instructions. Two
credential sets (name / username / password from the copy page):

- "Customer demo (reservations, pickup code)" —
  `argadaagdo.support+review.customer@gmail.com`
- "Business demo (dashboard, verify pickup)" —
  `argadaagdo.support+review.business@gmail.com`

Instructions text (1,221 characters):

```
ArGadaagdo is a pickup-only food-rescue marketplace in Tbilisi, Georgia. Browsing works without an account; reserving, the Orders tab and the business dashboard need sign-in (email and password only, no third-party login).

The two demo accounts see a demo business, "Demo Bakery (App Review)", with a free (0 GEL) offer "Demo surprise bag (free, App Review)". Reserving it takes no payment and opens no bank page. Real offers depend on partner businesses and may be absent for newly registered accounts.

CUSTOMER: Sign In with the customer account > Browse > open "Demo surprise bag (free, App Review)" > Continue to checkout > tick "I understand the pickup and cancellation rules." > Pay and reserve. The Orders tab shows the reservation with a 6-digit pickup code; it can be cancelled there.

BUSINESS: account icon (top right) > Logout, then sign in with the business account > Dashboard > Reservations > Verify & Complete Pickup > enter the customer's code. The order is completed and the customer can rate the business.

ACCOUNT DELETION: account icon > Settings > Delete my account > type DELETE > confirm. Please test deletion with an account you register yourself; deleting a demo account breaks further review.
```

### Content rating (IARC questionnaire)

| Question | Answer |
|---|---|
| Email address | `argadaagdo.support@gmail.com` |
| Category | Utility, Productivity, Communication or Other |
| Violence, blood, sexuality, nudity, profanity, crude humour | No |
| Alcohol, tobacco, drugs (references, use or sale) | No (the app sells food; no alcohol category) |
| Gambling, simulated gambling, loot boxes | No |
| Hate speech, discrimination | No |
| Does the app allow users to interact or exchange content with other users? | Yes — public ratings and review comments after pickup (no chat) |
| Does the app share the user's current location with other users? | No |
| Does the app allow users to purchase digital goods? | No (physical food, paid on the bank's page) |
| Does the app contain user-generated content? | Yes, moderated (admins can remove reviews) |
| Miscellaneous (web browsing, personal info sharing, etc.) | No unrestricted web access; users share email with the business they reserve from |

Expected result: Everyone / PEGI 3 with the "Users interact" interactive
element. Redo the questionnaire if chat or alcohol listings are ever added.

### Target audience and content

- Target age groups: **18 and over** only (payments and a business
  dashboard; nothing for children). Do not tick 13–17.
- "Could the store listing unintentionally appeal to children?" No.
- No ads, so the ads-for-children question does not appear.

### News apps

No, the app is not a news app.

### COVID-19 contact tracing and status apps

Not a contact tracing or status app.

### Data safety

Overall answers:

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all user data collected by your app encrypted in transit? | **Yes** (HTTPS only: Vercel, Supabase, TBC) |
| Do you provide a way for users to request that their data is deleted? | **Yes** (in-app deletion in Settings, plus email) |
| Independent security review | No |

Account creation / deletion block (shown once you say the app lets users
create an account):

| Question | Answer |
|---|---|
| Does your app allow users to create an account? | Yes, with email and password |
| Deletion URL (web page where users can request deletion) | `https://argadaagdo.ge/privacy#delete-account` |
| Does the in-app path let users delete their account? | Yes: account icon → Settings → Delete my account |
| Do you provide a way to request deletion of some data without deleting the account? | Yes, by email to `argadaagdo.support@gmail.com` (privacy page says so) |

The `#delete-account` anchor was added to the privacy page in this branch
(`app/privacy/page.tsx`); it is live once the branch is merged and
deployed. Until then the plain `/privacy` URL works too, the section is
near the bottom.

Data types (all **Collected**, none **Shared**, none processed
ephemerally; purposes as listed). Sharing: data reaches Supabase, Vercel
and the email provider only as service providers, which Google excludes
from "sharing"; the customer's email shown to the business after a
reservation, and public review comments, are transfers the user starts
and expects, which Google also excludes. Declare "Shared" for Email
address only if you prefer the conservative reading.

| Category | Data type | Required? | Purposes | What it is |
|---|---|---|---|---|
| Personal info | Email address | Required | App functionality, Account management | sign-in; reservation emails; shown to the business for the pickup |
| Personal info | Name | Optional | Account management | optional display name; business contact name |
| Personal info | Phone number | Optional | App functionality | optional customer phone; business phone shown on listings |
| Personal info | Address | Optional (business accounts) | App functionality | business address shown on listings and maps |
| Personal info | User IDs | Required | Account management, App functionality | account ID |
| Financial info | Purchase history | Required | App functionality | reservations and their payment status |
| Photos and videos | Photos | Optional (business accounts) | App functionality | offer photos uploaded by businesses |
| App activity | Other user-generated content | Optional | App functionality | ratings and review comments |

Not collected (leave unticked): Location, User payment info (card details
are typed on TBC Bank's own page and never reach the app), Credit score,
Health and fitness, Messages, Audio, Files and docs, Calendar, Contacts,
App interactions, In-app search history, Installed apps, Web browsing
history, Crash logs, Diagnostics, Device or other IDs. There is no
analytics, crash-reporting or advertising SDK in the app, and the web app
sets only its own session and language cookies/storage.

### Government apps

No.

### Financial features

"My app doesn't provide any financial features." The app sells physical
goods; card payments happen on TBC Bank's hosted page, and the app offers
no loans, wallets, transfers, crypto or banking.

### Health apps

No health features.

### Advertising ID

"No, my app does not use advertising ID." (Required declaration for
targetSdk 33+; the merged manifest has no `AD_ID` permission.)

## 6. Your Play Console account and the closed-testing rule

Checked in Play Console on 2026-11-01 (signed in as the account owner):

- Account **"Bidzina Abesadze", Personal account**, Account ID
  5490870564677273928 (shown under the name on the Home page; also under
  Setup → Developer account → Account details, "Account type").
- It was created after 13 November 2023: the ArDanebde app's dashboard
  shows the "Apply for access to production" task with the
  12-testers-for-14-days checklist (currently "12 testers have been opted
  in for 11 days continuously"), which only appears on personal accounts
  created after that date.

What that means for ArGadaagdo (Play Help "App testing requirements for
new personal developer accounts", read 2026-11-01):

1. The rule applies **per app**: ArGadaagdo needs its own closed test, the
   ArDanebde test does not carry over (the same 12 people may test both).
2. Steps: Testing → Closed testing → create a track (keep the "Alpha"
   name) → upload `ArGadaagdo-1.0.0-1.aab` → Testers: create an email list
   (≥ 12 Google accounts; a Google Group also works) → countries: Georgia
   (plus any country a tester lives in) → Save → "Review release" → "Start
   rollout to Closed testing". The first closed-testing release is itself
   reviewed by Google (hours to a few days for a new app).
3. Send testers the opt-in link from the track page; each must **opt in
   and install** the app and stay opted in for **14 consecutive days**.
   Opting out resets that tester's count. Only testers who actually
   install count as "engaged".
4. After 14 days the Dashboard shows **Apply for production**: a short
   form about the test (who tested, what feedback came, what changed), the
   app and production readiness. Google answers within about 7 days; if it
   says the test was too thin, keep testing and reapply.
5. Only after approval can you create a Production release (which is
   reviewed again) and pick countries. Earliest realistic production date
   is therefore about three weeks after the first closed-testing rollout.
6. In the meantime an **Internal testing** track (up to 100 testers, no
   review, instant) is the fastest way to install the signed build on real
   phones; it does not count toward the 14 days.

All App content declarations (section 5) must be complete before the
closed-testing release can roll out; the Dashboard's "Set up your app"
checklist lists them.

## 7. Order of operations in Play Console

1. Create app (section 3).
2. Dashboard → "Set up your app": privacy policy, app access, ads, content
   rating, target audience, news, COVID, data safety, government,
   financial features, health, advertising ID (section 5).
3. Store settings (category, contact details), then Main store listing
   (English) and the Georgian translation with the graphics (section 4).
4. Setup → App signing: accept Play App Signing with a Google-generated
   key (default).
5. Testing → Closed testing → Alpha → upload the AAB, testers, countries,
   release notes, roll out (section 6).
6. Share the opt-in link; keep the demo box alive; watch the pre-launch
   report (Release → Pre-launch report) for crashes or login failures.
7. Day 14+: Apply for production. After approval: Production release,
   countries (Georgia at least), release notes, roll out.

Release notes, both tracks (en-GB / ka-GE, 500 chars max):

```
First Android release: browse Lunch Boxes from Tbilisi bakeries, cafes and restaurants, reserve and pay by card, collect with your pickup code.
```

```
პირველი Android ვერსია: დაათვალიერე ლანჩ ბოქსები თბილისის საცხობებიდან, კაფეებიდან და რესტორნებიდან, დაჯავშნე და გადაიხადე ბარათით, წაიღე წაღების კოდით.
```

## 8. Rejection risks, most likely first

1. **User-generated content policy.** Play requires UGC apps to offer an
   in-app way to report objectionable content and to block/remove it.
   Review comments are public and the app has no Report button (same gap
   Apple may raise). Cheapest fix before the production application: a
   "Report" link on each review that emails support, plus the existing
   admin removal. Mention moderation in the content rating answers (done).
2. **Minimum functionality / webview.** The app is the website in a
   Capacitor WebView. Play allows this when you own the site and the app
   works as an app (it has an offline page, in-app payment tab, native
   icon/splash, no browser chrome). If rejected under "Minimum
   functionality", the fix is a native feature such as push notifications
   for pickup reminders.
3. **Pre-launch report sign-in failures.** The report's crawler uses the
   App access credentials; if the demo customer login or demo box is
   missing it flags "login failed", which reviewers read. Keep section 2
   healthy.
4. **Data safety mismatch.** Google compares the form with observed
   traffic. The app has no SDKs, so only what is listed above is sent;
   don't add analytics without updating the form.
5. **Target audience.** Choosing 18+ keeps the app out of the Families
   policy; don't later tick a younger age group without reading that
   policy.

## 9. Still to do by hand

- Upload and fill everything in Play Console (sections 3–7); nothing was
  uploaded.
- Merge this branch and deploy so `/privacy#delete-account` resolves (the
  deletion text is already live at `/privacy`).
- Gather at least 12 testers with Google accounts and Android phones;
  send them the opt-in link the day the closed test goes live.
- Copy `~/Documents/argadaagdo-keys/` somewhere off this Mac.
- Native-speaker check of the Georgian listing text.
- Decide on the Report button for reviews (risk 1) before applying for
  production.
- When the custom domain goes live: new `server.url`, versionCode 2,
  rebuild, new release (`docs/domain-day-checklist.md`).
