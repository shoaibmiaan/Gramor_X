# Deeplink matrix

Use this matrix to test deeplinks during mobile releases and push notification QA. Unless stated otherwise, links open in-app when the learner is authenticated and redirect to the login screen when not.

| Deeplink                                        | Destination                        | Requires auth? | Notes & QA steps                                                                                          |
| ----------------------------------------------- | ---------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `gramorx://home`                                | Dashboard overview                 | Yes            | Verify widgets load, streak badge visible, and navigation tabs respond.                                   |
| `gramorx://study-plan/today`                    | Study plan for current day         | Yes            | Confirm three-card plan renders. Ensure CTA buttons match `pages/data-deletion.tsx` privacy link updates. |
| `gramorx://speaking/coach`                      | Speaking AI coach session          | Yes            | Should open warm-up; test microphone prompt and show privacy banner.                                      |
| `gramorx://writing/task2/review?id=<attemptId>` | Writing feedback summary           | Yes            | Requires attempt pre-seeded. Ensure download PDF action works.                                            |
| `gramorx://predictor`                           | Band predictor landing             | No             | Unauthed users reach marketing page `/predictor` via webview.                                             |
| `gramorx://pricing`                             | Pricing page                       | No             | Should open marketing layout with legal footer containing updated Privacy/Terms links.                    |
| `gramorx://legal/privacy`                       | In-app webview of Privacy Notice   | No             | Verify navigation uses `/legal/privacy` and respects dark mode.                                           |
| `gramorx://legal/terms`                         | In-app webview of Terms of Service | No             | Check anchor navigation works from table of contents.                                                     |
| `https://gramorx.com/legal/privacy`             | Web fallback to Privacy Notice     | No             | Validate canonical meta tags present.                                                                     |
| `https://gramorx.com/legal/terms`               | Web fallback to Terms              | No             | Confirm anchor `#law` scrolls to section 17.                                                              |

## Manual test script

1. Install release candidate build on physical iOS + Android devices.
2. Execute each deeplink from `docs/push_ops.md` QA checklist using Expo CLI (`npx uri-scheme open <deeplink> --ios`).
3. Capture screenshots for regressions and attach to the release issue.
4. Record pass/fail in the `Mobile release playbook` table.
