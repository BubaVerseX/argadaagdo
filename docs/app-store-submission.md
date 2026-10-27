# App Store / Play Store submission readiness

# iOS 1.0.0 (1) — App Store submission pack (2026-10-26)

Everything needed to submit iOS 1.0.0 as-is. Branch
`claude/app-store-review-prep`. The sections after this one are the
September preparation, kept for history; where they disagree, this section
wins (in particular: screenshot sizes, listing copy and the Georgian
localization note).

**No passwords are in this file — the repo is public.** The reviewer demo
passwords were given to the founder directly. Reset them in Supabase
Dashboard → Authentication → Users if lost.

## 1. Build

| | |
|---|---|
| Bundle ID | `com.argadaagdo.app` |
| Display name | ArGadaagdo |
| Version / build | 1.0.0 / 1 (`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`) |
| Loads | `https://argadaagdo-silk.vercel.app` (`capacitor.config.ts` → `server.url`) |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`), iOS 15+ |
| Icon / splash | real bag logo, 1024×1024 RGB without alpha / beige `#ece4d6` splash |
| Encryption | `ITSAppUsesNonExemptEncryption = false` (HTTPS only), so no export-compliance question |
| Toolchain | Xcode 27.0 installed; Apple requires Xcode 26+ / iOS 26 SDK since 2026-04-28 |

Verified 2026-10-26: `xcodebuild` Release build for the simulator succeeds.
The app could not be watched running in the simulator in that session (the
simulator service kept crashing), so the first Xcode Run below is the
first real on-screen check.

The web app ships independently of the binary: everything except the URL,
icon, splash and native plugins updates on every Vercel deploy without a
new App Store build. Changing the domain to `argadaagdo.ge` later needs a
new build + review (see `docs/domain-day-checklist.md`).

## 2. Reviewer demo (no real payment)

Migration `supabase/migrations/20261026121039_app_review_demo.sql`, applied
to production 2026-10-26 after a rolled-back dry run.

- Logins: customer `argadaagdo.support+review.customer@gmail.com`, business
  `argadaagdo.support+review.business@gmail.com` (Gmail aliases, so
  confirmation and reset emails land in the support inbox). Both are listed
  in `private.review_demo_accounts`.
- Business "Demo Bakery (App Review)" (`businesses.is_review_demo = true`,
  owned by the business login) with the 0 GEL offer "Demo surprise bag
  (free, App Review)".
- Only those two logins (plus admins and the business owner) can see the
  demo business and offer; everyone else, signed in or not, can't — enforced
  by RLS, not by the UI.
- Checkout for a 0 GEL offer calls `reserve_review_demo_offer` instead of
  TBC: reserved order, 6-digit pickup code, no payment row. Cancelling and
  completing the pickup use the normal code paths, with no bank call.
- `refresh_review_demo_offers()` (daily payment-maintenance cron, 03:00 UTC)
  keeps the bag on sale for tomorrow 18:00–21:00 with 20 boxes. **Before
  submitting and while in review, check the bag is visible** when signed in
  as the demo customer; if the cron ever fails, run
  `select public.refresh_review_demo_offers();` in the Supabase SQL editor.
- If a reviewer deletes a demo account, recreate it with the same email
  through the app's sign-up (business: sign up as a business), then:
  `insert into private.review_demo_accounts (user_id) select id from auth.users where email = '<email>';`
  and, for a new business login,
  `update public.businesses set owner_id = '<new user id>', approved = true where is_review_demo;`
  (a deleted business account also deactivates the demo offer; the next
  refresh re-activates it).

Verified end to end on 2026-10-26 against the deployed code: reserve → code
→ business completes → completed; reserve → cancel → cancelled, box back on
sale; anon and a non-registered signed-in user can't see or reserve it.

## 3. Store listing (App Store Connect → your app)

App Store Connect has **no Georgian localization** (Apple's list of 50
languages doesn't include it; the Georgia storefront shows English (U.K.)).
So the listing is one English (U.K.) localization whose description ends
with a Georgian section, and the keywords mix in two Georgian words.

| Field | Value | Limit |
|---|---|---|
| Name | `ArGadaagdo` | 10/30 |
| Subtitle | `Rescue surplus food in Tbilisi` | 30/30 |
| Primary language | English (U.K.) | |
| Primary / secondary category | Food & Drink / Shopping | |
| Promotional text | `Surprise boxes of good leftover food from Tbilisi bakeries, cafes and restaurants, at a discount. Reserve in the app, pick up in person, cut food waste.` | 152/170 chars |
| Keywords (recommended, EN + KA) | `bakery,cafe,surprise,box,discount,leftover,waste,pickup,საკვები,საცხობი` | 99/100 **bytes** |
| Keywords (English only) | `bakery,cafe,restaurant,surprise,bag,box,discount,deals,leftover,waste,pickup,Georgia,meal,eco,save` | 98/100 bytes |
| Support URL | `https://argadaagdo-silk.vercel.app/support` | |
| Marketing URL | `https://argadaagdo-silk.vercel.app` | |
| Privacy Policy URL | `https://argadaagdo-silk.vercel.app/privacy` | |
| Copyright | `2026 ArGadaagdo` | |
| Price | Free | |

Keywords are limited to 100 *bytes*: each Georgian letter takes 3, which is
why there are only two Georgian words. Words already in the name or
subtitle (food, rescue, surplus, Tbilisi) are left out on purpose; Apple
indexes those anyway.

Georgian subtitle, if Apple ever adds Georgian:
`გადაარჩინე საკვები თბილისში` (27/30).

### Description (3,202 / 4,000 characters)

```
Rescue good food from local Tbilisi businesses, at a real discount.

Every day, bakeries, cafes and restaurants in Tbilisi are left with good food they couldn't sell. ArGadaagdo connects you with them, so that food gets eaten instead of thrown away, and you get a genuinely good deal.

HOW IT WORKS
1. Discover: browse surprise boxes from local businesses, updated through the day.
2. Reserve: pay securely by card through TBC Bank and get your pickup code instantly.
3. Collect: visit during the pickup window, show your code and enjoy.

WHAT'S IN A SURPRISE BOX?
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

———

ქართულად

გადაარჩინე კარგი საკვები თბილისის ადგილობრივი ბიზნესებიდან, რეალური ფასდაკლებით.

ყოველდღე თბილისის საცხობებს, კაფეებსა და რესტორნებს რჩებათ კარგი საკვები, რომელიც ვერ გაიყიდა. ArGadaagdo გაკავშირებს მათთან, რომ ეს საკვები არ გადაიყაროს, შენ კი კარგ ფასად მიიღო.

როგორ მუშაობს
1. აღმოაჩინე: დაათვალიერე სიურპრიზის ყუთები ადგილობრივი ბიზნესებიდან, რომლებიც დღის განმავლობაში ახლდება.
2. დაჯავშნე: გადაიხადე ბარათით, უსაფრთხოდ, თიბისი ბანკის მეშვეობით და მაშინვე მიიღე წაღების კოდი.
3. წაიღე: მიდი წაღების დროს, აჩვენე კოდი და ისიამოვნე.

რა არის სიურპრიზის ყუთში?
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

Have a native speaker read the Georgian part before submitting.

## 4. Age rating (App Information → Age Ratings → Edit)

Expected result: **4+**.

| Section | Question | Answer |
|---|---|---|
| In-app controls | Parental controls | No |
| | Age assurance | No |
| Capabilities | Unrestricted web access | No (the WebView only shows our own site; the bank page opens in a payment sheet; other links leave the app) |
| | User-generated content | **Yes** (public ratings and review comments; business listings and photos) |
| | Social media (feed that spreads user content) | No |
| | Messaging and chat | No |
| | Advertising | No |
| Mature themes | Profanity, horror/fear, alcohol/tobacco/drugs | None |
| Medical or wellness | Medical/treatment info, health/wellness topics | None |
| Sexuality or nudity | All three | None |
| Violence | Cartoon, realistic, graphic, guns/weapons | None |
| Chance-based activities | Gambling, simulated gambling, contests, loot boxes | None |
| | Made for Kids | No |

User-generated content still rates 4+ under Apple's tiers.

## 5. App Privacy (App Privacy → Get Started)

- Do you or your third-party partners collect data from this app? **Yes**
- Tracking (data used to track across other companies' apps/websites):
  **No** for every type. No ads, no analytics, no tracking SDKs, so no
  App Tracking Transparency prompt.

Declare these types; for each answer **Purpose: App Functionality**,
**Linked to the user: Yes**, **Used for tracking: No**:

| Category | Type | Why |
|---|---|---|
| Contact Info | Email Address | sign-in, reservation emails; shown to the business you reserve from |
| Contact Info | Name | optional display name (profile) |
| Contact Info | Phone Number | optional customer phone; business phone |
| Contact Info | Physical Address | business addresses entered by business accounts |
| User Content | Photos or Videos | offer photos uploaded by businesses |
| User Content | Other User Content | ratings and review comments |
| Purchases | Purchase History | reservations and their payment status |
| Identifiers | User ID | account ID |

Do **not** declare: Payment Info (card data is entered only on TBC Bank's
page; the app never receives it), Location, Contacts, Usage Data,
Diagnostics (no analytics or crash SDK), Browsing History, Search History.
Business IBANs are given to us outside the app, so they aren't app-collected
data.

## 6. App Review Information (version page, bottom)

- Sign-in required: **Yes**. User name:
  `argadaagdo.support+review.customer@gmail.com`, password: the customer
  password you were given.
- Contact: your name, phone and `argadaagdo.support@gmail.com`.
- Notes (about 2,330 / 4,000 characters once the passwords are in — replace both `<PASSWORD>` placeholders):

```
ArGadaagdo is a pickup-only food-rescue marketplace in Tbilisi, Georgia. Local bakeries, cafes and restaurants list "surprise boxes" of food they couldn't sell; customers reserve one in the app, pay by card, and collect it in person at the business by showing a 6-digit pickup code.

PAYMENTS AND IN-APP PURCHASE
Customers pay for physical food that they collect in person at the business, so under guideline 3.1.3(e) the app takes card payments through TBC Bank's own checkout page (opened in an in-app Safari sheet) instead of In-App Purchase. The app sells no digital content, subscriptions or unlockable features.

DEMO ACCOUNTS (no real payment needed)
Customer: argadaagdo.support+review.customer@gmail.com / <PASSWORD>
Business: argadaagdo.support+review.business@gmail.com / <PASSWORD>
These two accounts see a demo business, "Demo Bakery (App Review)", with a free (0 GEL) "Demo surprise bag (free, App Review)". Reserving it takes no payment. The demo business and bag are visible only to these accounts.

STEPS
1. Tap Sign In and sign in with the customer account.
2. Browse > open "Demo surprise bag (free, App Review)" > Continue to checkout > tick "I understand the pickup and cancellation rules." > Pay and reserve. No payment page opens for the demo bag.
3. Orders shows the reservation with its 6-digit Pickup Code. You can also cancel it there (allowed until 2 hours before pickup).
4. Log out (account icon, top right > Logout) and sign in with the business account. On the Dashboard tab, scroll down to Reservations > Verify & Complete Pickup > enter the customer's code. The order is completed, and the customer can then rate the business from Orders.

ACCOUNT DELETION
Account icon (top right) > Settings > Delete my account > type DELETE > confirm. Please test this with an account you register yourself: deletion is permanent and would remove the demo account for any further review.

OTHER NOTES
- Live offers depend on partner businesses in Tbilisi, so a newly registered account may currently see no offers; the demo customer account always sees the demo bag.
- Sign-in is email and password only, with no third-party login.
- The app requests no device permissions (location, camera, contacts, notifications) and has no ads or tracking.
- Support: argadaagdo.support@gmail.com
```

## 7. Screenshots

The app is iPhone-only, so only iPhone screenshots are needed:

- **Required: 6.9" display**, portrait **1320 × 2868** (1290 × 2796 and
  1260 × 2736 are also accepted). Providing this size means the 6.5" set
  isn't required, and smaller sizes are scaled from it.
- 1–10 per size (aim for 4–5), `.png` or `.jpg`, **no alpha channel**.
- No iPad sizes (iPhone-only app).

Take them from the **iPhone 18 Pro Max** simulator (its screen is exactly
1320 × 2868):

1. In Xcode pick **iPhone 18 Pro Max** as the run destination and press
   **Run ▶** (Xcode boots the simulator window itself).
2. Clean status bar (9:41, full battery), in Terminal:
   `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`
3. Go to each screen in the app, then:
   `xcrun simctl io booted screenshot ~/Desktop/01-home.png`
   (`02-browse`, `03-offer`, `04-pickup-code`, `05-business`, …)
4. Simulator screenshots **have an alpha channel**, which App Store Connect
   rejects. Convert them to JPEG (keeps 1320 × 2868):
   `cd ~/Desktop && for f in 0*.png; do sips -s format jpeg -s formatOptions 92 "$f" --out "${f%.png}.jpg"; done`
5. Check: `sips -g pixelWidth -g pixelHeight -g hasAlpha ~/Desktop/01-home.jpg`
   should print 1320, 2868 and `hasAlpha: no`.

Content: production has **no live offers right now**, and the
Browse/Offer screens are the strongest shots. Best is a real pilot
business's offer on the day you capture. Otherwise sign in as the demo
customer — but the demo bag's title says "(free, App Review)" and the price
shows ₾0.00, so for screenshots use Home, the pickup-code screen in Orders
and the business dashboard, rather than the demo bag's Browse/Offer pages.
Don't create fake offers on real businesses: every signed-in and signed-out
visitor would see them.

## 8. Xcode → Archive → Upload

Needs an active Apple Developer Program membership. Create the App Store
Connect app record (section 9, step 1) **before** uploading.

1. Terminal:
   `cd ~/Documents/argadaagdo && git checkout claude/app-store-review-prep && git pull && npm ci && npx cap sync ios && npx cap open ios`
   (`npm ci` matters: the Swift packages point into `node_modules/@capacitor`.)
2. Xcode → **Settings… → Accounts → +** → Apple Account → sign in with
   your developer Apple ID.
3. Left sidebar: click the blue **App** project → **TARGETS: App** →
   **Signing & Capabilities** → tick **Automatically manage signing** →
   **Team**: your team. Bundle Identifier must read `com.argadaagdo.app`.
4. **General** tab: Display Name `ArGadaagdo`, Version `1.0.0`, Build `1`.
5. Test once: run destination **iPhone 18 Pro Max** → **Run ▶**. Check the
   app opens on the home page, then do the reviewer flow from section 6
   with both demo logins. (Better still, also run it on a real iPhone:
   connect it by cable, choose it as destination, and turn on Developer
   Mode on the phone when asked.)
6. Run destination (top bar) → **Any iOS Device (arm64)**.
7. Menu **Product → Archive**. Wait for the Organizer window.
8. Organizer → select the new archive → **Distribute App** → **App Store
   Connect** → **Distribute** (keep the defaults: automatic signing, upload
   symbols). Xcode validates and uploads.
9. Wait for Apple's "build has completed processing" email (usually 5–30
   minutes). The build appears in App Store Connect under **TestFlight**.

If validation says the bundle ID isn't registered: developer.apple.com →
Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs →
App → Bundle ID (explicit) `com.argadaagdo.app` → Register, then retry.

## 9. App Store Connect → new app → submit

1. appstoreconnect.apple.com → **Apps** → **+** → **New App**: Platform
   **iOS**, Name `ArGadaagdo`, Primary Language **English (U.K.)**, Bundle
   ID `com.argadaagdo.app`, SKU `ARGADAAGDO-IOS-1`, User Access **Full
   Access** → **Create**.
2. **App Information** (sidebar): Subtitle, Category (Food & Drink /
   Shopping), Content Rights: "No, it does not contain, show, or access
   third-party content", Age Rating → **Edit** → answers from section 4.
3. **Pricing and Availability**: Price **Free (0)**. Availability: all
   countries is fine (visitors and expats in Tbilisi often use non-Georgian
   Apple accounts) — but if EU countries are included you must first
   complete the **Digital Services Act trader status** (Business section of
   App Store Connect); a trader's address, phone and email are shown on EU
   storefronts. To skip that for now, limit availability to non-EU
   countries such as Georgia.
4. **App Privacy**: Privacy Policy URL, then **Get Started** → answers from
   section 5 → **Publish**.
5. **iOS App → 1.0 Prepare for Submission**: upload the 6.9" screenshots;
   paste Promotional Text, Description, Keywords, Support URL, Marketing URL,
   Copyright; under **Build** click **+** and pick 1.0.0 (1); fill **App
   Review Information** from section 6; Version Release: **Manually release
   this version** (you choose the launch moment after approval).
6. Top right **Add for Review** → **Submit to App Review**. Status goes to
   "Waiting for Review" (usually reviewed within 24–48 hours).
7. While waiting, keep the demo bag alive (section 2) and watch the support
   inbox and App Store Connect for reviewer messages.

## 10. Rejection risks, most likely first

1. **4.2 Minimum functionality.** The app is the website in a Capacitor
   WebView. It's app-shaped (tab bar, accounts, reservations, pickup codes,
   business dashboard, offline screen, in-app payment sheet), but Apple
   sometimes rejects thin web wrappers. If that happens, the real fix is a
   native feature such as push notifications for pickup reminders.
2. **1.2 User-generated content.** Public review comments have no in-app
   "report" button. If Apple asks, add a Report link to support and
   explain that admins can remove reviews.
3. **2.1 App completeness.** The demo bag must be live during review
   (section 2), and the demo accounts must still exist.

---

# Earlier preparation (2026-09-24, historical)

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

## 5. Screenshots — full set captured, using seeded test data

**Update 2026-09-24 (same day, follow-up pass):** the gaps noted below (no
live offers, checkout unreachable) are now closed. Seeded one TEST customer
account and two TEST demo listings directly in the production Supabase
project specifically so the real offer-browsing, offer-detail, and checkout
screens could be photographed. **This is temporary, clearly-fake data, not
real users or businesses** — full detail, exact IDs, credentials, and a
cleanup snippet are in the **"Test data — temporary, for store screenshots
only"** section below and in `PROJECT_CONTEXT.md`. Delete it before (or
soon after) real pilot businesses start onboarding, using the cleanup SQL
provided.

All 4 screens are now captured across all 3 device profiles:

| # | Screen | Status |
|---|---|---|
| 01 | Home | ✅ |
| 02 | Offers (browse) | ✅ — real card, signed out |
| 03 | Offer detail | ✅ — real offer, signed out |
| 04 | Checkout | ✅ — real signed-in session, pre-payment summary screen only |

**Fixed 2026-09-24 (wrap-up session).** The observation below turned out to
undersell the bug: it wasn't 428px-specific or minor — it was a CSS Grid
sizing issue (`app/offers/page.tsx`'s offers grid had no base `grid-cols-1`,
so its column sized to content instead of viewport) that overflowed at
*every* mobile width, worse at 375/390 than at 428. Fixed by adding
`grid-cols-1`; verified at 375/390/428 in both languages, plus a stress
test with artificially long content. See `PROJECT_CONTEXT.md`'s
"2026-09-24 wrap-up session" note for the full root-cause writeup. The
screenshots in this doc/`store-assets/` predate the fix and would need
recapturing (`node scripts/capture-store-screenshots.mjs`) to show the
corrected layout — not done automatically here since that also re-touches
the seeded test data flow. **2026-10-27: they also predate the green
re-theme** (dark green UI, leaf icon) — recapture every screenshot before
the next submission; the store icons and feature graphics in
`store-assets/` are already the new brand.

<details>
<summary>Original finding (kept for history)</summary>

One minor, pre-existing, unrelated observation surfaced while looking at
`02-offers.png` at the 428px-wide iOS viewport: the offer card's top-right
meta row ("Tomorrow" label + "N BOXES LEFT" chip) appears to run slightly
past the card's right edge at that exact width. Didn't investigate or fix
this — it's a general layout question, not something introduced by or
in scope for this session, but worth a look next time someone's doing UI/QA
work.

</details>

### Screenshots section (original, pre-test-data findings — kept for history)

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

### Test data — temporary, for store screenshots only

**Added 2026-09-24, same-day follow-up, at the user's explicit request**
("create a test customer account and a couple of realistic-looking demo
offers... to capture proper checkout and browsing screenshots... note it
clearly in PROJECT_CONTEXT.md"). This is the only data of any kind
currently in the production database — every `public` table was completely
empty (0 rows) before this. **No real user, business, or offer data exists
yet; nothing real was touched or put at risk.**

No payment/BOG code was exercised to do this — the test account only ever
reaches checkout's pre-payment summary screen, never clicks pay. Created
via Supabase's real signup API (so the `on_auth_user_created` trigger fired
normally and built the `profiles` row exactly as it would for a real
signup) and direct SQL inserts for the business/offer rows (via the
Supabase MCP tools, which run with elevated privileges that bypass RLS —
appropriate here as this is seed data, not something going through the
app's normal customer-facing write paths).

**Test customer** (`auth.users` / `public.profiles`):
- id: `fc1494b5-3606-4db9-bd06-3c0f22937d58`
- email: `test.customer.storeshots@example.com`
- password: **not stored in this repo** — it was shared with the user
  directly in the session that created it, not committed here (a plaintext
  password in git history, even for a scoped test account, is bad
  practice). If it's needed again and lost, reset it via Supabase Dashboard
  → Authentication → Users → find this email → send/set a new password.
- Email came back pre-confirmed on signup — this project has email
  confirmation disabled at the Supabase Auth level (worth knowing
  independent of this task: any real signup today is instantly usable
  without clicking a confirmation link).

**Test businesses** (`public.businesses`, both `approved = true`,
`owner_id = null` — no dashboard access needed for screenshots, so no
second fake account was created):
- id `2`, "Old Town Bakery" (Bakery, 12 Sioni Street, Tbilisi)
- id `3`, "Vake Corner Cafe" (Cafe, 45 Chavchavadze Ave, Tbilisi)

Both are fictional placeholder names — not real Tbilisi businesses, chosen
specifically to avoid implying any real establishment's involvement.

**Test offers** (`public.offers`, both `active = true`, `status = 'active'`,
`pickup_date = '2026-09-25'` — adjust or re-run the seed if this data
outlives that date and the offers expire):
- id `4`, "Surprise Pastry Box" — ₾9.90 (was ₾24.90), business `2`
- id `5`, "Surprise Lunch Bag" — ₾7.50 (was ₾18.00), business `3`

**To remove all of it later** (recommended before real pilot businesses
onboard, so it's never confused with real data):

```sql
delete from public.offers where id in (4, 5);
delete from public.businesses where id in (2, 3);
delete from public.profiles where id = 'fc1494b5-3606-4db9-bd06-3c0f22937d58';
```

Then delete the auth user itself via the Supabase Dashboard
(Authentication → Users → search `test.customer.storeshots@example.com` →
Delete user) rather than raw SQL against `auth.users` — the dashboard
action is the officially supported way to remove an auth user cleanly.

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

### Before either store: in-app account deletion

Both Apple (guideline 5.1.1(v)) and Google Play require apps that allow
sign-up to let users start account deletion inside the app (Google also
wants a web URL for it). Today Settings only links to the contact page —
this is a likely rejection reason and must be built first. It needs a
product/legal decision: deleting an auth user cascades to its orders and
payment records (and, for a business owner, to the business and all its
customers' orders), so deletion should anonymise rather than hard-delete.

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
   screenshots — **re-capture these first**: the committed set shows the
   old offers-grid overflow bug and test offers that expired on
   2026-09-25 (see section 5). The app is iPhone-only
   (`TARGETED_DEVICE_FAMILY = 1`), so no iPad screenshots are needed.
   Under App Review Information, give the reviewer a working demo
   customer account (create a fresh one; don't commit its password) and
   make sure at least one live offer exists during review.
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
   verify install + core flows on a real device. **New personal developer
   accounts must also run a closed test with at least 12 opted-in testers
   for 14 consecutive days before Production access is granted** — start
   this early, it's the longest step.
7. Promote to Production (or a staged rollout, e.g. 20% → 100%) once
   satisfied.
8. Play Console review is typically faster than Apple's, but budget a
   similar buffer for a first submission.

## Bottom line: how much work remains once you have both accounts?

Roughly **half a day to a day of hands-on work per platform**, not
counting store review wait times — most of what's normally the slow part
(icons, splash, listing copy, permissions review, scaffolding verification,
and now a complete real screenshot set with actual browsing/detail/checkout
screens) is already done in this branch. What's left is genuinely
account-gated: signing certs/keys, the TestFlight/Internal Testing
round-trip, and the actual submit action. Worth doing before final
submission: swap the seeded TEST offers (see "Test data" above) for real
pilot-business listings and re-run the screenshot script against those, so
the store listing shows real Tbilisi businesses rather than placeholder
ones — and delete the test data at that point per the cleanup snippet. The
one thing that'd meaningfully shrink or reshuffle this estimate is if
`argadaagdo.ge` goes live before submission — that forces a
`capacitor.config.ts` change and a full rebuild before either store upload,
so if the domain purchase is close, it's worth sequencing that before, not
after, first submission.
