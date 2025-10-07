# Next.js / Tailwind / API Evaluation

## Bugs

### Next.js
- **Imperative routing during render for restricted teacher access** – When a non-teacher user navigates to any `/teacher` route, the app calls `router.push('/restricted')` directly while React is rendering the tree. React warns (and in strict mode throws) when navigation happens during render, and in concurrent rendering this can trigger infinite re-renders or aborted transitions. The redirect should move into an effect tied to the relevant state instead of running inline inside the JSX branch. 【F:pages/_app.tsx†L370-L391】

### Tailwind CSS
- **Undefined CSS variable powering the `neutral` color token** – The Tailwind theme exposes a `neutral` color mapped to `rgb(var(--color-gray) / <alpha-value>)`, but no `--color-gray` variable is defined in the shared token stylesheet. Any `text-neutral` / `bg-neutral` utility therefore resolves to `rgb(var(--color-gray) / …)`, which fails to compute and produces invalid CSS in the browser. Either rename the token to `grayish` to match the defined variable or add the missing CSS variable. 【F:tailwind.config.js†L29-L78】【F:styles/tokens.css†L5-L34】

### API Handling
- **Teacher profile endpoint silently treats unauthenticated requests as success** – `/api/teacher/me` always responds with `200` and `profile: null` when no Supabase user is associated with the request. The downstream hook interprets this as “no profile yet,” so logged-out users (or requests with expired cookies) render onboarding UIs instead of being forced through auth. The handler should return `401` (or at least an explicit error object) when `getUser()` yields no user. 【F:lib/db/teacher.ts†L6-L20】【F:pages/api/teacher/me.ts†L10-L16】

## Blockers

### API Handling
- **Missing authentication guard for teacher profile mutations** – `upsertMyTeacherProfile` trusts the Supabase client but only throws `Not authenticated` if `getUser()` fails; however, `/api/teacher/me` exposes no method guard or rate limiting, and there is no dedicated POST handler in this folder. If future mutations reuse this helper without explicit method checks and auth middleware, teacher data could be overwritten. Implement a shared middleware that validates HTTP methods and ensures the Supabase session has the expected role before mutating. 【F:lib/db/teacher.ts†L22-L43】

## Improvement Suggestions

### Next.js
- Move the non-teacher redirect inside a `useEffect` that watches `role`/`pathname` so navigation stays side-effect-only, and consider showing a toast that explains the redirect rationale. 【F:pages/_app.tsx†L370-L391】
- Extract the teacher gating logic into a dedicated guard component to reduce the size of `_app.tsx` and make it easier to unit test the routing outcomes. 【F:pages/_app.tsx†L370-L391】

### Tailwind CSS
- Add token-driven safelist entries or a lint rule that flags utilities referencing missing CSS variables to catch regressions like the `--color-gray` mismatch during CI. 【F:tailwind.config.js†L29-L138】
- Document the available semantic color tokens next to `styles/tokens.css` so designers and engineers know which utility names are supported. 【F:styles/tokens.css†L5-L34】

### API Handling
- Update the SWR fetcher to throw on non-2xx responses so downstream components can differentiate between “not logged in” and “no teacher profile yet,” improving UX. 【F:hooks/useTeacherProfile.ts†L1-L13】
- Add integration tests that assert `/api/teacher/me` returns `401` for anonymous calls and `200` with data for authenticated teachers to prevent regressions once the guard is fixed. 【F:pages/api/teacher/me.ts†L10-L16】
