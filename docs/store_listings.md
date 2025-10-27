# Store listings — GramorX IELTS Prep with AI

This checklist keeps the App Store and Google Play Console metadata in sync. Follow it every time we update copy, screenshots, or submissions.

## 1. Ownership & access

- **App Store Connect:** Solvio Advisors team account → `marketing@gramorx.com` (Admin) owns metadata.
- **Google Play Console:** Solvio Advisors primary account → `marketing@gramorx.com` (Admin) maintains listings.
- Enable two-factor auth on marketing accounts and share codes in 1Password &ldquo;GramorX / Storefront&rdquo; vault.

## 2. Asset sources

| Asset                         | Path                                                    | Notes                                                                             |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Feature graphic — Google Play | `public/store/feature-graphics/google-play-feature.svg` | Upload at 1024×500. Export to PNG before upload.                                  |
| Feature graphic — App Store   | `public/store/feature-graphics/app-store-feature.svg`   | Use for App Store promotional artwork or resizing to 4320×1080 for in-app events. |
| App Store screenshots         | `public/store/screenshots/app-store/*.svg`              | Export to PNG (1284×2778). Maintain min 3 portrait images.                        |
| Google Play screenshots       | `public/store/screenshots/google-play/*.svg`            | Export to PNG (1080×2340). Provide at least 2 portrait images per form factor.    |
| App icon                      | `public/icon-512.svg` (source: design system repo)      | Export 1024×1024 PNG with rounded corners for App Store.                          |

> Tip: keep exported PNGs in `from/store-assets/<yyyy-mm-dd>` for audit history.

## 3. Metadata updates

1. Update master copy in `docs/store_listings.md` before editing consoles.
2. Tone: student-first, globally inclusive, highlight AI guidance, privacy pledge, quick wins.
3. Localize description into en-US initially. Capture translation tasks in Linear ticket `MKT-Store-XX`.

### Core fields

- **Title:** `GramorX: IELTS Prep with AI`
- **Subtitle (iOS):** `Speaking, writing & predictor insights`
- **Short description (Play):** `Adaptive IELTS study plans with instant AI feedback.`
- **Full description:** Use 4 short paragraphs + bulleted feature list. Include CTA to claim free speaking analysis.
- **Keywords (iOS):** `IELTS, speaking, writing, band predictor, study plan`
- **Tagline (Play custom store listing):** `Reach Band 7+ faster with an AI coach.`

## 4. Compliance statements

- Reference the [Privacy Notice](/legal/privacy) and ensure contact email `privacy@gramorx.com` is listed in both consoles.
- Under &ldquo;Data safety&rdquo; (Play) note collection of name, email, usage analytics; mark encryption in transit and data deletion availability.
- Under &ldquo;App Privacy&rdquo; (iOS) reuse answers from the App Privacy questionnaire stored in 1Password.

## 5. Submission workflow

1. Export required assets from the repository.
2. Update copy in both consoles (App Store Connect → App Information, Google Play → Main store listing).
3. Upload localized screenshots/feature graphics.
4. Run automated preview in each console to confirm layout.
5. Capture before/after screenshots in the &ldquo;Store Listing&rdquo; Notion doc.
6. Request peer review (marketing lead) before submitting metadata for review.
7. Track submission IDs in `docs/mobile_release.md` (Release log section).

## 6. Version history log

| Date       | Change                                     | Submitted by | Notes                             |
| ---------- | ------------------------------------------ | ------------ | --------------------------------- |
| 2024-05-28 | Initial consolidated assets + copy refresh | S. Patel     | Synced with privacy/terms refresh |
