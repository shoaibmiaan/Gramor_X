# Phase 0 Architecture Audit Baseline

## Route inventory

- `app/` routes found: **0** (directory not present).
- `pages/` route directories: **311**
- `pages/` route files: **762**

<details><summary>Route directories (`pages/**`)</summary>


```txt
pages
pages/.well-known
pages/admin
pages/admin/content
pages/admin/listening
pages/admin/partners
pages/admin/premium
pages/admin/reports
pages/admin/reviews
pages/admin/speaking
pages/admin/students
pages/admin/teacher
pages/admin/teachers
pages/admin/vocabulary
pages/admin/writing
pages/ai
pages/ai/coach
pages/ai/mistakes-book
pages/ai/study-buddy
pages/ai/study-buddy/session
pages/ai/study-buddy/session/[id]
pages/ai/writing
pages/analytics
pages/analytics/listening
pages/api
pages/api/_middleware
pages/api/account
pages/api/account/export
pages/api/activities
pages/api/admin
pages/api/admin/ai
pages/api/admin/ai/vocab
pages/api/admin/flags
pages/api/admin/listening
pages/api/admin/premium
pages/api/admin/reading
pages/api/admin/reviews
pages/api/admin/speaking
pages/api/admin/speaking/attempts
pages/api/admin/students
pages/api/admin/teachers
pages/api/admin/users
pages/api/admin/writing
pages/api/ai
pages/api/ai/coach
pages/api/ai/listening
pages/api/ai/reading
pages/api/ai/speaking
pages/api/ai/study-plan
pages/api/ai/vocab
pages/api/ai/writing
pages/api/analytics
pages/api/analytics/writing
pages/api/attempts
pages/api/attempts/[id]
pages/api/attempts/progress
pages/api/auth
pages/api/auth/sessions
pages/api/billing
pages/api/blog
pages/api/bookings
pages/api/buddy
pages/api/certificates
pages/api/challenge
pages/api/checkout
pages/api/classes
pages/api/coach
pages/api/coach/writing
pages/api/content
pages/api/counters
pages/api/cron
pages/api/dashboard
pages/api/debug
pages/api/deeplink
pages/api/dev
pages/api/dev/seed
pages/api/dev/study-sessions
pages/api/drills
pages/api/exam
pages/api/exam/[attemptId]
pages/api/exp
pages/api/exports
pages/api/flags
pages/api/gamification
pages/api/gamification/challenges
pages/api/institutions
pages/api/internal
pages/api/internal/auth
pages/api/internal/payments
pages/api/leaderboard
pages/api/lifecycle
pages/api/listening
pages/api/listening/admin
pages/api/listening/attempts
pages/api/listening/mini
pages/api/listening/mistakes
pages/api/listening/practice
pages/api/listening/review
pages/api/listening/test
pages/api/listening/tips
pages/api/marketplace
pages/api/me
pages/api/mistakes
pages/api/mock
pages/api/mock/checkpoints
pages/api/mock/full
pages/api/mock/listening
pages/api/mock/reading
pages/api/mock/writing
pages/api/notifications
pages/api/offline
pages/api/onboarding
pages/api/orgs
pages/api/partners
pages/api/payments
pages/api/payments/webhooks
pages/api/placement
pages/api/plan
pages/api/predictor
pages/api/premium
pages/api/proctoring
pages/api/profile
pages/api/progress
pages/api/promo
pages/api/promotions
pages/api/push
pages/api/quiz
pages/api/quiz/vocab
pages/api/quota
pages/api/reading
pages/api/reading/ai
pages/api/reading/mock
pages/api/reading/review
pages/api/reading/test
pages/api/reco
pages/api/referrals
pages/api/review
pages/api/safepay
pages/api/saved
pages/api/saved/by-category
pages/api/scores
pages/api/search
pages/api/speaking
pages/api/speaking/attempts
pages/api/speaking/coach
pages/api/speaking/limits
pages/api/speaking/partner
pages/api/speaking/partner/review
pages/api/speaking/prompts
pages/api/speaking/sessions
pages/api/strategies
pages/api/study-buddy
pages/api/study-buddy/sessions
pages/api/study-buddy/sessions/[id]
pages/api/study-plan
pages/api/subscriptions
pages/api/teacher
pages/api/upload
pages/api/user
pages/api/vocab
pages/api/vocab/attempt
pages/api/vocabulary
pages/api/waitlist
pages/api/webhooks
pages/api/whatsapp
pages/api/words
pages/api/writing
pages/api/writing/attempts
pages/api/writing/cohesion
pages/api/writing/critique
pages/api/writing/cross
pages/api/writing/drills
pages/api/writing/export
pages/api/writing/lexical
pages/api/writing/metrics
pages/api/writing/notifications
pages/api/writing/originals
pages/api/writing/paraphrase
pages/api/writing/prompts
pages/api/writing/readiness
pages/api/writing/rehearsals
pages/api/writing/reports
pages/api/writing/reviews
pages/api/writing/score
pages/auth
pages/blog
pages/bookings
pages/cert
pages/cert/writing
pages/challenge
pages/checkout
pages/classes
pages/coach
pages/community
pages/community/review
pages/content
pages/content/studio
pages/dashboard
pages/dashboard/activity
pages/dashboard/components
pages/dashboard/components/shared
pages/dashboard/components/tiers
pages/dashboard/components/widgets
pages/exam
pages/institutions
pages/institutions/[orgId]
pages/internal
pages/internal/content
pages/labs
pages/leaderboard
pages/learn
pages/learn/listening
pages/learning
pages/learning/skills
pages/learning/skills/lessons
pages/learning/strategies
pages/legal
pages/listening
pages/listening/[slug]
pages/login
pages/marketplace
pages/me
pages/me/listening
pages/mistakes
pages/mock
pages/mock/full
pages/mock/listening
pages/mock/listening/exam
pages/mock/listening/history
pages/mock/listening/result
pages/mock/listening/review
pages/mock/reading
pages/mock/reading/[slug]
pages/mock/reading/challenges
pages/mock/reading/drill
pages/mock/reading/feedback
pages/mock/reading/history
pages/mock/reading/result
pages/mock/reading/review
pages/mock/reading/weekly
pages/mock/speaking
pages/mock/writing
pages/mock/writing/result
pages/notifications
pages/onboarding
pages/onboarding/teacher
pages/onboarding/welcome
pages/orgs
pages/partners
pages/placement
pages/practice
pages/practice/listening
pages/predictor
pages/premium
pages/premium/listening
pages/premium/reading
pages/pricing
pages/proctoring
pages/proctoring/exam
pages/profile
pages/profile/account
pages/profile/setup
pages/progress
pages/promotions
pages/pwa
pages/quick
pages/r
pages/reading
pages/reading/[slug]
pages/reading/passage
pages/reports
pages/review
pages/review/listening
pages/review/reading
pages/review/share
pages/review/speaking
pages/review/writing
pages/saved
pages/score
pages/settings
pages/signup
pages/speaking
pages/speaking/attempts
pages/speaking/attempts/[attemptId]
pages/speaking/coach
pages/speaking/live
pages/speaking/packs
pages/speaking/partner
pages/speaking/partner/review
pages/speaking/review
pages/speaking/roleplay
pages/speaking/simulator
pages/study-plan
pages/teacher
pages/teacher/cohorts
pages/tools
pages/tools/listening
pages/tools/mark-sections
pages/visa
pages/vocab
pages/vocabulary
pages/vocabulary/quizzes
pages/vocabulary/speaking
pages/vocabulary/topics
pages/welcome
pages/writing
pages/writing/drills
pages/writing/learn
pages/writing/mock
pages/writing/mock/[mockId]
pages/writing/review
```
</details>

<details><summary>Route files (`pages/**`)</summary>


```txt
pages/.well-known/assetlinks.json
pages/.well-known/assetlinks.json.ts
pages/403.tsx
pages/404.tsx
pages/500.tsx
pages/_app.tsx
pages/_document.tsx
pages/accessibility.tsx
pages/admin/content/reading.tsx
pages/admin/imp-as.tsx
pages/admin/index.tsx
pages/admin/listening.tsx
pages/admin/listening/articles.tsx
pages/admin/listening/media.tsx
pages/admin/partners/index.tsx
pages/admin/premium/pin.tsx
pages/admin/premium/promo-codes.tsx
pages/admin/premium/promo-usage.tsx
pages/admin/reading.tsx
pages/admin/reports/writing-activity.tsx
pages/admin/reviews/[attemptId].tsx
pages/admin/reviews/index.tsx
pages/admin/speaking/attempts.tsx
pages/admin/speaking/index.tsx
pages/admin/stop-impersonation.tsx
pages/admin/students/index.tsx
pages/admin/teacher/index.tsx
pages/admin/teachers/index.tsx
pages/admin/users.tsx
pages/admin/vocabulary/new-sense.tsx
pages/admin/writing/index.tsx
pages/admin/writing/topics.tsx
pages/ai/coach/index.tsx
pages/ai/index.tsx
pages/ai/mistakes-book/index.tsx
pages/ai/study-buddy/index.tsx
pages/ai/study-buddy/session/[id]/practice.tsx
pages/ai/study-buddy/session/[id]/summary.tsx
pages/ai/writing/[id].tsx
pages/analytics/listening.tsx
pages/analytics/listening/trajectory.tsx
pages/analytics/writing.tsx
pages/api/_middleware/ratelimit.ts
pages/api/account/delete.ts
pages/api/account/export.ts
pages/api/account/export/[token].ts
pages/api/account/redeem-pin.ts
pages/api/activities/export.ts
pages/api/admin/ai/vocab/usage.ts
pages/api/admin/dashboard.ts
pages/api/admin/flags/update.ts
pages/api/admin/health.ts
pages/api/admin/listening/article.upsert.ts
pages/api/admin/listening/media.upsert.ts
pages/api/admin/listening/tests.ts
pages/api/admin/listening/tips.moderate.ts
pages/api/admin/listening/upload.ts
pages/api/admin/premium/clear-pin.ts
pages/api/admin/premium/generate-pin.ts
pages/api/admin/premium/promo-codes.ts
pages/api/admin/premium/promo-usage.ts
pages/api/admin/premium/set-pin.ts
pages/api/admin/reading/tests.ts
pages/api/admin/reviews/index.ts
pages/api/admin/set-pin.ts
pages/api/admin/speaking/attempts/[id].ts
pages/api/admin/speaking/attempts/index.ts
pages/api/admin/speaking/prompts.ts
pages/api/admin/stop-impersonation.ts
pages/api/admin/students/actions.ts
pages/api/admin/students/export.ts
pages/api/admin/students/list.ts
pages/api/admin/teachers/approve.ts
pages/api/admin/teachers/index.ts
pages/api/admin/users.ts
pages/api/admin/users/list.ts
pages/api/admin/users/set-role.ts
pages/api/admin/writing-activity.ts
pages/api/admin/writing/list.ts
pages/api/admin/writing/prompts.ts
pages/api/admin/writing/regrade.ts
pages/api/admin/writing/topics.ts
pages/api/ai/chat.ts
pages/api/ai/coach.ts
pages/api/ai/coach/action.ts
pages/api/ai/explain.ts
pages/api/ai/generate-plan.ts
pages/api/ai/generate-reading.ts
pages/api/ai/health.ts
pages/api/ai/listening/accent.check.ts
pages/api/ai/listening/coach.ts
pages/api/ai/listening/dictation.grade.ts
pages/api/ai/next-item.ts
pages/api/ai/profile-suggest.ts
pages/api/ai/re-evaluate.ts
pages/api/ai/reading/explain.ts
pages/api/ai/reading/explanations.ts
pages/api/ai/recommend.ts
pages/api/ai/speaking/evaluate.ts
pages/api/ai/speaking/grade.ts
pages/api/ai/speaking/hints.ts
pages/api/ai/speaking/score-audio-groq.ts
pages/api/ai/speaking/score-v2.ts
pages/api/ai/speaking/score.ts
pages/api/ai/study-plan/generate.ts
pages/api/ai/study-plan/regenerate.ts
pages/api/ai/summary.ts
pages/api/ai/test-drive.ts
pages/api/ai/vocab/rewrite.ts
pages/api/ai/writing/explain.ts
pages/api/ai/writing/grade.ts
pages/api/ai/writing/insights.ts
pages/api/ai/writing/paraphrase.ts
pages/api/ai/writing/prompts.ts
pages/api/ai/writing/score-v1.ts
pages/api/ai/writing/score-v2.ts
pages/api/ai/writing/score.ts
pages/api/analytics/success-metrics.ts
pages/api/analytics/writing/overview.ts
pages/api/analytics/writing/progress.ts
pages/api/analytics/writing/summary.ts
pages/api/attempts/[id]/progress.ts
pages/api/attempts/progress/index.ts
pages/api/auth/forgot-password.ts
pages/api/auth/login-event.ts
pages/api/auth/login-events.ts
pages/api/auth/login.ts
pages/api/auth/logout.ts
pages/api/auth/sessions/[id].ts
pages/api/auth/sessions/index.ts
pages/api/auth/set-session.ts
pages/api/auth/signout.ts
pages/api/auth/signup.ts
pages/api/auth/whoami.ts
pages/api/billing/create-portal-session.ts
pages/api/billing/history.ts
pages/api/billing/portal.ts
pages/api/billing/stripe-webhook.ts
pages/api/billing/summary.ts
pages/api/blog/[slug].ts
pages/api/blog/index.ts
pages/api/blog/moderate.ts
pages/api/blog/modqueue.ts
pages/api/blog/submit.ts
pages/api/bookings/availability.ts
pages/api/bookings/cancel.ts
pages/api/bookings/create.ts
pages/api/bookings/reschedule.ts
pages/api/buddy/match.ts
pages/api/certificates/create.ts
pages/api/certificates/sign.ts
pages/api/challenge/enroll.ts
pages/api/challenge/leaderboard.ts
pages/api/challenge/progress.ts
pages/api/check-otp.ts
pages/api/checkout/create-intent.ts
pages/api/checkout/manual.ts
pages/api/classes/attendance.ts
pages/api/classes/cancel.ts
pages/api/classes/create.ts
pages/api/classes/join-token.ts
pages/api/coach/chat.ts
pages/api/coach/mood.ts
pages/api/coach/writing/reply.ts
pages/api/coach/writing/session.ts
pages/api/content/delete.ts
pages/api/content/publish.ts
pages/api/content/test-insert.ts
pages/api/content/upload.ts
pages/api/counters/increment.ts
pages/api/cron/notifications-dispatch.ts
pages/api/cron/notifications-study-reminder.ts
pages/api/dashboard/aggregate.ts
pages/api/debug/feature-flags.ts
pages/api/deeplink/resolve.ts
pages/api/dev/grant-role.ts
pages/api/dev/seed/listening-one.ts
pages/api/dev/study-sessions/list.ts
pages/api/drills/generate.ts
pages/api/entitlements.ts
pages/api/exam/[attemptId]/event.ts
pages/api/exam/[attemptId]/score.ts
pages/api/exam/[attemptId]/submit.ts
pages/api/exam/schedule.ts
pages/api/exp/assign.ts
pages/api/exports/analytics.parquet.ts
pages/api/exports/attempts.csv.ts
pages/api/flags/refresh.ts
pages/api/gamification/award-writing.ts
pages/api/gamification/challenges.ts
pages/api/gamification/challenges/progress.ts
pages/api/healthz.ts
pages/api/institutions/bulk-enroll.ts
pages/api/institutions/invite.ts
pages/api/institutions/orgs.ts
pages/api/institutions/reports.ts
pages/api/institutions/students.ts
pages/api/internal/auth/state.ts
pages/api/internal/payments/cron-settle-due.ts
pages/api/leaderboard/[skill].ts
pages/api/leaderboard/global.ts
pages/api/leaderboard/weekly.ts
pages/api/leaderboard/xp.ts
pages/api/lifecycle/trigger.ts
pages/api/listening/admin/create.ts
pages/api/listening/admin/upsert-question.ts
pages/api/listening/attempt.ts
pages/api/listening/attempts/export.csv.ts
pages/api/listening/attempts/log.ts
pages/api/listening/mini/grade.ts
pages/api/listening/mistakes/review.ts
pages/api/listening/practice/toggle.ts
pages/api/listening/review/[attemptId].ts
pages/api/listening/save.ts
pages/api/listening/submit.ts
pages/api/listening/test/[slug].ts
pages/api/listening/tests.ts
pages/api/listening/tips/submit.ts
pages/api/marketplace/apply.ts
pages/api/marketplace/approve.ts
pages/api/marketplace/coaches.ts
pages/api/me/plan.ts
pages/api/metrics.ts
pages/api/mistakes/add.ts
pages/api/mistakes/categorize.ts
pages/api/mistakes/index.ts
pages/api/mistakes/list.ts
pages/api/mock/checkpoint.ts
pages/api/mock/checkpoints/index.ts
pages/api/mock/full/save-answers.ts
pages/api/mock/full/start-attempt.ts
pages/api/mock/full/submit-final.ts
pages/api/mock/listening/create-run.ts
pages/api/mock/listening/play-ping.ts
pages/api/mock/listening/save-answers.ts
pages/api/mock/listening/submit-final.ts
pages/api/mock/reading/ai-feedback.ts
pages/api/mock/reading/attempt.ts
pages/api/mock/reading/mark.ts
pages/api/mock/reading/notes.ts
pages/api/mock/reading/result.ts
pages/api/mock/reading/submit-final.ts
pages/api/mock/writing/save-draft.ts
pages/api/mock/writing/start.ts
pages/api/mock/writing/status.ts
pages/api/mock/writing/submit.ts
pages/api/mock/writing/sync-batch.ts
pages/api/notifications/[id].ts
pages/api/notifications/enqueue.ts
pages/api/notifications/index.ts
pages/api/notifications/list.ts
pages/api/notifications/nudge.ts
pages/api/notifications/preferences.ts
pages/api/notifications/whatsapp-opt-in.ts
pages/api/offline/sync.ts
pages/api/onboarding/baseline.ts
pages/api/onboarding/complete.ts
pages/api/onboarding/diagnostic.ts
pages/api/onboarding/exam-date.ts
pages/api/onboarding/goal.ts
pages/api/onboarding/index.ts
pages/api/onboarding/language.ts
pages/api/onboarding/notifications.ts
pages/api/onboarding/review-data.ts
pages/api/onboarding/review.ts
pages/api/onboarding/save-survey.ts
pages/api/onboarding/study-rhythm.ts
pages/api/onboarding/target-band.ts
pages/api/onboarding/thinking-status.ts
pages/api/onboarding/timeline.ts
pages/api/onboarding/vibe.ts
pages/api/orgs/create.ts
pages/api/orgs/invite.ts
pages/api/partners/summary.ts
pages/api/payments/create-checkout-session.ts
pages/api/payments/create-easypaisa-session.ts
pages/api/payments/create-intent.ts
pages/api/payments/create-jazzcash-session.ts
pages/api/payments/initiate.ts
pages/api/payments/settle-due.ts
pages/api/payments/vault.ts
pages/api/payments/webhook.ts
pages/api/payments/webhooks/local.ts
pages/api/payments/webhooks/safepay.ts
pages/api/placement/score.ts
pages/api/placement/start.ts
pages/api/placement/submit.ts
pages/api/plan/apply-reco.ts
pages/api/predictor/score.ts
pages/api/premium/eligibility.ts
pages/api/premium/pin-status.ts
pages/api/premium/session.ts
pages/api/premium/set-pin.ts
pages/api/premium/signout.ts
pages/api/premium/status.ts
pages/api/premium/verify-pin.ts
pages/api/premium/verify.ts
pages/api/proctoring/flags.ts
pages/api/proctoring/start.ts
pages/api/proctoring/verify.ts
pages/api/profile/avatar-upload-url.ts
pages/api/progress/index.ts
pages/api/progress/share.ts
pages/api/promo/verify.ts
pages/api/promotions/[code].ts
pages/api/promotions/index.ts
pages/api/push/register.ts
pages/api/quick-drill.ts
pages/api/quiz/vocab/insights.ts
pages/api/quiz/vocab/start.ts
pages/api/quiz/vocab/submit.ts
pages/api/quota/snapshot.ts
pages/api/reading/ai/explain-answer.ts
pages/api/reading/ai/explain-passage.ts
pages/api/reading/ai/generate-passage.ts
pages/api/reading/ai/keywords.ts
pages/api/reading/ai/vocabulary.ts
pages/api/reading/ai/weakness-report.ts
pages/api/reading/attempt.ts
pages/api/reading/dashboard.ts
pages/api/reading/explain.ts
pages/api/reading/forecast.ts
pages/api/reading/mock/save-answer.ts
pages/api/reading/mock/start.ts
pages/api/reading/mock/submit.ts
pages/api/reading/recompute.ts
pages/api/reading/review/[attemptId].ts
pages/api/reading/submit-attempt.ts
pages/api/reading/submit.ts
pages/api/reading/test/[slug].ts
pages/api/reading/tests.ts
pages/api/reco/accept.ts
pages/api/reco/complete.ts
pages/api/reco/next-steps.ts
pages/api/reco/next-task.ts
pages/api/referrals.ts
pages/api/referrals/claim.ts
pages/api/referrals/create-code.ts
pages/api/referrals/create.ts
pages/api/referrals/generate.ts
pages/api/referrals/qualify.ts
pages/api/referrals/redeem.ts
pages/api/referrals/stats.ts
pages/api/referrals/verify.ts
pages/api/review/comments.ts
pages/api/review/due.ts
pages/api/review/grade.ts
pages/api/review/share-link.ts
pages/api/review/suspend.ts
pages/api/safepay/create-intent.ts
pages/api/safepay/webhook.ts
pages/api/saved/[id].ts
pages/api/saved/by-category/[category].ts
pages/api/saved/index.ts
pages/api/scores/challenge.ts
pages/api/search/index.ts
pages/api/send-otp.ts
pages/api/speaking/accent-mirror.ts
pages/api/speaking/attempt.ts
pages/api/speaking/attempts/[id].ts
pages/api/speaking/attempts/add-audio.ts
pages/api/speaking/attempts/index.ts
pages/api/speaking/coach/score.ts
pages/api/speaking/coach/upload.ts
pages/api/speaking/evaluate.ts
pages/api/speaking/feedback.ts
pages/api/speaking/file.ts
pages/api/speaking/limits/today.ts
pages/api/speaking/partner-summary.ts
pages/api/speaking/partner.ts
pages/api/speaking/partner/review/[attemptId].ts
pages/api/speaking/partner/summary.ts
pages/api/speaking/prompts.ts
pages/api/speaking/prompts/random.ts
pages/api/speaking/prompts/save.ts
pages/api/speaking/prompts/search.ts
pages/api/speaking/score-audio-groq.ts
pages/api/speaking/score-groq.ts
pages/api/speaking/score-save.ts
pages/api/speaking/score.ts
pages/api/speaking/sessions/index.ts
pages/api/speaking/signed-url.ts
pages/api/speaking/start-attempt.ts
pages/api/speaking/start.ts
pages/api/speaking/upload.ts
pages/api/strategies/toggle-save.ts
pages/api/strategies/vote.ts
pages/api/streak.ts
pages/api/streak_handler.ts
pages/api/study-buddy/[id].ts
pages/api/study-buddy/sessions.ts
pages/api/study-buddy/sessions/[id].ts
pages/api/study-buddy/sessions/[id]/complete.ts
pages/api/study-buddy/sessions/[id]/progress.ts
pages/api/study-buddy/sessions/[id]/start.ts
pages/api/study-buddy/sessions/create.ts
pages/api/study-buddy/summary.ts
pages/api/study-plan/events.ts
pages/api/study-plan/get.ts
pages/api/study-plan/quick-start.ts
pages/api/study-plan/status.ts
pages/api/subscriptions/portal.ts
pages/api/support.ts
pages/api/teacher/apply.ts
pages/api/teacher/assignments.ts
pages/api/teacher/cohorts.ts
pages/api/teacher/me.ts
pages/api/teacher/register.ts
pages/api/twilio-status.ts
pages/api/upload/audio.ts
pages/api/upload/index.ts
pages/api/user/dashboard.ts
pages/api/vocab/attempt/meaning.ts
pages/api/vocab/attempt/sentence.ts
pages/api/vocab/attempt/synonyms.ts
pages/api/vocab/leaderboard.ts
pages/api/vocab/today.ts
pages/api/vocabulary/[slug].ts
pages/api/vocabulary/highlights.ts
pages/api/vocabulary/index.ts
pages/api/waitlist.ts
pages/api/waitlist/submit.ts
pages/api/webhooks/payment.ts
pages/api/whatsapp/send.ts
pages/api/whatsapp/subscribe.ts
pages/api/whatsapp/tasks.ts
pages/api/whatsapp/webhook.ts
pages/api/words/learn.ts
pages/api/words/learned.ts
pages/api/words/today.ts
pages/api/writing/attempts/[id].ts
pages/api/writing/attempts/redraft.ts
pages/api/writing/attempts/save-draft.ts
pages/api/writing/attempts/start.ts
pages/api/writing/attempts/submit.ts
pages/api/writing/cohesion/heatmap.ts
pages/api/writing/critique/live.ts
pages/api/writing/cross/evidence.ts
pages/api/writing/cross/hedging.ts
pages/api/writing/draft.ts
pages/api/writing/drills/complete.ts
pages/api/writing/drills/recommend.ts
pages/api/writing/eval.ts
pages/api/writing/export/pdf.ts
pages/api/writing/lexical/track.ts
pages/api/writing/log-complete.ts
pages/api/writing/metrics/compute.ts
pages/api/writing/notifications/micro-prompt.ts
pages/api/writing/originals/upload.ts
pages/api/writing/paraphrase/suggest.ts
pages/api/writing/prompts/index.ts
pages/api/writing/readiness/evaluate.ts
pages/api/writing/reeval-history.ts
pages/api/writing/reevaluate.ts
pages/api/writing/rehearsals/similar.ts
pages/api/writing/reports/[token].ts
pages/api/writing/reports/band.ts
pages/api/writing/restore-reeval.ts
pages/api/writing/reviews/calibrate.ts
pages/api/writing/reviews/submit.ts
pages/api/writing/score/run.ts
pages/auth/callback.tsx
pages/auth/forgot.tsx
pages/auth/login.tsx
pages/auth/mfa.tsx
pages/auth/reset.tsx
pages/auth/signup.tsx
pages/blog/[slug].tsx
pages/blog/index.tsx
pages/bookings/[id].tsx
pages/bookings/index.tsx
pages/cert/[id].tsx
pages/cert/writing/[attemptId].tsx
pages/challenge/[cohort].tsx
pages/challenge/index.tsx
pages/checkout/cancel.tsx
pages/checkout/confirm.tsx
pages/checkout/crypto.tsx
pages/checkout/index.tsx
pages/checkout/save-card.tsx
pages/checkout/success.tsx
pages/classes/[id].tsx
pages/classes/index.tsx
pages/coach/[id].tsx
pages/coach/index.tsx
pages/community/chat.tsx
pages/community/index.tsx
pages/community/questions.tsx
pages/community/review/index.tsx
pages/content/studio/[id].tsx
pages/content/studio/index.tsx
pages/dashboard/activity/index.tsx
pages/dashboard/ai-reports.tsx
pages/dashboard/billing.tsx
pages/dashboard/components/shared/FeaturePreviewWrapper.tsx
pages/dashboard/components/shared/Header.tsx
pages/dashboard/components/shared/NotificationCenter.tsx
pages/dashboard/components/shared/Sidebar.tsx
pages/dashboard/components/shared/UpgradeModal.tsx
pages/dashboard/components/tiers/FreeView.tsx
pages/dashboard/components/tiers/OwlView.tsx
pages/dashboard/components/tiers/RocketView.tsx
pages/dashboard/components/tiers/SeedlingView.tsx
pages/dashboard/components/widgets/AIInsights.tsx
pages/dashboard/components/widgets/Achievements.tsx
pages/dashboard/components/widgets/BandProgress.tsx
pages/dashboard/components/widgets/DailyLoginFlow.tsx
pages/dashboard/components/widgets/ExportReports.tsx
pages/dashboard/components/widgets/KpiCards.tsx
pages/dashboard/components/widgets/Skeletons.tsx
pages/dashboard/components/widgets/UsageMeters.tsx
pages/dashboard/components/widgets/WeaknessMap.tsx
pages/dashboard/index.tsx
pages/dashboard/progress.tsx
pages/dashboard/reading.tsx
pages/dashboard/speaking.tsx
pages/dashboard/writing.tsx
pages/data-deletion.tsx
pages/exam-day.tsx
pages/exam/rehearsal.tsx
pages/faq.tsx
pages/forgot-password.tsx
pages/index.tsx
pages/institutions/[orgId]/index.tsx
pages/institutions/[orgId]/reports.tsx
pages/institutions/[orgId]/students.tsx
pages/institutions/index.tsx
pages/internal/content/playground.tsx
pages/labs/ai-tutor.tsx
pages/leaderboard/index.tsx
pages/learn/listening/coach.tsx
pages/learn/listening/index.tsx
pages/learn/listening/mistakes.tsx
pages/learn/listening/tips.tsx
pages/learning/[slug].tsx
pages/learning/drills.tsx
pages/learning/index.tsx
pages/learning/skills/[skill].tsx
pages/learning/skills/index.tsx
pages/learning/skills/lessons/[slug].tsx
pages/learning/skills/lessons/index.tsx
pages/learning/strategies/[tipSlug].tsx
pages/learning/strategies/index.tsx
pages/legal/privacy.tsx
pages/legal/terms.tsx
pages/listening/[slug].tsx
pages/listening/[slug]/review.tsx
pages/listening/index.tsx
pages/login/email.tsx
pages/login/index.tsx
pages/login/password.tsx
pages/login/phone.tsx
pages/marketplace/index.tsx
pages/me/listening/saved.tsx
pages/mistakes/index.tsx
pages/mock/[section].tsx
pages/mock/analytics.tsx
pages/mock/dashboard.tsx
pages/mock/full/index.tsx
pages/mock/index.tsx
pages/mock/listening/[slug].tsx
pages/mock/listening/exam/[slug].tsx
pages/mock/listening/history/index.tsx
pages/mock/listening/index.tsx
pages/mock/listening/result.tsx
pages/mock/listening/result/[attemptId].tsx
pages/mock/listening/review.tsx
pages/mock/listening/review/[attemptId].tsx
pages/mock/reading/[slug].tsx
pages/mock/reading/[slug]/result.tsx
pages/mock/reading/analytics.tsx
pages/mock/reading/challenges/accuracy.tsx
pages/mock/reading/challenges/index.tsx
pages/mock/reading/challenges/mastery.tsx
pages/mock/reading/challenges/speed.tsx
pages/mock/reading/challenges/weekly.tsx
pages/mock/reading/daily.tsx
pages/mock/reading/drill/passage.tsx
pages/mock/reading/drill/question-type.tsx
pages/mock/reading/drill/speed.tsx
pages/mock/reading/feedback/[attemptId].tsx
pages/mock/reading/history/index.tsx
pages/mock/reading/index.tsx
pages/mock/reading/result/[attemptId].tsx
pages/mock/reading/review/[attemptId].tsx
pages/mock/reading/techniques.tsx
pages/mock/reading/weekly/index.tsx
pages/mock/resume.tsx
pages/mock/speaking/[id].tsx
pages/mock/speaking/index.tsx
pages/mock/writing/[testId].tsx
pages/mock/writing/index.tsx
pages/mock/writing/result/[attemptId].tsx
pages/mock/writing/run.tsx
pages/notifications/index.tsx
pages/onboarding/baseline.tsx
pages/onboarding/diagnostic.tsx
pages/onboarding/exam-date.tsx
pages/onboarding/goal.tsx
pages/onboarding/index.tsx
pages/onboarding/notifications.tsx
pages/onboarding/review.tsx
pages/onboarding/skills.tsx
pages/onboarding/study-rhythm.tsx
pages/onboarding/target-band.tsx
pages/onboarding/teacher/index.tsx
pages/onboarding/teacher/status.tsx
pages/onboarding/thinking.tsx
pages/onboarding/timeline.tsx
pages/onboarding/vibe.tsx
pages/onboarding/welcome.tsx
pages/onboarding/welcome/index.tsx
pages/orgs/index.tsx
pages/partners/index.tsx
pages/placement/index.tsx
pages/placement/result.tsx
pages/placement/run.tsx
pages/placement/start.tsx
pages/practice/index.tsx
pages/practice/listening.tsx
pages/practice/listening/daily.tsx
pages/practice/reading.tsx
pages/practice/speaking.tsx
pages/practice/writing.tsx
pages/predictor/index.tsx
pages/predictor/result.tsx
pages/premium/PremiumExamPage.tsx
pages/premium/index.tsx
pages/premium/listening/[slug].tsx
pages/premium/pin.tsx
pages/premium/reading/[slug].tsx
pages/pricing/index.tsx
pages/pricing/overview.tsx
pages/proctoring/check.tsx
pages/proctoring/exam/[id].tsx
pages/profile/account/activity.tsx
pages/profile/account/billing.tsx
pages/profile/account/index.tsx
pages/profile/account/redeem.tsx
pages/profile/account/referrals.tsx
pages/profile/billing.tsx
pages/profile/index.tsx
pages/profile/setup/index.tsx
pages/profile/streak.tsx
pages/profile/subscription.tsx
pages/progress/[token].tsx
pages/progress/index.tsx
pages/promotions/index.tsx
pages/pwa/app.tsx
pages/quick/[skill].tsx
pages/quick/index.tsx
pages/r/[code].tsx
pages/reading/[slug].tsx
pages/reading/[slug]/review.tsx
pages/reading/index.tsx
pages/reading/passage/[slug].tsx
pages/reading/stats.tsx
pages/reports/band-analytics.tsx
pages/restricted.tsx
pages/review/listening/[id].tsx
pages/review/reading/[id].tsx
pages/review/share/ReviewShare.module.css
pages/review/share/[token].tsx
pages/review/speaking/[id].tsx
pages/review/writing/[id].tsx
pages/roadmap.tsx
pages/saved/index.tsx
pages/score/index.tsx
pages/settings/accessibility.tsx
pages/settings/billing.tsx
pages/settings/index.tsx
pages/settings/language.tsx
pages/settings/notifications.tsx
pages/settings/security.tsx
pages/signup/email.tsx
pages/signup/index.tsx
pages/signup/password.tsx
pages/signup/phone.tsx
pages/signup/verify.tsx
pages/speaking/[promptId].tsx
pages/speaking/attempts/[attemptId]/result.tsx
pages/speaking/attempts/index.tsx
pages/speaking/buddy.tsx
pages/speaking/coach/[slug].tsx
pages/speaking/coach/free.tsx
pages/speaking/coach/index.tsx
pages/speaking/index.tsx
pages/speaking/library.tsx
pages/speaking/live/[id].tsx
pages/speaking/live/index.tsx
pages/speaking/packs/[slug].tsx
pages/speaking/partner.tsx
pages/speaking/partner/history.tsx
pages/speaking/partner/review/[attemptId].tsx
pages/speaking/practice.tsx
pages/speaking/report.tsx
pages/speaking/review/[id].tsx
pages/speaking/roleplay/[scenario].tsx
pages/speaking/roleplay/index.tsx
pages/speaking/settings.tsx
pages/speaking/simulator/index.tsx
pages/speaking/simulator/part1.tsx
pages/speaking/simulator/part2.tsx
pages/speaking/simulator/part3.tsx
pages/study-plan/[weekId].tsx
pages/study-plan/index.tsx
pages/teacher/Welcome.tsx
pages/teacher/cohorts/[id].tsx
pages/teacher/index.tsx
pages/teacher/onboarding.tsx
pages/teacher/pending.tsx
pages/teacher/register.tsx
pages/tokens-test.tsx
pages/tools/listening/accent-trainer.tsx
pages/tools/listening/dictation.tsx
pages/tools/mark-sections/[slug].tsx
pages/update-password.tsx
pages/visa/index.tsx
pages/vocab/index.tsx
pages/vocabulary/[word].tsx
pages/vocabulary/ai-lab.tsx
pages/vocabulary/index.tsx
pages/vocabulary/infiniteapplications.tsx
pages/vocabulary/learned.tsx
pages/vocabulary/linking-words.tsx
pages/vocabulary/lists.tsx
pages/vocabulary/my-words.tsx
pages/vocabulary/quizzes/index.tsx
pages/vocabulary/quizzes/today.tsx
pages/vocabulary/review.tsx
pages/vocabulary/saved.tsx
pages/vocabulary/speaking/[topic].tsx
pages/vocabulary/speaking/index.tsx
pages/vocabulary/synonyms.tsx
pages/vocabulary/topics/[topic].tsx
pages/vocabulary/topics/index.tsx
pages/waitlist.tsx
pages/welcome/index.tsx
pages/whatsapp-tasks.tsx
pages/word-of-the-day.tsx
pages/writing/[slug].tsx
pages/writing/drills/[slug].tsx
pages/writing/drills/index.tsx
pages/writing/index.tsx
pages/writing/learn/coherence.tsx
pages/writing/learn/grammar.tsx
pages/writing/learn/index.tsx
pages/writing/learn/lexical.tsx
pages/writing/learn/task1-overview.tsx
pages/writing/learn/task2-structure.tsx
pages/writing/library.tsx
pages/writing/mock/[mockId]/evaluating.tsx
pages/writing/mock/[mockId]/results.tsx
pages/writing/mock/[mockId]/review.tsx
pages/writing/mock/[mockId]/start.tsx
pages/writing/mock/[mockId]/workspace.tsx
pages/writing/mock/index.tsx
pages/writing/overview.tsx
pages/writing/progress.tsx
pages/writing/resources.tsx
pages/writing/review/[attemptId].tsx
pages/writing/review/calibrate.tsx
```
</details>

## Component inventory

- Top-level component domains: **70**
- Nested component domains: **17**

### Top-level domains

```txt
account
activity
admin
ai
analytics
audio
auth
banners
billing
branding
cards
certificates
challenge
charts
checkout
coach
common
dashboard
design-system
entitlements
error
exam
exp
feature
hooks
innovation
launch
layouts
leaderboard
learning
listening
loading
marketing
mistakes
mobile
mock-tests
modules
nav
navigation
notifications
onboarding
orgs
partners
payments
paywall
predictor
premium
progress
providers
quick
quiz
reading
reco
referrals
review
saved
sections
settings
speaking
streak
study
study-plan
teacher
timers
ui
user
visa
vocab
waitlist
writing
```

### Nested domains

```txt
design-system/_core
design-system/icons
exam/AnswerControls
listening/accent
listening/analytics
listening/cards
listening/dictation
listening/modals
listening/players
listening/quizzes
reading/analytics
reading/answer-sheet
reading/daily
reading/history
reading/review
sections/Learning
writing/studio
```

## Violations by type

### 1) Business logic embedded in route files

- **Direct data fetching + auth in route components/SSR:**

  - `pages/profile/account/index.tsx` loads billing summary via `fetch`, pulls session/profile via Supabase, and computes role flags/activity counters inline.
  - `pages/profile/account/billing.tsx` does auth guard in `getServerSideProps`, then fetches summary/invoices/dues and derives multiple UI states inline.
  - `pages/study-plan/index.tsx` performs Supabase reads/writes plus plan generation and transformation logic in the page.
- **Plan/usage/subscription decision logic in pages:**

  - `pages/study-plan/index.tsx`, `pages/dashboard/index.tsx`, and account pages contain subscription tier checks and usage-related UX decisions.
- **Auth guard/redirect logic repeated in many SSR routes:**

  - Pattern found repeatedly: create server client -> `supabase.auth.getUser|getSession` -> redirect if unauthenticated.
- **Inline transformation logic in routes:**

  - Examples include status-to-badge mappings and title-case/format helpers in `pages/profile/account/index.tsx` and `pages/profile/account/billing.tsx`.

### 2) API/database calls inside UI components (`components/**`)

- `components/**` contains substantial direct network/data access from UI layer (fetch + Supabase RPC/from calls).
- High-impact examples:
  - `components/dashboard/SavedItems.tsx:26:        const res = await fetch('/api/saved');`
  - `components/notifications/NotificationProvider.tsx:61:        const res = await fetch('/api/notifications', {`
  - `components/notifications/NotificationProvider.tsx:114:      await fetch(`/api/notifications/${id}`, {`
  - `components/reading/ReadingExamShell.tsx:416:      await supabase.from('reading_attempts').insert({`
  - `components/innovation/MistakesBookPanel.tsx:31:      const res = await fetch(`/api/mistakes/list?userId=${encodeURIComponent(userId ?? '')}`);`
  - `components/innovation/MistakesBookPanel.tsx:51:      const res = await fetch('/api/mistakes/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });`
  - `components/innovation/MistakesBookPanel.tsx:67:      await fetch('/api/mistakes/categorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_resolved' }) });`
  - `components/ActivityLogPage.tsx:230:      const { data, error } = await supabase.rpc('create_task_with_activity', {`
  - `components/ActivityLogPage.tsx:278:        await supabase.from('task_comments').insert({`
  - `components/ActivityLogPage.tsx:299:      const { error } = await supabase.from('task_comments').insert({`
  - `components/review/TodayReviewsPanel.tsx:339:      const res = await fetch(`/api/review/due?limit=${SESSION_LIMIT}`);`
  - `components/review/TodayReviewsPanel.tsx:444:        const res = await fetch('/api/review/grade', {`
  - `components/review/TodayReviewsPanel.tsx:478:      const res = await fetch('/api/review/suspend', {`
  - `components/review/TodayReviewsPanel.tsx:570:            const response = await fetch('/api/speaking/attempt', {`
  - `components/review/TodayReviewsPanel.tsx:631:        const response = await fetch('/api/listening/attempt', {`
  - `components/review/TodayReviewsPanel.tsx:676:      const response = await fetch('/api/writing/eval', {`
  - `components/review/TodayReviewsPanel.tsx:735:      const response = await fetch('/api/reading/attempt', {`
  - `components/design-system/AvatarUploader.tsx:105:      const res = await fetch("/api/profile/avatar-upload-url", {`
  - `components/design-system/AvatarUploader.tsx:123:      const uploadRes = await fetch(uploadUrl, {`
  - `components/activity/CreateTaskModal.tsx:59:      const { data, error } = await supabase.rpc('create_task_with_activity', {`

<details><summary>Full API/database invocation hits in `components/**`</summary>


```txt
components/predictor/BandPredictorForm.tsx:89:      const res = await fetch('/api/predictor/score', {
components/dashboard/ShareLinkCard.tsx:13:      const res = await fetch('/api/progress/share', { method: 'POST' });
components/dashboard/SavedItems.tsx:26:        const res = await fetch('/api/saved');
components/dashboard/WhatsAppOptIn.tsx:17:      const res = await fetch("/api/whatsapp/subscribe", {
components/dashboard/ChallengeSpotlightCard.tsx:56:        const res = await fetch(`/api/challenge/leaderboard?cohort=${encodeURIComponent(cohortId)}`);
components/dashboard/ChallengeSpotlightCard.tsx:121:                  const res = await fetch(`/api/challenge/leaderboard?cohort=${encodeURIComponent(cohortId)}`);
components/dashboard/DailyWeeklyChallenges.tsx:53:      const res = await fetch('/api/gamification/challenges', {
components/dashboard/DailyWeeklyChallenges.tsx:77:        const res = await fetch('/api/gamification/challenges/progress', {
components/payments/PlanPicker.tsx:58:  stripe: 'Card',
components/payments/PlanPicker.tsx:81:    return ['stripe'];
components/payments/PlanPicker.tsx:84:  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>(() => availableMethods[0] ?? 'stripe');
components/payments/CheckoutForm.tsx:21:  methods = ['stripe', 'crypto', 'easypaisa', 'jazzcash', 'safepay'],
components/payments/CheckoutForm.tsx:67:      {methods.includes('stripe') && (
components/payments/CheckoutForm.tsx:73:            onClick={() => start('stripe')}
components/payments/CheckoutForm.tsx:77:            {loading === 'stripe' ? 'Starting…' : 'Continue with Card'}
components/SaveItemButton.tsx:21:        const res = await fetch(url);
components/SaveItemButton.tsx:41:      const res = await fetch(`/api/saved/by-category/${category}`, {
components/SaveItemButton.tsx:51:      const res = await fetch(`/api/saved/by-category/${category}`, {
components/writing/CoachDock.tsx:158:      const res = await fetch(`/api/coach/writing/session?attemptId=${encodeURIComponent(attemptId)}`, {
components/writing/CoachDock.tsx:226:        const response = await fetch('/api/coach/writing/reply', {
components/writing/AIReview.tsx:49:    const res = await fetch('/api/ai/chat?p=openai', {
components/writing/ExportButton.tsx:21:      const response = await fetch(`/api/writing/export/pdf?attemptId=${attemptId}`);
components/speaking/AccentMirror.tsx:22:        const res = await fetch(`/api/speaking/accent-mirror?accent=${accent}`);
components/speaking/AIReview.tsx:39:    const res = await fetch('/api/ai/chat?p=openai', {
components/speaking/AIReview.tsx:126:        const resp = await fetch('/api/speaking/score', {
components/writing/studio/RetakeGuard.tsx:30:      const response = await fetch('/api/writing/readiness/evaluate', { method: 'POST' });
components/speaking/StudyBuddyMatch.tsx:27:    const res = await fetch('/api/buddy/match', {
components/writing/studio/LiveCritiquePanel.tsx:27:      const response = await fetch('/api/writing/critique/live', {
components/writing/studio/PaperUploadPanel.tsx:30:      const response = await fetch('/api/writing/originals/upload', {
components/speaking/BookmarkToggle.tsx:60:      const res = await fetch('/api/speaking/prompts/save', {
components/writing/studio/LexicalTrackerPanel.tsx:28:      const response = await fetch('/api/writing/lexical/track', {
components/writing/studio/ParaphraseStudio.tsx:27:      const response = await fetch('/api/writing/paraphrase/suggest', {
components/writing/studio/CohesionHeatmapPanel.tsx:21:      const response = await fetch('/api/writing/cohesion/heatmap', {
components/writing/ReevalPanel.tsx:36:      const res = await fetch('/api/writing/reevaluate', {
components/writing/Editor.tsx:110:        const res = await fetch('/api/writing/draft', {
components/exp/Variant.tsx:77:    await fetch('/api/exp/assign', {
components/exp/Variant.tsx:102:  const res = await fetch('/api/exp/assign', {
components/writing/WritingExamRoom.tsx:205:        const res = await fetch('/api/mock/writing/submit', {
components/auth/AuthAssistant.tsx:117:      const res = await fetch('/api/ai/test-drive', {
components/sections/Learning/DrillGenerator.tsx:16:      const res = await fetch('/api/drills/generate', {
components/paywall/PricingReasonBanner.tsx:55:    fetch('/api/quota/snapshot')
components/teacher/TeacherOnboardingForm.tsx:77:      const response = await fetch('/api/teacher/register', {
components/teacher/AssignTaskModal.tsx:66:        const res = await fetch('/api/teacher/assignments', {
components/exam/TimingRehearsal.tsx:17:      await fetch('/api/exam/schedule', {
components/notifications/NotificationProvider.tsx:61:        const res = await fetch('/api/notifications', {
components/notifications/NotificationProvider.tsx:114:      await fetch(`/api/notifications/${id}`, {
components/notifications/NotificationPreferencesPanel.tsx:35:      const res = await fetch('/api/notifications/preferences');
components/notifications/NotificationPreferencesPanel.tsx:59:      const res = await fetch('/api/notifications/preferences', {
components/notifications/NotificationPreferencesPanel.tsx:127:      const res = await fetch('/api/send-otp', {
components/notifications/NotificationPreferencesPanel.tsx:160:        const res = await fetch('/api/check-otp', {
components/reading/ReadingExamShell.tsx:416:      await supabase.from('reading_attempts').insert({
components/reading/AISummaryCard.tsx:16:        const r = await fetch('/api/ai/summary');
components/reading/ReadingForecastPanel.tsx:48:        const r = await fetch(`/api/reading/forecast?target=${targetBand}`);
components/challenge/Leaderboard.tsx:23:      const res = await fetch(`/api/challenge/leaderboard?cohort=${encodeURIComponent(cohortId)}`);
components/challenge/TaskList.tsx:35:          const res = await fetch("/api/challenge/progress", {
components/innovation/MistakesBookPanel.tsx:31:      const res = await fetch(`/api/mistakes/list?userId=${encodeURIComponent(userId ?? '')}`);
components/innovation/MistakesBookPanel.tsx:51:      const res = await fetch('/api/mistakes/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
components/innovation/MistakesBookPanel.tsx:67:      await fetch('/api/mistakes/categorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_resolved' }) });
components/innovation/AICoachPanel.tsx:49:      const res = await fetch('/api/ai/coach', {
components/innovation/AICoachPanel.tsx:78:      await fetch('/api/ai/coach/action', {
components/innovation/WhatsAppTasksPanel.tsx:17:      const res = await fetch(`/api/whatsapp/tasks?userId=${encodeURIComponent(userId ?? '')}`);
components/innovation/WhatsAppTasksPanel.tsx:30:      const res = await fetch('/api/whatsapp/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
components/innovation/WhatsAppTasksPanel.tsx:38:      await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
components/admin/ImpersonationBanner.tsx:51:      void fetch('/api/admin/stop-impersonation').catch(() => {});
components/innovation/StudyBuddyPanel.tsx:24:      const res = await fetch('/api/study-buddy/sessions', {
components/innovation/StudyBuddyPanel.tsx:41:      await fetch(`/api/study-buddy/sessions/${session.id}/start`, { method: 'POST' });
components/innovation/StudyBuddyPanel.tsx:43:      const r = await fetch(`/api/study-buddy/sessions/${session.id}`);
components/ActivityLogPage.tsx:230:      const { data, error } = await supabase.rpc('create_task_with_activity', {
components/ActivityLogPage.tsx:278:        await supabase.from('task_comments').insert({
components/ActivityLogPage.tsx:299:      const { error } = await supabase.from('task_comments').insert({
components/Header.tsx:144:        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
components/ai/SidebarAI.tsx:5:export type Provider = 'grok' | 'gemini' | 'openai' | 'none';
components/ai/AiTestDrive.tsx:42:      const r = await fetch('/api/ai/test-drive', {
components/review/ChallengeScore.tsx:18:      const res = await fetch('/api/scores/challenge', {
components/review/TodayReviewsPanel.tsx:339:      const res = await fetch(`/api/review/due?limit=${SESSION_LIMIT}`);
components/review/TodayReviewsPanel.tsx:444:        const res = await fetch('/api/review/grade', {
components/review/TodayReviewsPanel.tsx:478:      const res = await fetch('/api/review/suspend', {
components/review/TodayReviewsPanel.tsx:570:            const response = await fetch('/api/speaking/attempt', {
components/review/TodayReviewsPanel.tsx:631:        const response = await fetch('/api/listening/attempt', {
components/review/TodayReviewsPanel.tsx:676:      const response = await fetch('/api/writing/eval', {
components/review/TodayReviewsPanel.tsx:735:      const response = await fetch('/api/reading/attempt', {
components/vocab/SentencePractice.tsx:83:        const response = await fetch('/api/vocab/attempt/sentence', {
components/vocab/SynonymRush.tsx:105:      const response = await fetch('/api/vocab/attempt/synonyms', {
components/vocab/MeaningQuiz.tsx:76:        const response = await fetch('/api/vocab/attempt/meaning', {
components/vocab/RewardsPanel.tsx:197:        const response = await fetch('/api/vocab/leaderboard', { signal: controller.signal });
components/billing/UpgradeDialog.tsx:11:const DEFAULT_METHODS: PaymentMethod[] = ['stripe', 'crypto', 'easypaisa', 'jazzcash', 'safepay'];
components/billing/UpgradeDialog.tsx:134:                      method === 'stripe'
components/waitlist/WaitlistForm.tsx:25:    const res = await fetch('/api/waitlist/submit', {
components/listening/ListeningExamShell.tsx:286:        const res = await fetch('/api/listening/submit', {
components/listening/ReviewScreen.tsx:162:        const response = await fetch(`/api/listening/review/${id}`, { credentials: 'include' });
components/design-system/AvatarUploader.tsx:105:      const res = await fetch("/api/profile/avatar-upload-url", {
components/design-system/AvatarUploader.tsx:123:      const uploadRes = await fetch(uploadUrl, {
components/activity/CreateTaskModal.tsx:59:      const { data, error } = await supabase.rpc('create_task_with_activity', {
components/activity/TaskBoard.tsx:45:        await supabase.rpc('log_user_activity', {
components/quiz/VocabInsightsCards.tsx:8:  const response = await fetch(url);
components/reco/NextTaskCard.tsx:100:      const res = await fetch('/api/reco/accept', {
```
</details>

## Duplicate logic map

| Duplicate concern | Repeated pattern | Representative files |
|---|---|---|
| Auth/session guard in SSR routes | `getServerClient(...)` + `supabase.auth.getUser/getSession` + redirect | `pages/quick/index.tsx`, `pages/quick/[skill].tsx`, `pages/profile/account/billing.tsx`, `pages/mock/reading/weekly/index.tsx`, `pages/speaking/coach/index.tsx` |
| Role checks/profile bootstrap | Session read then `profiles` query to compute admin/teacher flags | `pages/profile/account/index.tsx`, `pages/admin/listening/articles.tsx`, `pages/admin/listening/media.tsx` |
| Billing/subscription summary fetch + status mapping | `fetch(/api/billing/summary)` + local status variant/title-case transforms | `pages/profile/account/index.tsx`, `pages/profile/account/billing.tsx` |
| Feature flag redirect wrappers | `if (!flags.enabled(...)) redirect(...)` | `pages/quick/index.tsx`, `pages/quick/[skill].tsx` |
| Usage/plan gating and upsell decisions | Plan/entitlement checks and upgrade banners embedded in page | `pages/study-plan/index.tsx`, `pages/dashboard/index.tsx`, `pages/profile/subscription.tsx` |

## Remediation priority

1. **Centralize route auth guards (highest):** create shared SSR/auth middleware helper for all protected pages to eliminate repeated redirect/session code.
2. **Extract route data orchestration into service/hooks layer:** move Supabase + API orchestration out of page files into dedicated `lib/services` + query hooks.
3. **Move subscription/usage policy decisions into shared domain module:** consolidate entitlement/plan/usage checks to one policy API.
4. **Restrict API/database access in presentational components:** move `fetch`/`supabase` calls into container hooks or state machines; keep UI components mostly pure.
5. **Normalize formatting/transformation helpers:** de-duplicate status/label/date mappers into reusable utility modules.
6. **Introduce architecture linting checks:** add ESLint rules or custom checks for disallowed DB/API calls in `components/` and duplicated SSR guards in `pages/`.