# ArGadaagdo Production Reliability Runbook

This runbook is for the first production pilot. Keep it simple, repeatable and
boring. During an incident, use this file before guessing.

## Monitoring

Primary runtime check:

```bash
curl https://argadaagdo-silk.vercel.app/api/health
```

Detailed runtime check:

```bash
curl \
  -H "Authorization: Bearer $HEALTH_CHECK_SECRET" \
  https://argadaagdo-silk.vercel.app/api/health
```

The health endpoint checks:

- required runtime environment variables
- Supabase database connectivity
- `offer-images` Supabase Storage bucket access
- deployed app version and runtime metadata

Expected statuses:

- `ok`: production runtime looks healthy
- `warning`: app can run, but production setup needs review
- `error`: at least one critical runtime dependency failed

## Central Logs

ArGadaagdo writes structured JSON logs through `lib/logger.ts`.

Check logs in this order:

1. Vercel deployment logs
2. Vercel function runtime logs
3. Supabase logs for database/RPC/auth/storage issues
4. Bank of Georgia payment callback logs
5. Resend email delivery logs

Important log fields:

- `app`
- `level`
- `message`
- `timestamp`
- `environment`
- `context.requestId`
- `context.operation`
- `context.error`

Use the `X-Request-Id` response header from `/api/health` to correlate health
checks with Vercel logs.

## Incident Recovery

### Site Does Not Load

1. Open `/api/health`.
2. Check latest Vercel deployment status.
3. Check required environment variables in Vercel.
4. Roll back to the last successful deployment if the latest deployment is bad.
5. Confirm homepage, offers and login after rollback.

### Supabase Database Fails

1. Open `/api/health` with `HEALTH_CHECK_SECRET`.
2. Check Supabase project status and database availability.
3. Check whether `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   and `SUPABASE_SERVICE_ROLE_KEY` are present in Vercel.
4. Avoid applying migrations during an active incident unless the incident was
   directly caused by a failed migration.
5. If data corruption is suspected, pause business onboarding and check backups
   before editing rows.

### Storage Uploads Fail

1. Confirm `/api/health` storage check.
2. Check that the `offer-images` bucket exists.
3. Check Supabase Storage policies.
4. Ask businesses to retry upload after storage is healthy.
5. Do not delete existing offer image URLs during the incident.

### Reservations Fail

1. Check Vercel function logs for `/api/payments/checkout`.
2. Check Supabase RPC errors for payment/order functions.
3. Check Bank of Georgia credentials and callback configuration.
4. Verify offer quantity/status was not manually changed incorrectly.
5. If a payment was taken but an order did not reserve, handle manually before
   asking the customer to retry.

### Emails Fail

1. Check `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM` and sender domain status.
2. Check Resend logs.
3. Keep marketplace actions working; email failure should not undo successful
   reservations, cancellations, approvals or pickups.
4. Manually contact affected customer/business if the email was operationally
   important.

## Backup Documentation

Database backups:

- Use Supabase automated backups for the production project.
- Before applying migrations, confirm the latest backup exists.
- Before cleanup scripts, export affected rows or take a manual backup.
- Test restore procedure before scaling beyond the pilot.

Storage backups:

- Supabase database backups do not replace a storage backup plan.
- Keep original business images where possible.
- Before large storage cleanup, export the list of `offer-images` objects.

Manual data export before risky operations:

```sql
select * from public.businesses order by id;
select * from public.offers order by id;
select * from public.orders order by id;
select * from public.payments order by id;
select * from public.business_ratings order by id;
```

## Deployment Checklist

Before deployment:

- `npm run lint`
- `npm run build`
- Confirm `.env.local` is not committed
- Confirm required Vercel environment variables are set
- Confirm Supabase migrations are applied in order
- Confirm `/api/health` passes on the current deployment
- Confirm payment callback URL points to the canonical production URL
- Confirm Resend sender domain is verified
- Confirm Supabase Auth SMTP is configured

After deployment:

- Open homepage
- Open `/offers`
- Open `/api/health`
- Login as customer
- Login as business
- Login as admin
- Create one test offer only if needed
- Remove test data before pilot traffic
- Check Vercel runtime logs for new errors

## Production Checklist

Critical:

- Supabase RLS enabled
- Service role key server-only
- Bank of Georgia secrets server-only
- Resend API key server-only
- `HEALTH_CHECK_SECRET` configured
- `CRON_SECRET` configured
- Email confirmation enabled
- Storage bucket available

Operational:

- Admin knows how to approve businesses
- Business owner knows how pickup codes work
- Support email monitored
- Incident owner assigned
- Backup location known
- Rollback process known

Pilot readiness:

- At least one approved real business
- Realistic offers visible
- Customer can reserve
- Business can complete pickup
- Customer can rate
- Admin can see marketplace health

## Recommended External Monitoring

For the pilot, the built-in health endpoint and Vercel/Supabase dashboards are
enough. Before scaling, add one of:

- Vercel Log Drains to a log provider
- Sentry for error monitoring
- Checkly or equivalent uptime monitoring pointed at `/api/health`
- Vercel Speed Insights for real user performance
