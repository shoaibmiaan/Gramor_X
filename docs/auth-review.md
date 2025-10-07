# Authentication review findings

## 1. Two competing browser Supabase clients
- `lib/supabaseBrowser.ts` exports `supabaseBrowser` configured with PKCE, auto refresh, and URL-session detection.【F:lib/supabaseBrowser.ts†L1-L20】
- `lib/supabaseClient.ts` exports another singleton (`supabase`) without the PKCE configuration and pulls its settings from `env` instead of `process.env` directly.【F:lib/supabaseClient.ts†L1-L9】
- Different parts of the UI depend on each version (for example the global `UserContext` and the MFA hook import `supabase` from `supabaseClient` while login screens use `supabaseBrowser`).【F:context/UserContext.tsx†L13-L97】【F:hooks/useEmailLoginMFA.ts†L1-L63】【F:pages/login/email.tsx†L1-L183】

Because there are two separately configured singletons, session changes made through one client (PKCE + auto refresh) are not guaranteed to be visible to code that talks to the other client (default settings). This mismatch is a common source of "logged in but still treated as logged out" behaviour and inconsistent MFA challenges.

## 2. MFA helper relies on different Supabase instance than the login page
- The MFA helper (`useEmailLoginMFA`) issues `supabase.auth.mfa.challenge` calls using the `supabaseClient` instance.【F:hooks/useEmailLoginMFA.ts†L1-L51】
- The email login form sets the session and fetches the user with `supabaseBrowser`, then hands that user object to the MFA hook.【F:pages/login/email.tsx†L84-L104】

If the PKCE client has fresher tokens than the plain client, the MFA challenge runs against stale auth state and can fail even though the user just signed in. Aligning both pieces of the flow on the same browser client removes this race condition.

## 3. Password login API uses the service-role key
- `/api/auth/login` signs users in by calling `supabaseAdmin.auth.signInWithPassword`, which is backed by the service-role key.【F:pages/api/auth/login.ts†L1-L50】

Using the service key for normal user authentication bypasses Supabase row-level security and ignores account restrictions (such as email confirmation or user ban flags). The handler should authenticate with an anon-key client so that the platform enforces the usual checks. Until then, logins may succeed for accounts that should be blocked, which explains the unexpected behaviour you observed.

## 4. Successful logins skip audit logging
- After a successful email/password login the UI exits early when `mfaRequired` is `false`, never invoking `/api/auth/login-event`.【F:pages/login/email.tsx†L84-L109】

As a result, non-MFA sessions are not recorded in the `login_events` table, which breaks audit trails and downstream logic that depends on those events. Move the audit call before the early return (or let the server record it) so every sign-in is captured.
