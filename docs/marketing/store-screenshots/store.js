// Real app screens with example data: the local app in app mode (fake
// window.Capacitor), network answers mocked in the browser.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = "http://localhost:3123";
const OUT = __dirname;
const BAG = fs.readFileSync(path.join(OUT, "argadaagdo-lunch-bag.jpg"));
const BOX = fs.readFileSync(path.join(OUT, "argadaagdo-lunch-box.jpg"));
const IMG = (name) => `https://example.supabase.co/storage/v1/object/public/offer-images/${name}`;

function today(offsetDays = 0) {
  const d = new Date(Date.now() + 4 * 3600e3 + offsetDays * 864e5);
  return d.toISOString().slice(0, 10);
}
// Pickup window that is open now (so the swipe button shows).
function hm(date) {
  return new Date(date.getTime() + 4 * 3600e3).toISOString().slice(11, 16);
}
const now = new Date();
const hourStart = new Date(now); hourStart.setMinutes(0, 0, 0);
const openStart = hm(hourStart);
const openEnd = hm(new Date(hourStart.getTime() + 3 * 3600e3));

const business = (id, name, address, type, lat, lng) => ({
  id, name, address, business_type: type, approved: true, latitude: lat, longitude: lng,
});
const B1 = business(1, "საცხობი — ვაკე", "ჭავჭავაძის გამზ. 12", "bakery", 41.709, 44.76);
const B2 = business(2, "კაფე — საბურთალო", "ვაჟა-ფშაველას გამზ. 40", "cafe", 41.727, 44.75);
const B3 = business(3, "სუპერმარკეტი — დიდუბე", "წერეთლის გამზ. 101", "supermarket", 41.74, 44.78);
const B4 = business(4, "რესტორანი — ძველი თბილისი", "ლესელიძის ქ. 8", "restaurant", 41.692, 44.807);

const offer = (id, b, title, category, size, price, old, qty, start, end, image) => ({
  id, business_id: b.id, title, category, size, price, old_price: old, quantity: qty,
  unlimited_quantity: false, pickup_date: today(), pickup_start: start, pickup_end: end,
  image_url: IMG(image), active: true, status: "active", description: "დღის ბოლოს დარჩენილი ახალი ცომეული: პური, ფუნთუშები და ნამცხვრები.",
  created_at: new Date().toISOString(), businesses: b,
});
const OFFERS = [
  offer(41, B1, "საცხობის ბოქსი", "Bakery", "M", 9, 25, 3, "19:00", "21:00", "bag.jpg"),
  offer(42, B2, "კაფეს ბოქსი", "Deli", "S", 7, 18, 5, "18:00", "20:00", "box.jpg"),
  offer(43, B3, "ხილ-ბოსტნეულის ბოქსი", "Fruit & veg", "L", 12, 35, 8, "20:00", "22:00", "box.jpg"),
  offer(44, B4, "სადილის ბოქსი", "Mixed", "M", 10, 28, 2, "21:00", "22:30", "bag.jpg"),
];
const RATINGS = [
  { business_id: 1, average_rating: 4.8, rating_count: 37 },
  { business_id: 2, average_rating: 4.6, rating_count: 21 },
  { business_id: 3, average_rating: 4.7, rating_count: 54 },
];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 6;
const USER = {
  id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated",
  email: "", phone: "995599000000", confirmed_at: new Date().toISOString(), phone_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "phone" }, user_metadata: { role: "customer" }, created_at: new Date().toISOString(),
};
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, exp, role: "authenticated", aud: "authenticated" })}.sig`;
const SESSION = { access_token: JWT, token_type: "bearer", expires_in: 21600, expires_at: exp, refresh_token: "r", user: USER };
const ORDER = {
  id: 65, user_id: USER.id, offer_id: 41, status: "confirmed", payment_method: "card", has_pickup_code: true,
  amount: 9, platform_fee: 2.7, business_amount: 6.3, created_at: new Date(Date.now() - 3 * 3600e3).toISOString(),
  cancelled_at: null, cancelled_reason: null, completed_at: null, no_show_at: null, rated_at: null, quantity_restored_at: null,
  offers: { id: 41, title: "საცხობის ბოქსი", pickup_date: today(), pickup_start: openStart, pickup_end: openEnd, price: 9, quantity: 3,
    active: true, category: "Bakery", size: "M", businesses: { name: B1.name, address: B1.address, business_type: "bakery" } },
};

const BIMG = (n) => `https://example.supabase.co/storage/v1/object/public/offer-images/${n}`;
const btoday = () => new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
const biso = (minAgo) => new Date(Date.now() - minAgo * 60e3).toISOString();
const bb64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const bexp = Math.floor(Date.now() / 1000) + 3600 * 6;
const BUSER = {
  id: "00000000-0000-4000-8000-0000000000b1", aud: "authenticated", role: "authenticated",
  email: "owner@example.ge", phone: "995599000001", confirmed_at: biso(9999), email_confirmed_at: biso(9999),
  app_metadata: { provider: "email" }, user_metadata: { role: "business" }, created_at: biso(9999),
};
const BJWT = `${bb64({ alg: "HS256", typ: "JWT" })}.${bb64({ sub: BUSER.id, bexp, role: "authenticated" })}.sig`;
const BSESSION = { access_token: BJWT, token_type: "bearer", expires_in: 21600, expires_at: bexp, refresh_token: "r", user: BUSER };
const BCONSENT = "2026-11-07";

const BIZ = {
  id: 1, owner_id: BUSER.id, name: "საცხობი — ვაკე", address: "ჭავჭავაძის გამზ. 12", business_type: "Bakery",
  approved: true, rejected_at: null, rejection_reason: null, created_at: biso(99999), description: "ყოველდღე ახალი პური და ნამცხვრები.",
  phone: "+995599000001", logo_url: null, cover_url: null, latitude: 41.709, longitude: 44.76, sales_paused_on: null,
  platform_fee_rate: 0.3, opening_hours: null, legal_name: "შპს საცხობი", identification_code: "400000000", legal_form: "llc",
  owner_full_name: "გიორგი", phone_verified_at: biso(9999), iban_holder_confirmed_at: biso(9999), verification_submitted_at: biso(9999),
};
const DEPT = { id: "11111111-1111-4111-8111-111111111111", business_id: 1, name: "მთავარი", is_default: true, has_staff_pin: false, sales_paused_on: null, created_at: biso(99999) };
const BTEMPLATE = {
  id: 7, business_id: 1, department_id: DEPT.id, title: "საცხობის ბოქსი", description: "დღის ბოლოს დარჩენილი პური, ფუნთუშები და ნამცხვრები.",
  category: "Bakery", size: "M", price: 9, old_price: 25, daily_quantity: 5, pickup_start: "19:00", pickup_end: "21:00",
  weekdays: [0, 1, 2, 3, 4, 5, 6], publish_days_before: 0, publish_time: "08:00", active: true, image_url: BIMG("bag.jpg"), created_at: biso(99999),
};
const BOFFER = {
  id: 41, business_id: 1, department_id: DEPT.id, template_id: 7, title: "საცხობის ბოქსი", description: BTEMPLATE.description,
  category: "Bakery", size: "M", price: 9, old_price: 25, quantity: 2, unlimited_quantity: false, pickup_date: btoday(),
  pickup_start: "19:00", pickup_end: "21:00", image_url: BIMG("bag.jpg"), active: true, status: "active", created_at: biso(600),
  businesses: { name: BIZ.name, address: BIZ.address, business_type: "bakery" },
};
const border = (id, status, minAgo, done) => ({
  id, user_id: "c" + id, offer_id: 41, status, payment_method: "card", has_pickup_code: true, amount: 9, platform_fee: 2.7,
  business_amount: 6.3, created_at: biso(minAgo), cancelled_at: null, cancelled_reason: null, completed_at: done ? biso(done) : null,
  no_show_at: null, rated_at: null, quantity_restored_at: null, customer_email: `n***@gmail.com`, customer_hint: "ნ***",
  reliability_score: 100, offers: BOFFER,
});
const BORDERS = [border(67, "confirmed", 20), border(66, "confirmed", 45), border(65, "completed", 90, 8)];

async function setup(context, signedIn = false) {
  if (signedIn) {
    await context.addInitScript((session) => {
      try {
        localStorage.setItem("sb-example-auth-token", JSON.stringify(session.s));
        localStorage.setItem(`argadaagdo-consent:${session.s.user.id}:${session.v}`, "1");
      } catch {}
    }, { s: SESSION, v: "2026-11-07" });
  }
  await context.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {} };
    try {
      localStorage.setItem("argadaagdo-language", "ka");
      localStorage.setItem("argadaagdo-welcomed", "1");
    } catch {}
  });
  await context.route("**/api/native/feed*", (route) =>
    route.fulfill({ json: { offers: OFFERS, ratings: RATINGS } })
  );
  await context.route("**/api/native/offers/*", (route) => {
    const id = Number(route.request().url().split("/").pop());
    const found = OFFERS.find((o) => o.id === id) || OFFERS[0];
    return route.fulfill({ json: { offer: found, rating: RATINGS[0], ...found } });
  });
  await context.route("**/_next/image**", (route) => {
    const url = decodeURIComponent(route.request().url());
    return route.fulfill({ body: url.includes("box.jpg") ? BOX : BAG, contentType: "image/jpeg" });
  });
  await context.route("https://example.supabase.co/storage/**", (route) =>
    route.fulfill({ body: route.request().url().includes("box.jpg") ? BOX : BAG, contentType: "image/jpeg" })
  );
  await context.route("https://example.supabase.co/rest/**", (route) => {
    const req = route.request(); const url = req.url();
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (url.includes("/rpc/get_my_pickup_codes")) return route.fulfill({ json: [{ order_id: 65, pickup_code: "287990" }] });
    if (url.includes("/rpc/collect_my_order")) return route.fulfill({ json: "collected" });
    if (url.includes("/rest/v1/orders")) return route.fulfill({ json: single ? ORDER : [ORDER] });
    if (url.includes("/rest/v1/profiles")) {
      const profile = { id: USER.id, role: "customer", email: null, full_name: "ნინო", phone: "+995599000000", phone_verified_at: new Date().toISOString(), data_transfer_consent: "2026-11", avatar_url: null };
      return route.fulfill({ json: single ? profile : [profile] });
    }
    return route.fulfill({ json: single ? {} : [] });
  });
  await context.route("https://example.supabase.co/auth/**", (route) => {
    if (route.request().url().includes("/user")) return route.fulfill({ json: USER });
    return route.fulfill({ status: 401, json: {} });
  });
}


const PLATFORM = process.argv[2] || "ios";
const SPEC = PLATFORM === "ios"
  ? { w: 440, h: 956, top: 62, bottom: 34, dir: "ios-6.9in-1320x2868", ua: undefined }
  : { w: 412, h: 892, top: 28, bottom: 0, dir: "android-1236x2676", ua: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36" };
const OUTDIR = path.join(OUT, "store", SPEC.dir);
const CLOCK = new Date(`${today()}T19:41:00+04:00`);
const CLOCK_TEXT = "19:41";
fs.mkdirSync(OUTDIR, { recursive: true });

const ICON_SIG = `<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>`;
const ICON_WIFI = `<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.3-2.6a3.2 3.2 0 0 0-4.6 0z M3.4 6.6a6.6 6.6 0 0 1 9.2 0l1.5-1.6a8.8 8.8 0 0 0-12.2 0z M0 3.3a11.4 11.4 0 0 1 16 0L14.5 1.7a13.5 13.5 0 0 0-13 0z" fill="currentColor"/></svg>`;
const ICON_BAT = `<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><rect x="24.5" y="4.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5"/></svg>`;

async function decorate(page) {
  await page.addStyleTag({ content: `
    :root { --safe-area-inset-top: ${SPEC.top}px; --safe-area-inset-bottom: ${SPEC.bottom}px; }
    nextjs-portal { display: none !important; } .support-chat-launcher { display: none !important; }
    #store-sb { position: fixed; z-index: 2147483647; left: 0; right: 0; top: 0; height: ${SPEC.top}px; display: flex; align-items: center; justify-content: space-between; color: #fff; pointer-events: none;
      font: 600 ${PLATFORM === "ios" ? 17 : 14}px -apple-system, "SF Pro Text", "Noto Sans", sans-serif; padding: ${PLATFORM === "ios" ? "8px 32px 0 52px" : "0 16px"}; box-sizing: border-box; }
    #store-sb .r { display: flex; gap: ${PLATFORM === "ios" ? 7 : 6}px; align-items: center; }
  ` });
  await page.evaluate(({ sig, wifi, bat, clock, top }) => {
    const sb = document.createElement("div"); sb.id = "store-sb";
    sb.innerHTML = `<span>${clock}</span><span class="r">${sig}${wifi}${bat}</span>`;
    document.documentElement.appendChild(sb);
      // Full-screen overlays (pickup) pad with env() only: give them the same inset.
    document.querySelectorAll("[style]").forEach((el) => {
      if ((el.getAttribute("style") || "").includes("safe-area-inset-top")) el.style.paddingTop = `${top + 12}px`;
    });
  }, { sig: ICON_SIG, wifi: ICON_WIFI, bat: ICON_BAT, clock: CLOCK_TEXT, top: SPEC.top });
  await page.waitForTimeout(400);
}

async function newContext(browser) {
  return browser.newContext({ viewport: { width: SPEC.w, height: SPEC.h }, deviceScaleFactor: 3, hasTouch: true, isMobile: true,
    locale: "ka-GE", timezoneId: "Asia/Tbilisi", ...(SPEC.ua ? { userAgent: SPEC.ua } : {}) });
}

(async () => {
  const browser = await chromium.launch();
  // Customer: signed out (home, offer) and signed in (orders, swipe, done)
  for (const signedIn of [false, true]) {
    const context = await newContext(browser);
    await setup(context, signedIn);
    const page = await context.newPage();
    await page.clock.setFixedTime(CLOCK);
    const steps = signedIn
      ? [["03-orders", async () => { await page.goto(BASE + "/orders", { waitUntil: "networkidle" }); await page.waitForTimeout(3000); }],
         ["04-pickup", async () => { await page.getByRole("button", { name: /წაღება →/ }).first().click(); await page.waitForTimeout(1500); }]]
      : [["01-home", async () => { await page.goto(BASE + "/", { waitUntil: "networkidle" }); await page.waitForTimeout(3000); }],
         ["02-offer", async () => { await page.goto(BASE + "/offers/41", { waitUntil: "networkidle" }); await page.waitForTimeout(3000); }]];
    for (const [name, go] of steps) {
      await go();
      await decorate(page);
      await page.screenshot({ path: path.join(OUTDIR, `${name}.png`) });
      await page.evaluate(() => document.getElementById("store-sb")?.remove());
      console.log(PLATFORM, name);
    }
    await context.close();
  }
  // Business panel (today)
  {
    const context = await newContext(browser);
    await context.addInitScript((d) => {
      try {
        localStorage.setItem("argadaagdo-language", "ka");
        localStorage.setItem("sb-example-auth-token", JSON.stringify(d.s));
        localStorage.setItem(`argadaagdo-consent:${d.s.user.id}:${d.v}`, "1");
      } catch {}
    }, { s: BSESSION, v: BCONSENT });
    await context.route("**/_next/image**", (r) => r.fulfill({ body: BAG, contentType: "image/jpeg" }));
    await context.route("https://example.supabase.co/storage/**", (r) => r.fulfill({ body: BAG, contentType: "image/jpeg" }));
    await context.route("https://example.supabase.co/auth/**", (r) => r.request().url().includes("/user") ? r.fulfill({ json: BUSER }) : r.fulfill({ status: 401, json: {} }));
    await context.route("https://example.supabase.co/rest/**", (r) => {
      const req = r.request(); const url = req.url();
      const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      const send = (rows) => r.fulfill({ json: single ? (Array.isArray(rows) ? rows[0] ?? null : rows) : rows });
      if (url.includes("/rpc/get_my_businesses")) return r.fulfill({ json: [BIZ] });
      if (url.includes("/rpc/")) return r.fulfill({ json: null });
      if (url.includes("/rest/v1/profiles")) return send([{ id: BUSER.id, role: "business", email: BUSER.email, full_name: "გიორგი", phone: "+995599000001", phone_verified_at: biso(9999) }]);
      if (url.includes("/rest/v1/businesses")) return send([BIZ]);
      if (url.includes("/rest/v1/departments")) return send([DEPT]);
      if (url.includes("/rest/v1/bag_templates")) return send([BTEMPLATE]);
      if (url.includes("/rest/v1/offers")) return send([BOFFER]);
      if (url.includes("/rest/v1/orders")) return send(BORDERS);
      return send([]);
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(CLOCK);
    await page.goto("http://business.localhost:3123/business/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    await decorate(page);
    await page.screenshot({ path: path.join(OUTDIR, "05-business.png") });
    console.log(PLATFORM, "05-business");
    await context.close();
  }
  await browser.close();
})();
