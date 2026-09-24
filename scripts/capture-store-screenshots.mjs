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
// Screens captured: home, offers (browse), an offer detail (only if a live
// offer exists to link to — see below), and sign-in. Both /checkout/[id]
// and /business/register hard-redirect signed-out visitors straight to
// /login, so neither renders anything screenshot-worthy without a real
// session — see docs/app-store-listing.md for the full explanation. The
// /login redirect target happens to double as a decent dual-sided
// ("For customers" / "For businesses") value-prop screen, so it's kept as
// the 4th shot rather than dropped.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://argadaagdo-silk.vercel.app";
const OUT_DIR = path.join(process.cwd(), "store-assets", "screenshots");

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
  // The offers grid is fetched client-side after mount — wait for a real
  // offer card link rather than a fixed timeout.
  await page
    .waitForSelector('a[href^="/offers/"]', { timeout: 15000 })
    .catch(() => null);
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

    // 2) Offers (browse)
    await page.goto(BASE_URL + "/offers", { waitUntil: "networkidle" });
    await waitForOffersToLoad(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "02-offers.png") });
    console.log("  02-offers.png");

    // Grab a real offer id to open its detail page.
    const offerHref = await page
      .locator('a[href^="/offers/"]')
      .first()
      .getAttribute("href")
      .catch(() => null);

    // 3) Offer detail
    if (offerHref) {
      await page.goto(BASE_URL + offerHref, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(outDir, "03-offer-detail.png"),
      });
      console.log("  03-offer-detail.png");
    } else {
      console.log(
        "  [skip] 03-offer-detail.png — no live offers found to link to right now",
      );
    }

    // 4) Sign-in (both /checkout/[id] and /business/register redirect here
    //    for signed-out visitors — see script header).
    await page.goto(BASE_URL + "/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "04-sign-in.png") });
    console.log("  04-sign-in.png");

    await context.close();
  }

  await browser.close();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
