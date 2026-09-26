// Captures app store / play store listing screenshots from the live site
// at the exact pixel dimensions each store's screenshot spec requires.
// Re-run this any time the UI or copy changes enough to need fresh shots:
//
//   node scripts/capture-store-screenshots.mjs
//
// Requires `playwright` (devDependency) with the chromium browser installed
// (`npx playwright install chromium`).
//
// Sizes (verified against current Apple/Google docs, Sept 2026):
//   iOS 6.5" (REQUIRED display size)            -> 1284 x 2778
//   iOS 6.9" (current flagship, optional but
//             recommended — this is what most
//             users actually see by default)     -> 1290 x 2796
//   Android phone (Play's recommended baseline,
//             comfortably inside the 320-3840px /
//             <=2:1 ratio rule)                  -> 1080 x 1920
//
// Screens captured: home, offers (browse), an offer detail, and checkout —
// all signed OUT except checkout, which requires a session
// (/checkout/[id] hard-redirects signed-out visitors to /login). Uses a
// dedicated TEST customer account + two TEST demo offers seeded for this
// purpose — see docs/app-store-submission.md "Test data" section and
// PROJECT_CONTEXT.md for exactly what was created and how to remove it.
// Login is done by actually driving the real /login form (not by
// injecting a session token), so this also doubles as a smoke test of the
// sign-in flow itself.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://argadaagdo-silk.vercel.app";
const OUT_DIR = path.join(process.cwd(), "store-assets", "screenshots");

// TEST-ONLY customer account, seeded specifically for capturing these
// screenshots (see docs/app-store-submission.md). Not a real customer, no
// real payment method attached, never used past checkout's pre-payment
// summary screen. The password is deliberately NOT hardcoded here (no
// plaintext secrets in git) — set it in your shell before running:
//   ARGADAAGDO_TEST_PASSWORD='...' node scripts/capture-store-screenshots.mjs
const TEST_EMAIL =
  process.env.ARGADAAGDO_TEST_EMAIL || "test.customer.storeshots@example.com";
const TEST_PASSWORD = process.env.ARGADAAGDO_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error(
    "Set ARGADAAGDO_TEST_PASSWORD in your environment before running this " +
      "script (needed to sign in for the checkout screenshot). See " +
      "docs/app-store-submission.md, 'Test data' section, for the account.",
  );
  process.exit(1);
}

// Known id of the seeded TEST offer ("Surprise Pastry Box" / Old Town
// Bakery, both fictional — see docs/app-store-submission.md). Navigating
// directly by id is more robust than scraping a link off the offers page:
// its cards render via a <button onClick={() => router.push(...)}>, not a
// real <a href>, so there's no anchor to scrape in the first place.
const TEST_OFFER_ID = process.env.ARGADAAGDO_TEST_OFFER_ID || "4";

const PROFILES = [
  {
    name: "ios-6.5in",
    dir: "ios-6.5in-1284x2778",
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "ios-6.9in",
    dir: "ios-6.9in-1290x2796",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "android",
    dir: "android-1080x1920",
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  },
];

async function waitForOffersToLoad(page) {
  // The offers grid is fetched client-side after mount — wait for the
  // "View details" button on a real offer card (cards navigate via
  // router.push() on a <button>, not a real <a href>, so there's no link
  // to wait on) rather than a fixed timeout.
  await page
    .getByRole("button", { name: "View details" })
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => null);
}

async function signIn(page) {
  await page.goto(BASE_URL + "/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).last().click();
  // Signing in redirects away from /login on success.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15000,
  });
  await page.waitForLoadState("networkidle");
}

async function run() {
  const browser = await chromium.launch();

  for (const profile of PROFILES) {
    const outDir = path.join(OUT_DIR, profile.dir);
    await mkdir(outDir, { recursive: true });

    const context = await browser.newContext({
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      isMobile: profile.isMobile,
      hasTouch: profile.hasTouch,
      userAgent: profile.userAgent,
    });
    // Suppress the "Install ArGadaagdo" PWA prompt (components/InstallAppPrompt.tsx)
    // — it's real, useful in production, but it covers the content we're
    // trying to photograph, and store screenshots should show the app, not
    // an install nag.
    await context.addInitScript(() => {
      window.localStorage.setItem("argadaagdo-install-dismissed", "true");
    });

    const page = await context.newPage();

    console.log(`\n[${profile.name}] -> ${outDir}`);

    // 1) Home
    await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "01-home.png") });
    console.log("  01-home.png");

    // 2) Offers (browse) — signed out, the typical first-time-visitor view.
    // The actual offer cards render well below the hero/filters, off the
    // first viewport, so scroll one into view rather than screenshotting
    // the top of the page.
    await page.goto(BASE_URL + "/offers", { waitUntil: "networkidle" });
    await waitForOffersToLoad(page);
    await page
      .getByRole("button", { name: "View details" })
      .first()
      .scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "02-offers.png") });
    console.log("  02-offers.png");

    // 3) Offer detail
    await page.goto(BASE_URL + "/offers/" + TEST_OFFER_ID, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "03-offer-detail.png") });
    console.log("  03-offer-detail.png");

    // 4) Checkout — requires a signed-in, email-confirmed session.
    await signIn(page);
    await page.goto(BASE_URL + "/checkout/" + TEST_OFFER_ID, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "04-checkout.png") });
    console.log("  04-checkout.png");

    await context.close();
  }

  await browser.close();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
