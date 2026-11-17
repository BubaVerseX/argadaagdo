# Marketing and store material

Saved here so nothing lives only on one computer.

## guide/
Business guide PDFs (5 pages, no names, "ნოემბერი 2026 · argadaagdo.ge").

| File | What |
|---|---|
| `არ-გადააგდო.pdf` | Georgian guide (proofread, 14 Nov 2026) |
| `ArGadaagdo-EN.pdf` | English guide, slogan "Rescue food, save money" |
| `არ-გადააგდო-ვერსია-1.pdf` | Georgian, problem first (15 Nov 2026) |
| `არ-გადააგდო-ვერსია-2.pdf` | Georgian, solution first (15 Nov 2026) |

`source/` holds the HTML/CSS build scripts (Node + Playwright `page.pdf`).
They were written for a one-off workspace, so paths inside may need adjusting.

## store-screenshots/
Store screenshots of the current design (example data, Georgian UI), 5 each:
home, offer, orders, pickup (swipe), business panel. JPEG, no alpha.

| Folder | Used for |
|---|---|
| `ios-6.3in-1206x2622/` | App Store, version 1.0.1 (uploaded 15 Nov 2026; Apple uses them for all iPhone sizes) |
| `ios-6.9in-1320x2868/` | App Store 6.9" originals |
| `android-1236x2676/` | Google Play phone screenshots (uploaded 15 Nov 2026, Georgian + English listing) |

`store.js` is the Playwright script that rendered them against a local dev
server with mocked Supabase data.
