# Green Bag deploy-day checklist

Branch `claude/green-bag`, PR #28. Run top to bottom on the day the founder
says "deploy". Steps 1–3 are already done (2026-11-01); the rest waits.

Why the order matters: the new web code reads `offers.size`,
`offers.department_id` and the `departments` / `bag_templates` tables (so
the schema must exist before the code), while migration 4 changes live
commissions (so it must not run before the business decisions below are
made).

## 1. Migrations 1–3 ✓ (applied 2026-11-01)

Applied to production through the Supabase MCP, recorded as:

| Version | Name | What |
|---|---|---|
| `20261101110454` | `green_bag_sizes` | `offers.size`, `offers.unlimited_quantity` |
| `20261101110658` | `departments_and_bag_templates` | `departments`, `bag_templates`, offer columns, pause, templates, staff PIN tables |
| `20261101160000`\* | `staff_pin_status` | staff RPCs that return statuses (`staff_session`, `staff_collect`, `staff_pause`) so per-device lockouts persist |
| `20261101110702` | `swipe_to_collect` | `orders.customer_collected_at`, `collect_my_order`, `undo_collect_my_order` |

\* repo file name; the live version number is the one in Supabase →
Database → Migrations ("staff_pin_status").

All additive. The live app (`main`) ignores them; the App Review demo flow
is unchanged. Verified on the preview: template → published offer →
reserve → swipe-collect → dashboard shows collected → undo → verify by
code → "Today: no bags" → staff PIN page.

## 2. Merge PR #28 → `main`

- Confirm Apple has finished reviewing iOS 1.0.0, or accept that the
  reviewer will see the Green Bag naming (the demo bag title, the code flow
  and the reviewer notes are unchanged, so the review steps still work).
- Merge. Vercel deploys `main` automatically (about a minute).

## 3. Deploy checks (right after the merge)

- Open `/business/dashboard` as the demo business: the "Green Bags on
  sale" panel, the templates panel and the offer form with Size show up;
  no red notice.
- Open `/orders` as the demo customer: orders load (this page now reads
  `offers.size`).
- `vercel.json` now has the third cron `/api/cron/publish-green-bags`
  (15:00 UTC). Check Vercel → Project → Settings → Cron Jobs lists it and
  that `CRON_SECRET` is set in Production.
- Optional smoke test of the job: `curl -H "Authorization: Bearer $CRON_SECRET"
  https://argadaagdo-silk.vercel.app/api/cron/publish-green-bags` → `{ ok: true }`.

## 4. Migration 4 — `20261101150000_platform_fee_rate.sql`

**Changes live commissions from the hard-coded 10% to the per-business
rate (30% default) the moment it is applied.** Apply it in one sitting
with steps 5 and 6, outside peak pickup hours.

Supabase → SQL editor → paste the file (it has `begin; … commit;`) → run.
Or through the MCP `apply_migration` with name `platform_fee_rate`.

Dry-run was done on 2026-11-01 (rolled back): 9.00 GEL → 2.70 fee /
6.30 business at 30%; 0% leaves 9.00 to the business.

## 5. Demo bakery and fixtures

Right after migration 4:

```sql
-- App Review demo bakery (business 14): 0 GEL bags, keep the fee at 0 so
-- the demo order rows stay all-zero.
select public.set_business_platform_fee_rate(14, 0);
-- Old Town Bakery test fixture (business 2), used for store screenshots:
select public.set_business_platform_fee_rate(2, 0);
```

## 6. Pilot partners → 0%

For every pilot partner business, either run
`select public.set_business_platform_fee_rate(<business id>, 0);` or use
the **Platform commission** field on the admin dashboard (Approved
businesses → the business → set 0 → Save rate). New businesses default to
30%. The rate applies to reservations made after the change; existing
orders keep the fee recorded on them.

## 7. Afterwards

- Add the Georgian wording fixes to the store listings if they quote the
  app (`docs/play-store-submission.md`, the iOS kit): "მწვანე ჩანთა",
  "წაღების დრო", "დადასტურებული ბიზნესები", "პლატფორმა".
- Walk one real partner through: departments (only if they need them),
  one template per bag size, "Publish for today", the staff link + PIN.
- Watch the first 19:00 cron run in Vercel → Logs; it reports
  `{ created: { "<today>": n, "<tomorrow>": m } }`.

## Rollback

Each migration file ends with a commented Down block. Reverting the code
alone (redeploy `main` before the merge) is safe with migrations 1–3 in
place; migration 4's Down restores the 10% calculation.
