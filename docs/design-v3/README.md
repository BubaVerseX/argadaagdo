# Design v3 — reference mock-ups

Static HTML mock-ups approved by the founder on 2026-11-04. They are
**references to copy the look from**, not code to ship: open each file in a
browser (the `support.js` line will 404; ignore it, the inline styles still
render) or just read the inline styles.

| File | Screen | Style |
|---|---|---|
| `B3Home.dc.html` | App home (customer) | colourful |
| `B3Bag.dc.html` | Offer / bag page | colourful |
| `B3Checkout.dc.html` | Checkout | colourful |
| `B3Orders.dc.html` | My orders + pickup code | colourful |
| `B3Business.dc.html` | Business dashboard (mobile) | colourful |
| `B3Web.dc.html` | Website home (logged out, desktop + responsive) | calm / professional |

Decision: **the app (logged-in screens, mobile-first) is colourful; the public
website (landing, how it works, for businesses) is calm** — thin type,
quiet buttons, colour only as small accents.

## App (colourful)

- Ground cream `#F7F1E3`; deep green `#0F3A32` (headers, nav, primary dark
  buttons), deep green 2 `#164A3F`, mint `#B8E6C4` (active nav, primary
  button on dark), ink `#0B2B26`, secondary text `#4E6B63`.
- Category colours (card background / pill / bag page header):
  ცომეული honey `#F4C15D` (photo `#E7A93A`, text `#2E1F00`/`#5C3D00`),
  ხილ-ბოსტნეული sage `#8FD19E` (text `#0F3A32`), რძის ნაწარმი sky `#A9C8F2`
  (text `#11305C`), კულინარია coral `#F2997A` (text `#3D1405`),
  შერეული: use mint.
- Fonts: Noto Serif Georgian 700 for screen titles and business names;
  Noto Sans Georgian 400/500/700 for everything else.
- Shapes: section headers end in a soft SVG wave into the cream; photos have
  one large rounded corner (`border-radius: 22px 60px 22px 22px`); a large
  faint leaf (logo path) in header backgrounds; discount sticker = dark circle
  rotated −8…−10°.
- Bottom nav: floating dark-green pill, active tab = mint pill with label.
- Bag page: S/M/L segmented control, "how it works" 3 coloured steps joined by
  a dashed wavy line, fixed dark bottom bar with mint "დაჯავშნა".
- Business dashboard: dark header with stats, mint "publish bag" card,
  today's bags in their category colour with sold/total progress bar,
  swipe-to-collect bar fixed at the bottom.

## Website (calm)

- Same palette, but: Noto Serif Georgian **400** headings (h1 44px), Noto Sans
  Georgian **300** body (15–16px, line-height 1.7), 500 for labels.
- Buttons: 10px radius, 12px 22px padding, weight 500; primary = cream on
  green or green outline; no big yellow buttons.
- Cards: white with 1px `#E6DECB` border; colour only as a 32×4px accent line.
- Small uppercase-style eyebrow labels (13px, letter-spacing .08em).
- No 70/30 bar on the public site; pricing line: "ყოველთვიური გადასახადის
  გარეშე. საკომისიოს იხდი მხოლოდ გაყიდულ ჩანთაზე."

Sample numbers, names and addresses in the mock-ups are placeholders; use
real data.
