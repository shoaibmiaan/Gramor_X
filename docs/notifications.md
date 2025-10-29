# Notifications MVP runbook

This guide summarises the notifications system that now powers preferences, template delivery, cron dispatching, and downstream analytics. Use it to configure environments, test flows end-to-end, and understand which tables and APIs are involved.

## Schema & data model

The Supabase migration provisions enums and tables for notification opt-ins, templates, events, deliveries, and schedules while enforcing row-level security so users can only see their own records. It also seeds the initial `study_reminder` and `score_ready` templates. 【F:supabase/migrations/20260326090000_notifications_mvp.sql†L1-L270】

A follow-up migration updates the seeded email templates to include unsubscribe and manage-preferences links that the renderer now injects into every payload. 【F:supabase/migrations/20260401093000_notifications_unsubscribe.sql†L1-L10】【F:lib/notify/index.ts†L275-L307】

## Provider configuration

Outgoing email uses Nodemailer and requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM_EMAIL` (with an optional `SMTP_FROM_NAME`). Without these, sends log a `[email:noop]` entry and return success so development environments are safe. 【F:lib/notify/email.ts†L1-L70】

WhatsApp delivery uses Twilio credentials `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM`. Setting `TWILIO_BYPASS=1` (or omitting credentials) keeps local/dev environments in no-op mode. 【F:lib/notify/sms.ts†L1-L55】

The `/api/healthz` endpoint reports whether each provider is configured; check this during staging rollouts.

### Environment variables & secrets

| Variable                                                                                | Purpose                                                                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` | Email provider configuration for Nodemailer.                                               |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_BYPASS`      | WhatsApp/Twilio configuration (set `TWILIO_BYPASS=1` locally to avoid real sends).         |
| `NOTIFICATIONS_ENQUEUE_SECRET`                                                          | Shared secret header (`x-notifications-secret`) required for `/api/notifications/enqueue`. |
| `NOTIFICATIONS_ENQUEUE_LIMIT`                                                           | Optional per-user/day cap (default `5`).                                                   |
| `NOTIFICATIONS_CRON_SECRET`                                                             | Shared header (`x-cron-secret`) expected by `/api/cron/notifications-dispatch`.            |
| `NOTIFICATIONS_STUDY_REMINDER_LIMIT`                                                    | Optional guard for the study reminder cron job (records scanned per run).                  |

## Dispatcher workflow

`lib/notify/index.ts` exposes helpers to enqueue notification events, look up contact info, merge unsubscribe/manage defaults into payloads, and dispatch deliveries with quiet-hour deferral logic and retry capping. Every delivery outcome also emits analytics events (`notification_enqueued`, `delivery_sent`, `delivery_failed`) for observability. 【F:lib/notify/index.ts†L160-L399】【F:lib/notify/index.ts†L610-L740】【F:lib/analytics/events.ts†L3-L105】

## API surface

Client preferences live at `pages/api/notifications/preferences.ts`, which loads and upserts per-user channels, quiet hours, timezone, and contact fields. 【F:pages/api/notifications/preferences.ts†L1-L184】

System actors can enqueue notifications via `pages/api/notifications/enqueue.ts` (header secret + per-user/event daily rate limit) and authorised admins/teachers can trigger nudges through `pages/api/notifications/nudge.ts`, which auto-ids requests per user/day. 【F:pages/api/notifications/enqueue.ts†L1-L92】【F:pages/api/notifications/nudge.ts†L1-L40】

Background send/retry processing is handled by `pages/api/cron/notifications-dispatch.ts` behind the shared `x-cron-secret`, while `pages/api/cron/notifications-study-reminder.ts` scans recent study plans and enqueues reminders with idempotency keys and channel fallbacks. Both expect `NOTIFICATIONS_CRON_SECRET`, and the study reminder job honours `NOTIFICATIONS_STUDY_REMINDER_LIMIT`. 【F:pages/api/cron/notifications-dispatch.ts†L1-L30】【F:pages/api/cron/notifications-study-reminder.ts†L1-L169】

## Front-end settings

`pages/settings/notifications.tsx` provides the user-facing controls for toggling email/WhatsApp, configuring quiet hours/timezone, showing delivery contact summaries, and handling explicit or deep-linked unsubscribe flows with ARIA live feedback. Footer links cover legal and unsubscribe requirements. 【F:pages/settings/notifications.tsx†L1-L410】

## Upstream triggers

Server flows enqueue events when writing scores finish, payments succeed or fail (Stripe and manual gateways), and during local gateway webhooks. Each path loads contact details, sets idempotency keys, and restricts initial channels to email unless a phone is available. 【F:pages/api/writing/score/run.ts†L1-L96】【F:pages/api/payments/create-intent.ts†L1-L236】【F:pages/api/payments/webhooks/local.ts†L1-L109】【F:pages/api/webhooks/payment.ts†L1-L234】

## Operations checklist

1. Configure SMTP/Twilio environment variables and verify `/api/healthz`.
2. Set `NOTIFICATIONS_CRON_SECRET` (and optional `NOTIFICATIONS_ENQUEUE_SECRET`, `NOTIFICATIONS_ENQUEUE_LIMIT`, `NOTIFICATIONS_STUDY_REMINDER_LIMIT`).
3. Vercel deploys pick up the cron schedule defined in `vercel.json`, triggering `/api/cron/notifications-dispatch` every 15 minutes—ensure the environment has `NOTIFICATIONS_CRON_SECRET` so requests pass the header check.
4. Seed or migrate templates (`supabase db push`) and confirm unsubscribe links render via sample dispatches.
5. Run an end-to-end dry run: update preferences in the settings page, enqueue a test event via the admin endpoint, trigger the cron dispatcher, and confirm analytics entries/log output.
