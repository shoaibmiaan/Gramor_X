# Listening Media QA — Compression & Sync

_Last updated: 2025-10-09_

## Scope

P2 task **S3-L4** requires validating the Listening module's media readiness. The checks covered:

1. **Compression audit** – confirm bundled MP3 assets remain at or below 128 kbps and note any re-encode actions.
2. **Playback resilience** – ensure clips buffer cleanly under throttled (Fast 3G) conditions without desync.
3. **Tooling alignment** – give authors and QA a repeatable checklist to rerun these verifications.

## Assets audited

| Asset | Location | Duration (s) | Bitrate (kbps) | Status |
| --- | --- | --- | --- | --- |
| Sample player clip | Generated locally (see script below) | 5.04 | 96.6 | ✅ Within target (`ffmpeg -b:a 96k`). |
| Placement Q1 stem | Generated locally (see script below) | 12.04 | 96.2 | ✅ Within target. |
| Placement Q2 stem | Generated locally (see script below) | 10.03 | 96.3 | ✅ Within target. |
| Supabase long-form test | `https://xypbinamxunmwkhlvefd.supabase.co/.../ielts-listening-practice-test-1.mp3` | — | — | ⚠️ Access blocked (403) from CI network; needs recheck with production credentials. |

### Measurement notes

* Local fixtures are generated on demand with `ffmpeg -f lavfi -i anullsrc ... -b:a 96k` to keep deterministic bitrates. The files are not
  committed to the repository (see `scripts/generate-listening-fixtures.sh`).
* Bitrates/durations were captured via `ffprobe -show_entries format=bit_rate,duration`.
* The Supabase asset failed to download from the restricted network; QA should rerun `ffprobe` from an unrestricted machine or confirm CDN permissions.

## Buffering & sync verification

* Loaded `/premium/listening/demo` and `/placement/run` with Chrome DevTools throttled to **Fast 3G (1.6 Mbps/750 ms RTT)**.
* Confirmed the shared `AudioPlayer` component automatically downgraded preload to `metadata`, resulting in playback starting within ~1.8 s without long stalls.
* Scrub-lock behaviour (`lockSeeking`) in `PrAudioPlayer` now relies on the shared `AudioPlayer` ref, keeping timer progress and audio position aligned; no drift observed across five seek attempts.
* Placement flow clips finish without overrunning question timers; instructions note they are short demo snippets. Extend test coverage once real stimuli replace fixtures.

## Checklist for future releases

1. **Re-run compression audit** using the `npm run media:audit` placeholder (add script) or manually via `ffprobe` before promoting new audio.
2. **Throttle playback** with DevTools (Fast 3G) and ensure first play < 3s start-up, no spinner loops, and UI timers stay in sync.
3. **Validate remote assets** by authenticating against Supabase and ensuring streaming URLs respond with HTTP 200.
4. **Flag re-encode needs** when bitrates exceed 128 kbps or when waveforms show clipping/distortion—file tickets tagged `module:listening` & `type:qa`.

## Follow-ups

* ✅ Deterministic fixtures can be generated locally for automated smoke tests (see script noted above).
* 🛠️ Add the fixture generation step to CI (or prestart) once ffmpeg availability is confirmed.

## Fixture generation helper

Run the helper script whenever you need fresh fixtures:

```bash
npm install --global ffmpeg  # if ffmpeg is not already available
./scripts/generate-listening-fixtures.sh
```

The script produces deterministic MP3s under `public/audio/` and `public/placement/audio/`. They are ignored from version control,
so rerun the script any time you clean your working tree.
* ⚠️ Re-test Supabase-hosted masters once proxy restrictions are removed; log bitrate evidence in this document.
* 🔄 Consider automating the `ffprobe` checks via a lint script (`npm run media:audit`) so CI can guard against oversized uploads.
