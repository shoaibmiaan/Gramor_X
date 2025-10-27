# Push notification operations

Central source for configuring, testing, and auditing push campaigns across iOS and Android.

## 1. Providers & credentials

- **Expo Push API** drives transactional and marketing pushes. Credentials live in 1Password → `GramorX / Expo`.
- **Firebase Cloud Messaging (FCM)** server key stored as `EXPO_ANDROID_FCM_API_KEY` in Vercel + Expo secrets.
- **Apple Push Notification service (APNs)** certificate stored as `.p8` file in the secure bucket referenced in `EXPO_IOS_PUSH_KEY_ID` and `EXPO_IOS_PUSH_TEAM_ID`.

## 2. Message templates

Store reusable templates in `notifications_content.txt`. Each template should specify:

- Purpose & trigger (e.g., `writing-feedback-ready`).
- Localization keys or inline copy.
- CTA deeplink (see [docs/deeplink_matrix.md](./deeplink_matrix.md)).
- Target audience segment and cooldown rules.

When adding a new template, update this file and notify marketing + support in Slack `#push-ops`.

## 3. Scheduling pushes

1. Export target cohort from Supabase or Amplitude.
2. Upload CSV to internal Push Ops dashboard (under `/tools/push`).
3. Provide:
   - Campaign name + owner.
   - Template ID and localization.
   - Send window (UTC) and throttling (default 400/min).
4. Run dry-run to validate tokens; resolve any invalid tokens via the “Device hygiene” report.

## 4. QA checklist

- Trigger push to staging bundle using Expo &ldquo;development client&rdquo;.
- Verify notification renders on iOS + Android (title, body, CTA).
- Tap-through opens correct screen (deeplink).
- Confirm analytics event `push.received` and `push.opened` fire with campaign metadata.
- Update incident log if failure rate &gt; 2%.

## 5. Incident response

1. Pause campaign via dashboard toggle.
2. Capture Expo push receipts and FCM logs.
3. File an incident in Notion (template: `Push Ops / Incident`), including root cause.
4. Notify stakeholders in `#launch-room` and provide ETA for fix.
5. Update this doc with remediation items if process gaps are identified.

## 6. Audit log

| Date       | Change                                                       | Owner     | Notes                               |
| ---------- | ------------------------------------------------------------ | --------- | ----------------------------------- |
| 2024-05-28 | Added privacy-compliant messaging workflow & deeplink checks | M. Rivera | Aligns with mobile release playbook |
