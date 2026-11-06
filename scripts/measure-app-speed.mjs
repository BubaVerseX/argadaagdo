// Measures how fast each app screen becomes visible, the way the native app
// loads it: iPhone viewport, window.Capacitor present (app mode), 4× slower
// CPU and a 10 Mbit/s 4G-like link. Cold = empty cache; warm = second launch.
//
//   node scripts/measure-app-speed.mjs [baseUrl] [label]
//
// Prints a table and writes JSON next to the label (for before/after).

import { chromium, devices } from "playwright";
import { writeFile } from "node:fs/promises";

const BASE = process.argv[2] || "https://argadaagdo.ge";
const LABEL = process.argv[3] || "run";
const RUNS = Number(process.env.RUNS || 3);

// Each screen counts as visible when its main content (not a skeleton) paints.
const SCREENS = [
  { name: "Home", path: "/", ready: 'a[href^="/offers/"]' },
  { name: "Offer", path: "/offers/__OFFER__", ready: "[data-screen-ready], h1" },
  { name: "Map", path: "/map", ready: "[data-screen-ready], h1" },
  { name: "Orders", path: "/orders", ready: "[data-screen-ready], h1, form" },
  { name: "Profile", path: "/profile", ready: "[data-screen-ready], h1, form" },
  { name: "Login", path: "/login", ready: "form input[type=email]" },
  { name: "Settings", path: "/settings", ready: "[data-screen-ready], h1, form" },
];

const capacitorStub = () => {
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
};

async function measure(browser, screen, warm) {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  await context.addInitScript(capacitorStub);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 20,
    downloadThroughput: (10 * 1024 * 1024) / 8,
    uploadThroughput: (3 * 1024 * 1024) / 8,
  });

  if (warm) {
    await page.goto(BASE + screen.path, { waitUntil: "load" });
    await page.waitForTimeout(1500);
  }

  const bytes = { script: 0, stylesheet: 0, font: 0, image: 0, document: 0, fetch: 0, other: 0 };
  let requests = 0;
  const types = new Map();
  cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type));
  cdp.on("Network.loadingFinished", (e) => {
    requests += 1;
    const t = (types.get(e.requestId) || "other").toLowerCase();
    const key = t === "xhr" ? "fetch" : t in bytes ? t : "other";
    bytes[key] += e.encodedDataLength;
  });

  const start = Date.now();
  await page.goto(BASE + screen.path, { waitUntil: "commit" });
  let visibleMs = null;
  try {
    await page.locator(screen.ready).first().waitFor({ state: "visible", timeout: 15000 });
    visibleMs = Date.now() - start;
  } catch {
    visibleMs = null;
  }
  const paint = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const nav = performance.getEntriesByType("navigation")[0];
    return { fcp: fcp ? Math.round(fcp.startTime) : null, ttfb: nav ? Math.round(nav.responseStart) : null };
  });
  await page.waitForTimeout(1200);
  await context.close();
  return { visibleMs, ...paint, requests, kb: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)])) };
}

const median = (values) => {
  const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

const browser = await chromium.launch();
// A real offer id for the detail screen.
const feed = await fetch(BASE + "/api/native/feed").then((r) => r.json()).catch(() => null);
const offerId = feed?.offers?.[0]?.id ?? 1;

const results = [];
for (const screen of SCREENS) {
  const s = { ...screen, path: screen.path.replace("__OFFER__", String(offerId)) };
  for (const warm of [false, true]) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, s, warm));
    const last = runs[runs.length - 1];
    results.push({
      screen: s.name,
      cache: warm ? "warm" : "cold",
      visibleMs: median(runs.map((r) => r.visibleMs)),
      fcpMs: median(runs.map((r) => r.fcp)),
      ttfbMs: median(runs.map((r) => r.ttfb)),
      requests: last.requests,
      ...Object.fromEntries(Object.entries(last.kb).map(([k, v]) => [`${k}KB`, v])),
    });
  }
}
await browser.close();
console.table(results);
await writeFile(`speed-${LABEL}.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
