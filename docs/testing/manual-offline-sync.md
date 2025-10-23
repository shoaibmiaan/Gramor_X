# Manual Testing · Offline Draft Sync

## Goal

Verify that writing draft autosave data and exam events queue while offline, sync once connectivity returns, and avoid duplicate submissions.

## Preconditions

- Test account with access to writing mock exams.
- Browser with DevTools network throttling.
- Service worker registered (`npm run dev` + open `/pwa/app`).

## Test Steps

1. Start a writing attempt and type unique text in both tasks.
2. Toggle DevTools to **Offline**. Continue typing and trigger focus/blur events (switch tabs).
3. Inspect Application → IndexedDB → `gramor-offline` to confirm one draft record and multiple event rows are queued.
4. Reload the page while still offline; ensure data persists (draft queue remains, no duplicate rows).
5. Restore network (set DevTools back to **Online**).
6. Observe console logs for `offline/syncOrchestrator` and verify `/api/offline/sync` POST succeeds.
7. Check Supabase (or via API) that only a single autosave event with `offlineRevision` is present and focus/blur events appear once each.
8. Repeat offline/online cycle without editing text and confirm no new submissions occur.

## Expected Results

- Draft queue holds the latest revision only; older revisions are replaced.
- After reconnection, draft/event records are removed from IndexedDB and `syncedDraftIds`/`syncedEventIds` returned by the API match.
- Server data contains exactly one autosave event per revision and no duplicate focus/blur events.
- Subsequent reconnects without edits do **not** create additional autosave events (no duplicates).
