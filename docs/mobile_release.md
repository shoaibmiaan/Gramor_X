# Mobile release playbook

Use this guide to ship a mobile build from staging to production. Each release should have a Linear issue titled `MOB-Release-<date>` referencing these steps.

## 1. Pre-freeze checklist

1. Confirm privacy/terms pages and store listings are up to date.
2. Merge release candidate branch into `main` and tag `mobile-v<semver>`.
3. Run `npm run lint && npm run test` plus UI smoke tests on iOS (TestFlight) and Android (internal testing).
4. Verify feature flags align with release scope using `/api/debug/feature-flags`.
5. Update [docs/push_ops.md](./push_ops.md) with any new notification templates.

## 2. Build & distribute

1. Trigger CI workflows:
   - **iOS:** `npm run build:ios && eas submit --platform ios`
   - **Android:** `npm run build:android && eas submit --platform android`
2. Upload release notes copied from `docs/store_listings.md` and add platform-specific highlights.
3. Attach privacy nutrition answers when App Store Connect requests them.
4. Add testers (QA + product) to TestFlight/Google Play internal track and post links in Slack `#launch-room`.

## 3. Verification gates

- ✅ Automated tests pass on CI.
- ✅ Manual smoke on top 3 journeys (Sign up → Placement test, Mock exam, Speaking feedback).
- ✅ Store metadata matches repository sources.
- ✅ Crash-free rate &lt; 2% on last 7 days (check Firebase Crashlytics).
- ✅ Deeplink smoke (see [docs/deeplink_matrix.md](./deeplink_matrix.md)) succeeds.

## 4. Submitting for review

1. **App Store:**
   - Increment build number and choose the metadata version.
   - Attach compliance documents (export compliance, privacy policy URL `/legal/privacy`).
   - Submit for review and record submission ID in Release log.
2. **Google Play:**
   - Promote the internal test build to Closed testing with release notes.
   - Complete the content rating + data safety questionnaires if fields changed.
   - Submit for review.

## 5. Release log

Keep the latest releases here.

| Date       | Version | Build numbers       | Submission IDs            | Notes                   |
| ---------- | ------- | ------------------- | ------------------------- | ----------------------- |
| 2024-05-28 | 1.4.0   | iOS 73 / Android 88 | ASC: 17402 / Play: 889501 | Privacy + store refresh |

## 6. Post-release

- Monitor Crashlytics, Supabase logs, and support inbox for 72 hours.
- If rollback needed, revert to previous build and disable new feature flags.
- Update this doc with lessons learned.
