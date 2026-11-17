// Partner guide v3: clean white, minimal, formal Georgian, real app screens.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const DIR = __dirname;
const IMGDIR = path.join(DIR, "..", "guide2", "img");
const FONTS = path.join(DIR, "..", "repo", "public", "fonts", "v5");
const OUT_HTML = path.join(DIR, "guide.html");
const OUT_PDF = path.join(DIR, "ArGadaagdo-EN.pdf");
const META = JSON.parse(fs.readFileSync(path.join(IMGDIR, "meta.json"), "utf8"));
const img = (name) => `file://${path.join(IMGDIR, name)}`;
const TOTAL = 5;

// ---------- fonts (the app's own Noto files) ----------
const GEO = "U+10A0-10FF, U+1C90-1CBF, U+2D00-2D2F";
const face = (family, file, weight, range) =>
  `@font-face{font-family:"${family}";src:url("file://${path.join(FONTS, file)}") format("woff2");font-weight:${weight};font-style:normal;${range ? `unicode-range:${range};` : ""}}`;
const fontCss = [
  ...[300, 400, 500, 600, 700].map((w) => face("Brand Sans", `noto-sans-georgian-georgian-${w}-normal.woff2`, w, GEO)),
  ...[300, 400, 500, 600, 700].map((w) => face("Brand Sans", `noto-sans-latin-${w}-normal.woff2`, w)),
  ...[400, 700].map((w) => face("Brand Serif", `noto-serif-georgian-georgian-${w}-normal.woff2`, w, GEO)),
  ...[400, 700].map((w) => face("Brand Serif", `noto-serif-latin-${w}-normal.woff2`, w)),
].join("\n");

// ---------- icons (Lucide-style line icons, 24×24) ----------
const ICONS = {
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  coins: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2.2"/><path d="M6 12h.01M18 12h.01"/>',
  size: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  box: '<path d="M11 21.7a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.7a2 2 0 0 0 2 0L20.7 7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  filter: '<path d="M3 6h18M7 12h10M10 18h4"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  store: '<path d="M3 9 5 3h14l2 6"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M10 20v-5h4v5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  pause: '<rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  bank: '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10"/><path d="m12 3 9 5H3z"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 2 2V2l-2 2-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
};
const icon = (name, cls = "") =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

let _uid = 0;
// The app icon from the brand banner (leaf with veins), unique gradient ids per use.
const appIcon = (inner) => {
  const u = "i" + (++_uid);
  return `<defs><linearGradient id="${u}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E312B"/><stop offset="1" stop-color="#051F20"/></linearGradient>
<linearGradient id="${u}g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#7FAB8E"/><stop offset=".6" stop-color="#A9CDB4"/><stop offset="1" stop-color="#E6F7EA"/></linearGradient>
<radialGradient id="${u}glow" cx=".55" cy=".5" r=".55"><stop offset="0" stop-color="#8EB69B" stop-opacity=".35"/><stop offset="1" stop-color="#8EB69B" stop-opacity="0"/></radialGradient>
<filter id="${u}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".35"/></filter></defs>
<g ${inner}><rect width="200" height="200" rx="46" fill="url(#${u}bg)"/><rect width="200" height="200" rx="46" fill="url(#${u}glow)"/><path d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z" fill="url(#${u}g)" filter="url(#${u}s)"/>
<g stroke="#DAF1DE" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".45"><path d="M78 124 C90 118, 100 118, 112 124"/><path d="M78 124 C84 112, 86 104, 86 94"/><path d="M98 102 C110 96, 120 96, 132 100"/><path d="M98 102 C104 90, 106 82, 106 72"/><path d="M118 80 C128 76, 134 76, 142 78"/><path d="M118 80 C122 72, 124 66, 124 58"/><path d="M62 144 C72 140, 82 140, 92 144"/><path d="M62 144 C66 134, 66 126, 66 118"/></g>
<path d="M52 152 C74 118, 104 86, 150 50" stroke="#DAF1DE" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".6"/><rect width="200" height="200" rx="46" fill="none" stroke="#235347" stroke-width="2"/></g>`;
};
const logo = (size) => `<svg viewBox="0 0 200 200" style="width:${size}mm;height:${size}mm;flex:none;overflow:visible" aria-hidden="true">${appIcon("")}</svg>`;
const leafShape = (cls) => `<svg class="${cls}" viewBox="0 0 200 200" aria-hidden="true"><path d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z" fill="currentColor"/></svg>`;

// ---------- phone frame around a real screenshot ----------
const r2 = (n) => Math.round(n * 100) / 100;
function phone(name, w, { time = "16:42" } = {}) {
  const m = META[name];
  const bezel = w * 0.03;
  const sw = w - 2 * bezel;
  const sb = sw * 0.122;
  const ih = sw * (m.h / m.w);
  const fg = m.dark ? "#ffffff" : "#0b2b26";
  return `<div class="ph" style="width:${r2(w)}mm;padding:${r2(bezel)}mm;border-radius:${r2(w * 0.165)}mm">
  <i class="btn b1"></i><i class="btn b2"></i><i class="btn b3"></i>
  <div class="ph-scr" style="border-radius:${r2(w * 0.138)}mm">
    <div class="ph-sb" style="height:${r2(sb)}mm;background:${m.top};color:${fg};font-size:${r2(sw * 0.041)}mm;padding:0 ${r2(sw * 0.085)}mm">
      <span class="t">${time}</span>
      <span class="isl" style="width:${r2(sw * 0.31)}mm;height:${r2(sw * 0.088)}mm;top:${r2(sw * 0.024)}mm"></span>
      <span class="sys" style="gap:${r2(sw * 0.014)}mm">
        <svg viewBox="0 0 18 12" style="height:${r2(sw * 0.03)}mm"><rect x="0" y="8" width="3" height="4" rx="0.8" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="0.8" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="0.8" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="0.8" fill="currentColor"/></svg>
        <svg viewBox="0 0 16 12" style="height:${r2(sw * 0.03)}mm"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0z" fill="currentColor"/><path d="M3.4 6.9a6.5 6.5 0 0 1 9.2 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M1 4.4a10 10 0 0 1 14 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>
        <svg viewBox="0 0 27 13" style="height:${r2(sw * 0.032)}mm"><rect x="0.6" y="0.6" width="22.8" height="11.8" rx="3.4" stroke="currentColor" stroke-opacity="0.45" fill="none" stroke-width="1.2"/><rect x="2.4" y="2.4" width="17" height="8.2" rx="2" fill="currentColor"/><path d="M25 4.5v4a2 2 0 0 0 0-4" fill="currentColor" fill-opacity="0.45"/></svg>
      </span>
    </div>
    <img src="${img(name + ".jpg")}" style="height:${r2(ih)}mm" alt="">
  </div>
</div>`;
}


// ---------- extra icons ----------
Object.assign(ICONS, {
  wheat: '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  apple: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
  milk: '<path d="M8 2h8"/><path d="M9 2v2.79a4 4 0 0 1-.67 2.22l-.66 1A4 4 0 0 0 7 10.24V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.76a4 4 0 0 0-.67-2.21l-.66-1A4 4 0 0 1 15 4.79V2"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/>',
  fish: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>',
  split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3"/><path d="m15 9 6-6"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
});

// ---------- shared page parts ----------
const kicker = (n, label) => `<div class="kicker"><span class="kn">${n}</span><span class="kl"></span><span>${label}</span></div>`;
const foot = (n) => `<footer class="foot"><span class="fb">${logo(4.2)}<span>ArGadaagdo · November 2026 · argadaagdo.ge</span></span><span class="pg">${n} / ${TOTAL}</span></footer>`;
const page = (n, cls, body) => `<section class="page ${cls}">${body}${n > 1 ? foot(n) : ""}</section>`;



// ---------- 1. cover ----------
const SLOGAN = "Rescue food, save money";
const p1 = page(1, "banner", `
  <svg class="banner-svg" viewBox="0 0 1024 500" aria-label="ArGadaagdo">
    ${appIcon('transform="translate(90,125) scale(1.25)"')}
    <text x="400" y="235" class="b-title">ArGadaagdo</text>
    <rect x="404" y="262" width="90" height="8" rx="4" fill="#8EB69B"/>
    <text x="404" y="340" class="b-slogan">${SLOGAN}</text>
  </svg>
`);

// ---------- 2. problem + what it is ----------
const stat = (big, unit, text) => `<div class="stat"><b>${big}<small>${unit}</small></b><span>${text}</span></div>`;
const p2 = page(2, "", `
  ${kicker("01", "The problem")}
  <h2>Good food is thrown away every day</h2>
  <p class="what-p">Every year, more than a billion tonnes of food are wasted worldwide. Along with it, we lose the water, land, energy and labour that went into producing it, and the waste itself harms the environment.</p>
  <div class="stats four">
    ${stat("101", " kg", "of food thrown away per person in Georgia each year")}
    ${stat("400,000+", "", "tonnes of food thrown away in Georgia each year")}
    ${stat("1.05", " bn", "tonnes of food wasted worldwide in 2022")}
    ${stat("8–10", "%", "of global greenhouse gas emissions come from food loss and waste")}
  </div>
  <p class="small">Source: UNEP Food Waste Index Report 2021, 2024</p>
  <div class="what2">
    ${kicker("02", "What is ArGadaagdo?")}
    <h2>A platform that rescues food from the bin</h2>
    <p class="what-p">ArGadaagdo is a digital platform that finds new buyers for good food left over at the end of the day. Supermarkets, bakeries and cafés offer this food as surprise boxes for less than the regular price. Customers pay online in advance and collect the box themselves at the set time.</p>
    <img class="stage-img" src="file://${path.join(DIR, "s1b3x.png")}" alt="">
  </div>
`);

// ---------- 3. goal + how it works ----------
const val = (ic, who, text) => `<div class="val"><span class="val-i">${icon(ic)}</span><div><b>${who}</b><span>${text}</span></div></div>`;
const step = (n, text) => `<div class="cap2"><span class="num">${n}</span><p>${text}</p></div>`;
const p3 = page(3, "", `
  ${kicker("03", "Our goal")}
  <p class="goal-big">Our goal is that good food no longer ends up in the bin – and that everyone wins.</p>
  <div class="vals">
    ${val("leaf", "Environment", "Less waste, lower emissions")}
    ${val("users", "Customers", "Good food at a lower price")}
    ${val("store", "Shops", "Income from surplus food")}
  </div>
  <div class="how">
    ${kicker("04", "How it works")}
    <h2>A ready-made system, already live</h2>
    <p class="lead narrow">For customers, it takes three steps. Available on iPhone, Android and at argadaagdo.ge.</p>
    <div class="stage s2">
      ${leafShape("st-leaf")}
      <div class="row4">${phone("home", 35)}${phone("offer", 35)}${phone("swipe", 35)}${phone("biz-today", 35)}</div>
    </div>
    <div class="caps4">
      ${step("1", "Opens the app and sees boxes nearby")}
      ${step("2", "Chooses a box and pays in advance via TBC")}
      ${step("3", "Collects the box in the shop and confirms pickup in front of staff")}
      <div class="cap2"><span class="num alt">+</span><p>Business panel and staff page</p></div>
    </div>
  </div>
`);

// ---------- 4. products + one day ----------
const cat = (ic, name, text) => `<div class="cat"><span class="cat-i">${icon(ic)}</span><div><h3>${name}</h3><p>${text}</p></div></div>`;
const tstep = (time, text, hl) => `<div class="ts${hl ? " hl" : ""}"><span class="ts-t">${time}</span><span class="ts-d"></span><p>${text}</p></div>`;
const p4 = page(4, "", `
  ${kicker("05", "What we sell")}
  <h2>A surprise box for every shop</h2>
  <p class="lead narrow tight">The partner decides the contents, price and quantity. Everything can be adjusted individually.</p>
  <div class="ex2">
    <div>
      <div class="ex-h"><span class="ex-tag">Example: supermarket</span><span>One box per department</span></div>
      <div class="cats">
        ${cat("wheat", "Bakery", "Bread, rolls, pastries")}
        ${cat("utensils", "Deli", "Ready meals and salads of the day")}
        ${cat("apple", "Fruit & vegetables", "Imperfect in shape, but good quality")}
        ${cat("milk", "Dairy", "Milk, yogurt, cheese")}
        ${cat("box", "Dry goods", "Products close to their <span class='nw'>best-before</span> date")}
        ${cat("fish", "Meat & fish", "If the partner allows it")}
      </div>
    </div>
    <div>
      <div class="ex-h"><span class="ex-tag">Example: bakery</span></div>
      <div class="bake">
        ${leafShape("st-leaf")}
        <span class="bake-i">${icon("wheat")}</span>
        <h3>One box for the whole shop</h3>
        <p>No departments: the day's bread, rolls and pastries.</p>
      </div>
    </div>
  </div>
  <p class="rule">Only food that is still within its shelf life.</p>
  <div class="day4">
    ${kicker("06", "In the shop")}
    <h2>A day in the shop</h2>
    <div class="tline">
      ${tstep("Publishing", "Boxes appear in the app automatically at your chosen time")}
      ${tstep("Booking", "Customers reserve boxes and pay in advance")}
      ${tstep("Closing", "Optional: sales close at your chosen time and the quantity is final", true)}
      ${tstep("Preparation", "Staff pack the boxes")}
      ${tstep("Pickup", "Customers collect their boxes at your chosen time")}
    </div>
    <div class="adj">
      <b>Adjustable for each shop or department:</b>
      <span>Times</span><span>Days of the week</span><span>Number of boxes</span><span>Price</span><span>Contents</span>
    </div>
    <p class="small">For example: bakery – pickup 20:00–21:00, Mon–Sat · supermarket – pickup 19:00–22:00, every day.</p>
  </div>
`);

// ---------- 5. payment ----------
const p5 = page(5, "p4", `
  ${kicker("07", "Payouts")}
  <h2>Payment made simple</h2>
  <p class="lead narrow">Customers always pay online in advance – by card, Apple Pay or Google Pay, through TBC Bank's secure payment system.</p>
  <div class="payx">
    <div class="pay-card">
      <span class="pay-i">${icon("split")}</span>
      <h3>TBC Split Payment</h3>
      <p>Each payment is split automatically, and the partner's share goes straight to their account.</p>
    </div>
    <div class="pay-card">
      <span class="pay-i">${icon("bank")}</span>
      <h3>Other Georgian banks</h3>
      <p>We set the payout schedule together:</p>
      <div class="freq"><span>Weekly</span><span>Monthly</span><span>Quarterly</span></div>
    </div>
  </div>
  <div class="avail">
    <div class="eyebrow plain">Available on</div>
    <div class="plats inflow">
      <span>${icon("phone")}iPhone · App Store</span>
      <span>${icon("phone")}Android</span>
      <span>${icon("globe")}argadaagdo.ge</span>
      <span>${icon("store")}Business panel · business.argadaagdo.ge</span>
    </div>
  </div>
  <div class="end2">
    ${leafShape("end-leaf")}
    <div class="end2-l">${logo(16)}<div><b>ArGadaagdo</b><span>${SLOGAN}</span></div></div>
    <div class="end2-r"><span>${icon("globe")}argadaagdo.ge</span><span>${icon("store")}business.argadaagdo.ge</span></div>
  </div>
`);

const css = fs.readFileSync(path.join(DIR, "guide.css"), "utf8");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ArGadaagdo</title>
<style>${fontCss}\n${css}\nbody{hyphens:manual}</style></head><body>
${[p1, p2, p3, p4, p5].join("\n")}
</body></html>`;
fs.writeFileSync(OUT_HTML, html);

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage();
  await pg.goto("file://" + OUT_HTML, { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null))));
  await pg.waitForTimeout(500);
  const report = await pg.evaluate(() => [...document.querySelectorAll(".page")].map((p, i) => {
    const foot = p.querySelector(".foot");
    if (!foot) return { page: i + 1 };
    let maxBottom = 0;
    p.querySelectorAll(":scope > *:not(.foot):not(svg):not(.day4):not(.end2)").forEach((el) => { maxBottom = Math.max(maxBottom, el.getBoundingClientRect().bottom); });
    const anchored = p.querySelector(".day4, .end2");
    const limit = anchored ? anchored.getBoundingClientRect().top : foot.getBoundingClientRect().top;
    const over = [...p.querySelectorAll("h1,h2,h3,p,span,b")].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline").map((e) => e.textContent.slice(0, 25));
    return { page: i + 1, gapMm: Math.round(((limit - maxBottom) * 25.4) / 96), over };
  }));
  console.log(JSON.stringify(report));
  await pg.pdf({ path: OUT_PDF, format: "A4", printBackground: true, preferCSSPageSize: true });
  await browser.close();
})();
