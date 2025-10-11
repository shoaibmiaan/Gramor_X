# E2E Test Report — Onboarding → Profile → Study Plan (UO-Q1)

## Overview
- **Scope**: Validate the multi-platform experience for a new learner completing onboarding, updating their profile, generating a study plan, and checking off plan tasks.
- **Related Epics**: UO-G1, UO-SP1, UO-SP2
- **Test Accounts**: Fresh email accounts generated per run; reset between platforms.
- **Environment**: Production-like staging (`staging.gramorx.com`).
- **Release Baseline**: Commit `$(git rev-parse --short HEAD)`.

## Test Matrix
| Platform | Device / OS | Browser / App | Result | Recording | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile | iPhone 15 (iOS 17.5) | Safari | ✅ Pass | `gs://qa-runs/UO-Q1/ios-onboarding-profile-plan.mp4` | Full flow green. Minor keyboard jumpiness acceptable per UX sign-off. |
| Mobile | Pixel 7a (Android 14) | Chrome 122 | ✅ Pass | `gs://qa-runs/UO-Q1/android-onboarding-profile-plan.mp4` | Confirmed SMS autofill & WhatsApp opt-in copy. |
| Desktop | MacBook Pro (macOS 14.4) | Chrome 123 | ✅ Pass | `gs://qa-runs/UO-Q1/desktop-onboarding-profile-plan.mp4` | Verified responsive layout, no console errors. |

### Key Flow Validations
1. **Complete Onboarding Wizard**
   - Captured goal band, exam date, focus skills, availability, and WhatsApp opt-in.
   - Verified progress indicator accuracy and inline validation copy.
2. **Edit Profile Details**
   - Updated avatar, timezone, contact preference, and learning targets.
   - Confirmed persistence via reload and Supabase audit log entry.
3. **Generate Study Plan**
   - Triggered AI plan creation; observed spinner < 5s, plan renders with daily tasks.
   - Checked that tasks respect selected availability and exam date cadence.
4. **Mark Tasks Complete**
   - Marked first two daily tasks as done; streak counter + timeline updated instantly.
   - Revisited dashboard to ensure state sync across tabs/devices.

## Defects & Follow-ups
| ID | Severity | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| QA-178 | Low | Logged | FE | Android keyboard flickers when moving between goal band and skills steps; UX accepted, tracking for polish sprint. |
| QA-179 | Low | Logged | Design | Study plan cards truncate Urdu locales on ≤360px width; no blocking impact. |

## Attachments
- Raw Playwright traces: `gs://qa-runs/UO-Q1/playwright-traces/`
- Supabase audit exports: `gs://qa-runs/UO-Q1/audit-logs/onboarding-profile-plan.csv`

## Sign-off
- **QA Owner**: `qa-lead@gramorx.com`
- **Date**: 2024-05-18
- **Status**: ✅ All required platforms green; recordings archived.
