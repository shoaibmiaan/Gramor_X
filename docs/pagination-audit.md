# Phase 6 Pagination Audit

## Audited list surfaces

### User-facing
- `/classes` — paginated classes list with role/status/date filters.
- `/bookings` — paginated bookings list.
- `/marketplace` — paginated coach marketplace cards.
- `/mistakes` — infinite pagination via `useSWRInfinite`.
- `/saved` lists — infinite pagination via `useSWRInfinite`.
- `/blog` — paginated listing UI.

### Admin-facing/API-backed lists (representative)
- `/api/admin/students/list` — paginated student listing.
- `/api/admin/audit-logs` (planned in Phase 7) should follow same metadata shape.
- `notifications`, `invoices`, `reports`, and cohort-member lists should maintain `page/limit/total/hasMore` consistency.

## Gaps found
- Duplicate pagination component implementations in multiple pages (`classes`, `bookings`, `marketplace`).
- Inconsistent spacing and `aria-current` handling in pagination buttons.
- Metadata shape is not yet fully standardized across all APIs (some return only `page/pageSize/total`, others rely on implicit next-page checks).

## Changes implemented
- Introduced shared `components/common/Pagination.tsx` component.
- Replaced local pagination implementations in:
  - `pages/classes/index.tsx`
  - `pages/bookings/index.tsx`
  - `pages/marketplace/index.tsx`

## Pagination standard for new endpoints
All list endpoints should return:

```json
{
  "ok": true,
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "totalPages": 0,
  "hasMore": false
}
```

## Follow-up tasks
- Normalize API response schema to include `hasMore` and `totalPages` everywhere.
- Introduce a reusable `usePaginatedList` hook for query-string + SWR synchronization.
- Add e2e coverage for page transitions and filter persistence.
