# Security Secrets & Runtime Scope

This document defines how secrets should be handled in GramorX.

## Secret classes

### Client-public (safe for browser)

- `NEXT_PUBLIC_*` values are treated as public configuration.
- These must **never** be used for privileged database writes.

### Server-only secrets

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_KEY` (legacy compatibility only)
- `TWILIO_AUTH_TOKEN`
- `STRIPE_SECRET_KEY`
- Other provider API keys/tokens

Server-only secrets must be accessed through typed helpers in `lib/env.ts` (`requireServerSecret`, `getServerSupabaseUrl`, `getServerSupabaseServiceRoleKey`).

## Hard rules

1. Do not fallback from service-role credentials to anon/public keys in server mutation paths.
2. Bypass flags (`TWILIO_BYPASS`, quota bypasses, test-bypass headers) are non-production only.
3. Production startup must fail fast when critical server secrets are missing.
4. Dev-only admin routes require explicit non-production runtime and configured admin token.

## Runtime expectations

- **Production**:
  - No bypass behavior
  - Critical secrets required at startup
  - Service-role credentials required for privileged Supabase operations

- **Development / Test**:
  - Explicit bypasses allowed for local integration and deterministic test behavior
  - Dummy provider credentials may be tolerated when bypasses are enabled

## Files hardened in this pass

- `lib/env.ts`
- `pages/api/counters/increment.ts`
- `pages/api/ai/writing/grade.ts`
- `pages/api/ai/speaking/grade.ts`
- `pages/api/send-otp.ts`
- `pages/api/auth/login-event.ts`
- `pages/api/healthz.ts`
- `pages/api/dev/grant-role.ts`
- `lib/usage/checkQuota.ts`
- `lib/notify/sms.ts`
- `lib/vocabulary/today.ts`
