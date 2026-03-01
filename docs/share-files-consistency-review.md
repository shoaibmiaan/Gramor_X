# Share files consistency review

## Scope reviewed

- `pages/api/progress/share.ts`
- `pages/progress/[token].tsx`
- `supabase/migrations/20250831000002_progress_share_links.sql`
- `pages/api/review/share-link.ts`
- `pages/review/share/[token].tsx`
- `pages/api/review/comments.ts`
- `lib/review/shareToken.ts`

## Inconsistencies found

### 1) Progress share links are permanent, review share links are time-limited

- Progress sharing stores a UUID in `progress_share_links` and never sets an expiration.
- Review sharing uses JWT tokens with `exp` and configurable TTL (`REVIEW_SHARE_TTL_HOURS`, default 72h).

**Impact:** two user-facing “share” experiences have different security posture and lifecycle without a unified policy.

## 2) Progress share issuance and consumption are split across two token models

- Progress share uses database-backed UUID lookup (`progress_share_links`).
- Review share uses stateless signed JWT (`review-share` scope).

**Impact:** operational behavior differs (revocation, rotation, observability, and incident response are inconsistent).

## 3) Progress share API returns `user_id`, while review share APIs avoid exposing owner identity

- `GET /api/progress/share` returns `{ user_id, reading }`.
- Review share endpoints return attempt/comment data without exposing owner user id.

**Impact:** unnecessary identifier exposure in one sharing path only.

## 4) Anonymous access policy is broad in migration, but runtime code bypasses RLS via service role

- Migration creates an anon policy (`using (true)`) on `progress_share_links`.
- Runtime reads/writes are done through `supabaseAdmin` (service role), so DB-level policy intent does not govern these code paths.

**Impact:** policy and runtime behavior can drift and be misunderstood by maintainers.

## Recommended normalization

1. Adopt one share-token strategy across features (prefer signed TTL tokens or DB tokens with `expires_at` + rotation/revoke semantics).
2. Remove `user_id` from public progress-share API response; return only the minimal analytics payload.
3. If keeping DB-backed tokens, add `expires_at`, optionally `revoked_at`, and enforce in query predicates.
4. Clarify whether anon RLS policies are required when all traffic is mediated by server-side service-role code; tighten or remove broad anon policy if unused.
5. Document a single “sharing contract” (creation, expiry, revocation, payload shape, logging expectations) for both progress and review.
