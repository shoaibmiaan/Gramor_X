# Gramor_X Project Tracker

**Last updated:** 2026-03-08  
**Total pages:** 332  
**Overall progress:** ███░░░░░░░ 24% (80/332 pages reviewed)  
_Use `Ctrl+F` (or `Cmd+F`) to filter by route, module, or file._

---

## Summary by Layout

| Layout              | Pages | Done | Progress Bar  |
| ------------------- | ----- | ---- | ------------- |
| AuthLayout          | 16    | 0    | ░░░░░░░░░░ 0% |
| DashboardLayout     | 85    | 0    | ░░░░░░░░░░ 0% |
| AdminLayout         | 27    | 0    | ░░░░░░░░░░ 0% |
| TeacherLayout       | 8     | 0    | ░░░░░░░░░░ 0% |
| InstitutionsLayout  | 4     | 0    | ░░░░░░░░░░ 0% |
| MarketplaceLayout   | 1     | 0    | ░░░░░░░░░░ 0% |
| LearningLayout      | 9     | 0    | ░░░░░░░░░░ 0% |
| CommunityLayout     | 3     | 0    | ░░░░░░░░░░ 0% |
| ReportsLayout       | 1     | 0    | ░░░░░░░░░░ 0% |
| ProfileLayout       | 15    | 0    | ░░░░░░░░░░ 0% |
| ProctoringLayout    | 2     | 0    | ░░░░░░░░░░ 0% |
| AnalyticsLayout     | 7     | 0    | ░░░░░░░░░░ 0% |
| BillingLayout       | 8     | 0    | ░░░░░░░░░░ 0% |
| CommunicationLayout | 2     | 0    | ░░░░░░░░░░ 0% |
| ExamLayout          | 36    | 0    | ░░░░░░░░░░ 0% |
| ExamResourceLayout  | 1     | 0    | ░░░░░░░░░░ 0% |
| GlobalPageLayout    | 12    | 0    | ░░░░░░░░░░ 0% |
| OnboardingLayout    | 7     | 0    | ░░░░░░░░░░ 0% |
| ResourcesLayout     | 3     | 0    | ░░░░░░░░░░ 0% |
| WritingLayout       | 15    | 0    | ░░░░░░░░░░ 0% |
| WritingExamLayout   | 10    | 0    | ░░░░░░░░░░ 0% |

---

## Layout Details

Click the triangle to expand each section.

<details>
<summary><strong>🔐 AuthLayout</strong> – 16 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route              | Local                                       | Live                                      | Module | File                        | Components        | Reviewer | Priority | Notes |
| --- | ---- | ------------------ | ------------------------------------------- | ----------------------------------------- | ------ | --------------------------- | ----------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/login`           | [🔗](http://localhost:3000/login)           | [🌐](https://gramorx.com/login)           | Auth   | `pages/login/index.tsx`     | `LoginForm`       |          |          |       |
| 2   | [ ]  | `/login/email`     | [🔗](http://localhost:3000/login/email)     | [🌐](https://gramorx.com/login/email)     | Auth   | `pages/login/email.tsx`     | `EmailLogin`      |          |          |       |
| 3   | [ ]  | `/login/password`  | [🔗](http://localhost:3000/login/password)  | [🌐](https://gramorx.com/login/password)  | Auth   | `pages/login/password.tsx`  | `PasswordLogin`   |          |          |       |
| 4   | [ ]  | `/login/phone`     | [🔗](http://localhost:3000/login/phone)     | [🌐](https://gramorx.com/login/phone)     | Auth   | `pages/login/phone.tsx`     | `PhoneLogin`      |          |          |       |
| 5   | [ ]  | `/signup`          | [🔗](http://localhost:3000/signup)          | [🌐](https://gramorx.com/signup)          | Auth   | `pages/signup/index.tsx`    | `SignupForm`      |          |          |       |
| 6   | [ ]  | `/signup/email`    | [🔗](http://localhost:3000/signup/email)    | [🌐](https://gramorx.com/signup/email)    | Auth   | `pages/signup/email.tsx`    | `EmailSignup`     |          |          |       |
| 7   | [ ]  | `/signup/phone`    | [🔗](http://localhost:3000/signup/phone)    | [🌐](https://gramorx.com/signup/phone)    | Auth   | `pages/signup/phone.tsx`    | `PhoneSignup`     |          |          |       |
| 8   | [ ]  | `/signup/verify`   | [🔗](http://localhost:3000/signup/verify)   | [🌐](https://gramorx.com/signup/verify)   | Auth   | `pages/signup/verify.tsx`   | `VerifyEmail`     |          |          |       |
| 9   | [ ]  | `/auth/callback`   | [🔗](http://localhost:3000/auth/callback)   | [🌐](https://gramorx.com/auth/callback)   | Auth   | `pages/auth/callback.tsx`   | `CallbackHandler` |          |          |       |
| 10  | [ ]  | `/auth/reset`      | [🔗](http://localhost:3000/auth/reset)      | [🌐](https://gramorx.com/auth/reset)      | Auth   | `pages/auth/reset.tsx`      | `ResetPassword`   |          |          |       |
| 11  | [ ]  | `/auth/mfa`        | [🔗](http://localhost:3000/auth/mfa)        | [🌐](https://gramorx.com/auth/mfa)        | Auth   | `pages/auth/mfa.tsx`        | `MfaVerification` |          |          |       |
| 12  | [ ]  | `/auth/forgot`     | [🔗](http://localhost:3000/auth/forgot)     | [🌐](https://gramorx.com/auth/forgot)     | Auth   | `pages/auth/forgot.tsx`     | `ForgotPassword`  |          |          |       |
| 13  | [ ]  | `/auth/verify`     | [🔗](http://localhost:3000/auth/verify)     | [🌐](https://gramorx.com/auth/verify)     | Auth   | `pages/auth/verify.tsx`     | `VerifyAccount`   |          |          |       |
| 14  | [ ]  | `/auth/confirm`    | [🔗](http://localhost:3000/auth/confirm)    | [🌐](https://gramorx.com/auth/confirm)    | Auth   | `pages/auth/confirm.tsx`    | `Confirm`         |          |          |       |
| 15  | [ ]  | `/forgot-password` | [🔗](http://localhost:3000/forgot-password) | [🌐](https://gramorx.com/forgot-password) | Auth   | `pages/forgot-password.tsx` | `ForgotPassword`  |          |          |       |
| 16  | [ ]  | `/update-password` | [🔗](http://localhost:3000/update-password) | [🌐](https://gramorx.com/update-password) | Auth   | `pages/update-password.tsx` | `UpdatePassword`  |          |          |       |

</details>

<details>
<summary><strong>📊 DashboardLayout</strong> – 85 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                                   | Local                                                            | Live                                                           | Module       | File                                             | Components          | Reviewer | Priority | Notes |
| --- | ---- | --------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | ------------ | ------------------------------------------------ | ------------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/dashboard`                            | [🔗](http://localhost:3000/dashboard)                            | [🌐](https://gramorx.com/dashboard)                            | Dashboard    | `pages/dashboard/index.tsx`                      | `Dashboard`         |          |          |       |
| 2   | [ ]  | `/study-plan`                           | [🔗](http://localhost:3000/study-plan)                           | [🌐](https://gramorx.com/study-plan)                           | Study Plan   | `pages/study-plan/index.tsx`                     | `StudyPlan`         |          |          |       |
| 3   | [ ]  | `/progress`                             | [🔗](http://localhost:3000/progress)                             | [🌐](https://gramorx.com/progress)                             | Progress     | `pages/progress/index.tsx`                       | `Progress`          |          |          |       |
| 4   | [ ]  | `/progress/[token]`                     | [🔗](http://localhost:3000/progress/[token])                     | [🌐](https://gramorx.com/progress/[token])                     | Progress     | `pages/progress/[token].tsx`                     | `ProgressToken`     |          |          |       |
| 5   | [ ]  | `/writing`                              | [🔗](http://localhost:3000/writing)                              | [🌐](https://gramorx.com/writing)                              | Writing      | `pages/writing/index.tsx`                        | `WritingHub`        |          |          |       |
| 6   | [ ]  | `/listening`                            | [🔗](http://localhost:3000/listening)                            | [🌐](https://gramorx.com/listening)                            | Listening    | `pages/listening/index.tsx`                      | `ListeningHub`      |          |          |       |
| 7   | [ ]  | `/listening/[slug]`                     | [🔗](http://localhost:3000/listening/[slug])                     | [🌐](https://gramorx.com/listening/[slug])                     | Listening    | `pages/listening/[slug].tsx`                     | `ListeningDetail`   |          |          |       |
| 8   | [ ]  | `/listening/[slug]/review`              | [🔗](http://localhost:3000/listening/[slug]/review)              | [🌐](https://gramorx.com/listening/[slug]/review)              | Listening    | `pages/listening/[slug]/review.tsx`              | `ListeningReview`   |          |          |       |
| 9   | [ ]  | `/me/listening/saved`                   | [🔗](http://localhost:3000/me/listening/saved)                   | [🌐](https://gramorx.com/me/listening/saved)                   | Listening    | `pages/me/listening/saved.tsx`                   | `SavedList`         |          |          |       |
| 10  | [ ]  | `/reading`                              | [🔗](http://localhost:3000/reading)                              | [🌐](https://gramorx.com/reading)                              | Reading      | `pages/reading/index.tsx`                        | `ReadingHub`        |          |          |       |
| 11  | [ ]  | `/reading/[slug]`                       | [🔗](http://localhost:3000/reading/[slug])                       | [🌐](https://gramorx.com/reading/[slug])                       | Reading      | `pages/reading/[slug].tsx`                       | `ReadingDetail`     |          |          |       |
| 12  | [ ]  | `/reading/[slug]/review`                | [🔗](http://localhost:3000/reading/[slug]/review)                | [🌐](https://gramorx.com/reading/[slug]/review)                | Reading      | `pages/reading/[slug]/review.tsx`                | `ReadingReview`     |          |          |       |
| 13  | [ ]  | `/reading/passage/[slug]`               | [🔗](http://localhost:3000/reading/passage/[slug])               | [🌐](https://gramorx.com/reading/passage/[slug])               | Reading      | `pages/reading/passage/[slug].tsx`               | `PassageDetail`     |          |          |       |
| 14  | [ ]  | `/reading/stats`                        | [🔗](http://localhost:3000/reading/stats)                        | [🌐](https://gramorx.com/reading/stats)                        | Reading      | `pages/reading/stats.tsx`                        | `ReadingStats`      |          |          |       |
| 15  | [ ]  | `/speaking`                             | [🔗](http://localhost:3000/speaking)                             | [🌐](https://gramorx.com/speaking)                             | Speaking     | `pages/speaking/index.tsx`                       | `SpeakingHub`       |          |          |       |
| 16  | [ ]  | `/speaking/[promptId]`                  | [🔗](http://localhost:3000/speaking/[promptId])                  | [🌐](https://gramorx.com/speaking/[promptId])                  | Speaking     | `pages/speaking/[promptId].tsx`                  | `SpeakingPrompt`    |          |          |       |
| 17  | [ ]  | `/speaking/attempts`                    | [🔗](http://localhost:3000/speaking/attempts)                    | [🌐](https://gramorx.com/speaking/attempts)                    | Speaking     | `pages/speaking/attempts/index.tsx`              | `AttemptsIndex`     |          |          |       |
| 18  | [ ]  | `/speaking/attempts/[attemptId]/result` | [🔗](http://localhost:3000/speaking/attempts/[attemptId]/result) | [🌐](https://gramorx.com/speaking/attempts/[attemptId]/result) | Speaking     | `pages/speaking/attempts/[attemptId]/result.tsx` | `AttemptResult`     |          |          |       |
| 19  | [ ]  | `/speaking/buddy`                       | [🔗](http://localhost:3000/speaking/buddy)                       | [🌐](https://gramorx.com/speaking/buddy)                       | Speaking     | `pages/speaking/buddy.tsx`                       | `Buddy`             |          |          |       |
| 20  | [ ]  | `/speaking/coach`                       | [🔗](http://localhost:3000/speaking/coach)                       | [🌐](https://gramorx.com/speaking/coach)                       | Speaking     | `pages/speaking/coach/index.tsx`                 | `CoachIndex`        |          |          |       |
| 21  | [ ]  | `/speaking/coach/[slug]`                | [🔗](http://localhost:3000/speaking/coach/[slug])                | [🌐](https://gramorx.com/speaking/coach/[slug])                | Speaking     | `pages/speaking/coach/[slug].tsx`                | `CoachDetail`       |          |          |       |
| 22  | [ ]  | `/speaking/coach/free`                  | [🔗](http://localhost:3000/speaking/coach/free)                  | [🌐](https://gramorx.com/speaking/coach/free)                  | Speaking     | `pages/speaking/coach/free.tsx`                  | `CoachFree`         |          |          |       |
| 23  | [ ]  | `/speaking/library`                     | [🔗](http://localhost:3000/speaking/library)                     | [🌐](https://gramorx.com/speaking/library)                     | Speaking     | `pages/speaking/library.tsx`                     | `Library`           |          |          |       |
| 24  | [ ]  | `/speaking/live`                        | [🔗](http://localhost:3000/speaking/live)                        | [🌐](https://gramorx.com/speaking/live)                        | Speaking     | `pages/speaking/live/index.tsx`                  | `LiveIndex`         |          |          |       |
| 25  | [ ]  | `/speaking/live/[id]`                   | [🔗](http://localhost:3000/speaking/live/[id])                   | [🌐](https://gramorx.com/speaking/live/[id])                   | Speaking     | `pages/speaking/live/[id].tsx`                   | `LiveSession`       |          |          |       |
| 26  | [ ]  | `/speaking/packs/[slug]`                | [🔗](http://localhost:3000/speaking/packs/[slug])                | [🌐](https://gramorx.com/speaking/packs/[slug])                | Speaking     | `pages/speaking/packs/[slug].tsx`                | `PackDetail`        |          |          |       |
| 27  | [ ]  | `/speaking/partner`                     | [🔗](http://localhost:3000/speaking/partner)                     | [🌐](https://gramorx.com/speaking/partner)                     | Speaking     | `pages/speaking/partner.tsx`                     | `Partner`           |          |          |       |
| 28  | [ ]  | `/speaking/partner/history`             | [🔗](http://localhost:3000/speaking/partner/history)             | [🌐](https://gramorx.com/speaking/partner/history)             | Speaking     | `pages/speaking/partner/history.tsx`             | `PartnerHistory`    |          |          |       |
| 29  | [ ]  | `/speaking/partner/review/[attemptId]`  | [🔗](http://localhost:3000/speaking/partner/review/[attemptId])  | [🌐](https://gramorx.com/speaking/partner/review/[attemptId])  | Speaking     | `pages/speaking/partner/review/[attemptId].tsx`  | `PartnerReview`     |          |          |       |
| 30  | [ ]  | `/speaking/practice`                    | [🔗](http://localhost:3000/speaking/practice)                    | [🌐](https://gramorx.com/speaking/practice)                    | Speaking     | `pages/speaking/practice.tsx`                    | `Practice`          |          |          |       |
| 31  | [ ]  | `/speaking/report`                      | [🔗](http://localhost:3000/speaking/report)                      | [🌐](https://gramorx.com/speaking/report)                      | Speaking     | `pages/speaking/report.tsx`                      | `Report`            |          |          |       |
| 32  | [ ]  | `/speaking/review/[id]`                 | [🔗](http://localhost:3000/speaking/review/[id])                 | [🌐](https://gramorx.com/speaking/review/[id])                 | Speaking     | `pages/speaking/review/[id].tsx`                 | `ReviewDetail`      |          |          |       |
| 33  | [ ]  | `/speaking/roleplay`                    | [🔗](http://localhost:3000/speaking/roleplay)                    | [🌐](https://gramorx.com/speaking/roleplay)                    | Speaking     | `pages/speaking/roleplay/index.tsx`              | `RoleplayIndex`     |          |          |       |
| 34  | [ ]  | `/speaking/roleplay/[scenario]`         | [🔗](http://localhost:3000/speaking/roleplay/[scenario])         | [🌐](https://gramorx.com/speaking/roleplay/[scenario])         | Speaking     | `pages/speaking/roleplay/[scenario].tsx`         | `RoleplayScenario`  |          |          |       |
| 35  | [ ]  | `/speaking/settings`                    | [🔗](http://localhost:3000/speaking/settings)                    | [🌐](https://gramorx.com/speaking/settings)                    | Speaking     | `pages/speaking/settings.tsx`                    | `Settings`          |          |          |       |
| 36  | [ ]  | `/speaking/simulator`                   | [🔗](http://localhost:3000/speaking/simulator)                   | [🌐](https://gramorx.com/speaking/simulator)                   | Speaking     | `pages/speaking/simulator/index.tsx`             | `SimulatorIndex`    |          |          |       |
| 37  | [ ]  | `/speaking/simulator/part1`             | [🔗](http://localhost:3000/speaking/simulator/part1)             | [🌐](https://gramorx.com/speaking/simulator/part1)             | Speaking     | `pages/speaking/simulator/part1.tsx`             | `SimulatorPart1`    |          |          |       |
| 38  | [ ]  | `/speaking/simulator/part2`             | [🔗](http://localhost:3000/speaking/simulator/part2)             | [🌐](https://gramorx.com/speaking/simulator/part2)             | Speaking     | `pages/speaking/simulator/part2.tsx`             | `SimulatorPart2`    |          |          |       |
| 39  | [ ]  | `/speaking/simulator/part3`             | [🔗](http://localhost:3000/speaking/simulator/part3)             | [🌐](https://gramorx.com/speaking/simulator/part3)             | Speaking     | `pages/speaking/simulator/part3.tsx`             | `SimulatorPart3`    |          |          |       |
| 40  | [ ]  | `/vocab`                                | [🔗](http://localhost:3000/vocab)                                | [🌐](https://gramorx.com/vocab)                                | Vocabulary   | `pages/vocab/index.tsx`                          | `VocabHub`          |          |          |       |
| 41  | [ ]  | `/vocabulary`                           | [🔗](http://localhost:3000/vocabulary)                           | [🌐](https://gramorx.com/vocabulary)                           | Vocabulary   | `pages/vocabulary/index.tsx`                     | `VocabularyHub`     |          |          |       |
| 42  | [ ]  | `/vocabulary/[word]`                    | [🔗](http://localhost:3000/vocabulary/[word])                    | [🌐](https://gramorx.com/vocabulary/[word])                    | Vocabulary   | `pages/vocabulary/[word].tsx`                    | `WordDetail`        |          |          |       |
| 43  | [ ]  | `/vocabulary/ai-lab`                    | [🔗](http://localhost:3000/vocabulary/ai-lab)                    | [🌐](https://gramorx.com/vocabulary/ai-lab)                    | Vocabulary   | `pages/vocabulary/ai-lab.tsx`                    | `AiLab`             |          |          | incomplete |
| 44  | [ ]  | `/vocabulary/infiniteapplications`      | [🔗](http://localhost:3000/vocabulary/infiniteapplications)      | [🌐](https://gramorx.com/vocabulary/infiniteapplications)      | Vocabulary   | `pages/vocabulary/infiniteapplications.tsx`      | `InfiniteApps`      |          |          |       |
| 45  | [ ]  | `/vocabulary/learned`                   | [🔗](http://localhost:3000/vocabulary/learned)                   | [🌐](https://gramorx.com/vocabulary/learned)                   | Vocabulary   | `pages/vocabulary/learned.tsx`                   | `Learned`           |          |          |       |
| 46  | [ ]  | `/vocabulary/linking-words`             | [🔗](http://localhost:3000/vocabulary/linking-words)             | [🌐](https://gramorx.com/vocabulary/linking-words)             | Vocabulary   | `pages/vocabulary/linking-words.tsx`             | `LinkingWords`      |          |          |       |
| 47  | [ ]  | `/vocabulary/lists`                     | [🔗](http://localhost:3000/vocabulary/lists)                     | [🌐](https://gramorx.com/vocabulary/lists)                     | Vocabulary   | `pages/vocabulary/lists.tsx`                     | `Lists`             |          |          |       |
| 48  | [ ]  | `/vocabulary/my-words`                  | [🔗](http://localhost:3000/vocabulary/my-words)                  | [🌐](https://gramorx.com/vocabulary/my-words)                  | Vocabulary   | `pages/vocabulary/my-words.tsx`                  | `MyWords`           |          |          |       |
| 49  | [ ]  | `/vocabulary/review`                    | [🔗](http://localhost:3000/vocabulary/review)                    | [🌐](https://gramorx.com/vocabulary/review)                    | Vocabulary   | `pages/vocabulary/review.tsx`                    | `Review`            |          |          |       |
| 50  | [ ]  | `/vocabulary/saved`                     | [🔗](http://localhost:3000/vocabulary/saved)                     | [🌐](https://gramorx.com/vocabulary/saved)                     | Vocabulary   | `pages/vocabulary/saved.tsx`                     | `Saved`             |          |          |       |
| 51  | [ ]  | `/vocabulary/synonyms`                  | [🔗](http://localhost:3000/vocabulary/synonyms)                  | [🌐](https://gramorx.com/vocabulary/synonyms)                  | Vocabulary   | `pages/vocabulary/synonyms.tsx`                  | `Synonyms`          |          |          |       |
| 52  | [ ]  | `/vocabulary/quizzes`                   | [🔗](http://localhost:3000/vocabulary/quizzes)                   | [🌐](https://gramorx.com/vocabulary/quizzes)                   | Vocabulary   | `pages/vocabulary/quizzes/index.tsx`             | `QuizzesIndex`      |          |          |       |
| 53  | [ ]  | `/vocabulary/quizzes/today`             | [🔗](http://localhost:3000/vocabulary/quizzes/today)             | [🌐](https://gramorx.com/vocabulary/quizzes/today)             | Vocabulary   | `pages/vocabulary/quizzes/today.tsx`             | `QuizToday`         |          |          |       |
| 54  | [ ]  | `/vocabulary/speaking`                  | [🔗](http://localhost:3000/vocabulary/speaking)                  | [🌐](https://gramorx.com/vocabulary/speaking)                  | Vocabulary   | `pages/vocabulary/speaking/index.tsx`            | `SpeakingIndex`     |          |          |       |
| 55  | [ ]  | `/vocabulary/speaking/[topic]`          | [🔗](http://localhost:3000/vocabulary/speaking/[topic])          | [🌐](https://gramorx.com/vocabulary/speaking/[topic])          | Vocabulary   | `pages/vocabulary/speaking/[topic].tsx`          | `SpeakingTopic`     |          |          |       |
| 56  | [ ]  | `/vocabulary/topics`                    | [🔗](http://localhost:3000/vocabulary/topics)                    | [🌐](https://gramorx.com/vocabulary/topics)                    | Vocabulary   | `pages/vocabulary/topics/index.tsx`              | `TopicsIndex`       |          |          |       |
| 57  | [ ]  | `/vocabulary/topics/[topic]`            | [🔗](http://localhost:3000/vocabulary/topics/[topic])            | [🌐](https://gramorx.com/vocabulary/topics/[topic])            | Vocabulary   | `pages/vocabulary/topics/[topic].tsx`            | `TopicDetail`       |          |          |       |
| 58  | [ ]  | `/word-of-the-day`                      | [🔗](http://localhost:3000/word-of-the-day)                      | [🌐](https://gramorx.com/word-of-the-day)                      | Vocabulary   | `pages/word-of-the-day.tsx`                      | `WordOfDay`         |          |          |       |
| 59  | [ ]  | `/ai`                                   | [🔗](http://localhost:3000/ai)                                   | [🌐](https://gramorx.com/ai)                                   | AI           | `pages/ai/index.tsx`                             | `AiHub`             |          |          |       |
| 60  | [ ]  | `/ai/coach`                             | [🔗](http://localhost:3000/ai/coach)                             | [🌐](https://gramorx.com/ai/coach)                             | AI           | `pages/ai/coach/index.tsx`                       | `CoachIndex`        |          |          | incomplete |
| 61  | [ ]  | `/ai/mistakes-book`                     | [🔗](http://localhost:3000/ai/mistakes-book)                     | [🌐](https://gramorx.com/ai/mistakes-book)                     | AI           | `pages/ai/mistakes-book/index.tsx`               | `MistakesBook`      |          |          |       |
| 62  | [ ]  | `/ai/study-buddy`                       | [🔗](http://localhost:3000/ai/study-buddy)                       | [🌐](https://gramorx.com/ai/study-buddy)                       | AI           | `pages/ai/study-buddy/index.tsx`                 | `StudyBuddy`        |          |          |       |
| 63  | [ ]  | `/ai/study-buddy/session/[id]/practice` | [🔗](http://localhost:3000/ai/study-buddy/session/[id]/practice) | [🌐](https://gramorx.com/ai/study-buddy/session/[id]/practice) | AI           | `pages/ai/study-buddy/session/[id]/practice.tsx` | `SessionPractice`   |          |          |       |
| 64  | [ ]  | `/ai/study-buddy/session/[id]/summary`  | [🔗](http://localhost:3000/ai/study-buddy/session/[id]/summary)  | [🌐](https://gramorx.com/ai/study-buddy/session/[id]/summary)  | AI           | `pages/ai/study-buddy/session/[id]/summary.tsx`  | `SessionSummary`    |          |          |       |
| 65  | [ ]  | `/ai/writing/[id]`                      | [🔗](http://localhost:3000/ai/writing/[id])                      | [🌐](https://gramorx.com/ai/writing/[id])                      | AI           | `pages/ai/writing/[id].tsx`                      | `WritingAnalysis`   |          |          |       |
| 66  | [ ]  | `/coach`                                | [🔗](http://localhost:3000/coach)                                | [🌐](https://gramorx.com/coach)                                | Coach        | `pages/coach/index.tsx`                          | `CoachHub`          |          |          |       |
| 67  | [ ]  | `/coach/[id]`                           | [🔗](http://localhost:3000/coach/[id])                           | [🌐](https://gramorx.com/coach/[id])                           | Coach        | `pages/coach/[id].tsx`                           | `CoachDetail`       |          |          |       |
| 68  | [ ]  | `/predictor`                            | [🔗](http://localhost:3000/predictor)                            | [🌐](https://gramorx.com/predictor)                            | Predictor    | `pages/predictor/index.tsx`                      | `PredictorHub`      |          |          |       |
| 69  | [ ]  | `/labs/ai-tutor`                        | [🔗](http://localhost:3000/labs/ai-tutor)                        | [🌐](https://gramorx.com/labs/ai-tutor)                        | AI           | `pages/labs/ai-tutor.tsx`                        | `AiTutor`           |          |          |       |
| 70  | [ ]  | `/mistakes`                             | [🔗](http://localhost:3000/mistakes)                             | [🌐](https://gramorx.com/mistakes)                             | Mistakes     | `pages/mistakes/index.tsx`                       | `MistakesHub`       |          |          |       |
| 71  | [ ]  | `/quick`                                | [🔗](http://localhost:3000/quick)                                | [🌐](https://gramorx.com/quick)                                | Quick        | `pages/quick/index.tsx`                          | `QuickHub`          |          |          |       |
| 72  | [ ]  | `/quick/[skill]`                        | [🔗](http://localhost:3000/quick/[skill])                        | [🌐](https://gramorx.com/quick/[skill])                        | Quick        | `pages/quick/[skill].tsx`                        | `SkillQuick`        |          |          |       |
| 73  | [ ]  | `/practice`                             | [🔗](http://localhost:3000/practice)                             | [🌐](https://gramorx.com/practice)                             | Practice     | `pages/practice/index.tsx`                       | `PracticeHub`       |          |          |       |
| 74  | [ ]  | `/practice/writing`                     | [🔗](http://localhost:3000/practice/writing)                     | [🌐](https://gramorx.com/practice/writing)                     | Practice     | `pages/practice/writing.tsx`                     | `WritingPractice`   |          |          |       |
| 75  | [ ]  | `/practice/speaking`                    | [🔗](http://localhost:3000/practice/speaking)                    | [🌐](https://gramorx.com/practice/speaking)                    | Practice     | `pages/practice/speaking.tsx`                    | `SpeakingPractice`  |          |          |       |
| 76  | [ ]  | `/practice/reading`                     | [🔗](http://localhost:3000/practice/reading)                     | [🌐](https://gramorx.com/practice/reading)                     | Practice     | `pages/practice/reading.tsx`                     | `ReadingPractice`   |          |          |       |
| 77  | [ ]  | `/practice/listening`                   | [🔗](http://localhost:3000/practice/listening)                   | [🌐](https://gramorx.com/practice/listening)                   | Practice     | `pages/practice/listening.tsx`                   | `ListeningPractice` |          |          |       |
| 78  | [ ]  | `/practice/listening/daily`             | [🔗](http://localhost:3000/practice/listening/daily)             | [🌐](https://gramorx.com/practice/listening/daily)             | Practice     | `pages/practice/listening/daily.tsx`             | `ListeningDaily`    |          |          |       |
| 79  | [ ]  | `/score`                                | [🔗](http://localhost:3000/score)                                | [🌐](https://gramorx.com/score)                                | Score        | `pages/score/index.tsx`                          | `ScoreHub`          |          |          |       |
| 80  | [ ]  | `/cert/[id]`                            | [🔗](http://localhost:3000/cert/[id])                            | [🌐](https://gramorx.com/cert/[id])                            | Certificate  | `pages/cert/[id].tsx`                            | `CertificateDetail` |          |          |       |
| 81  | [ ]  | `/cert/writing/[attemptId]`             | [🔗](http://localhost:3000/cert/writing/[attemptId])             | [🌐](https://gramorx.com/cert/writing/[attemptId])             | Certificate  | `pages/cert/writing/[attemptId].tsx`             | `WritingCert`       |          |          |       |
| 82  | [ ]  | `/challenge`                            | [🔗](http://localhost:3000/challenge)                            | [🌐](https://gramorx.com/challenge)                            | Challenges   | `pages/challenge/index.tsx`                      | `ChallengeHub`      |          |          |       |
| 83  | [ ]  | `/challenge/[cohort]`                   | [🔗](http://localhost:3000/challenge/[cohort])                   | [🌐](https://gramorx.com/challenge/[cohort])                   | Challenges   | `pages/challenge/[cohort].tsx`                   | `CohortDetail`      |          |          |       |
| 84  | [ ]  | `/leaderboard`                          | [🔗](http://localhost:3000/leaderboard)                          | [🌐](https://gramorx.com/leaderboard)                          | Gamification | `pages/leaderboard/index.tsx`                    | `Leaderboard`       |          |          |       |
| 85  | [ ]  | `/whatsapp-tasks`                       | [🔗](http://localhost:3000/whatsapp-tasks)                       | [🌐](https://gramorx.com/whatsapp-tasks)                       | WhatsApp     | `pages/whatsapp-tasks.tsx`                       | `Tasks`             |          |          |       |

</details>

<details>
<summary><strong>👨‍💼 AdminLayout</strong> – 27 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                             | Local                                                      | Live                                                     | Module       | File                                       | Components              | Reviewer | Priority | Notes |
| --- | ---- | --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------ | ------------------------------------------ | ----------------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/admin`                          | [🔗](http://localhost:3000/admin)                          | [🌐](https://gramorx.com/admin)                          | Admin        | `pages/admin/index.tsx`                    | `AdminHub`              |          |          |       |
| 2   | [ ]  | `/admin/imp-as`                   | [🔗](http://localhost:3000/admin/imp-as)                   | [🌐](https://gramorx.com/admin/imp-as)                   | Admin        | `pages/admin/imp-as.tsx`                   | `Impersonate`           |          |          |       |
| 3   | [ ]  | `/admin/stop-impersonation`       | [🔗](http://localhost:3000/admin/stop-impersonation)       | [🌐](https://gramorx.com/admin/stop-impersonation)       | Admin        | `pages/admin/stop-impersonation.tsx`       | `StopImpersonation`     |          |          |       |
| 4   | [ ]  | `/admin/users`                    | [🔗](http://localhost:3000/admin/users)                    | [🌐](https://gramorx.com/admin/users)                    | Admin        | `pages/admin/users.tsx`                    | `Users`                 |          |          |       |
| 5   | [ ]  | `/admin/partners`                 | [🔗](http://localhost:3000/admin/partners)                 | [🌐](https://gramorx.com/admin/partners)                 | Admin        | `pages/admin/partners/index.tsx`           | `Partners`              |          |          |       |
| 6   | [ ]  | `/admin/premium/pin`              | [🔗](http://localhost:3000/admin/premium/pin)              | [🌐](https://gramorx.com/admin/premium/pin)              | Admin        | `pages/admin/premium/pin.tsx`              | `PinManagement`         |          |          |       |
| 7   | [ ]  | `/admin/premium/promo-codes`      | [🔗](http://localhost:3000/admin/premium/promo-codes)      | [🌐](https://gramorx.com/admin/premium/promo-codes)      | Admin        | `pages/admin/premium/promo-codes.tsx`      | `PromoCodes`            |          |          |       |
| 8   | [ ]  | `/admin/premium/promo-usage`      | [🔗](http://localhost:3000/admin/premium/promo-usage)      | [🌐](https://gramorx.com/admin/premium/promo-usage)      | Admin        | `pages/admin/premium/promo-usage.tsx`      | `PromoUsage`            |          |          |       |
| 9   | [ ]  | `/admin/reports/writing-activity` | [🔗](http://localhost:3000/admin/reports/writing-activity) | [🌐](https://gramorx.com/admin/reports/writing-activity) | Admin        | `pages/admin/reports/writing-activity.tsx` | `WritingActivityReport` |          |          |       |
| 10  | [ ]  | `/admin/reviews`                  | [🔗](http://localhost:3000/admin/reviews)                  | [🌐](https://gramorx.com/admin/reviews)                  | Admin        | `pages/admin/reviews/index.tsx`            | `ReviewsIndex`          |          |          |       |
| 11  | [ ]  | `/admin/reviews/[attemptId]`      | [🔗](http://localhost:3000/admin/reviews/[attemptId])      | [🌐](https://gramorx.com/admin/reviews/[attemptId])      | Admin        | `pages/admin/reviews/[attemptId].tsx`      | `ReviewDetail`          |          |          |       |
| 12  | [ ]  | `/admin/students`                 | [🔗](http://localhost:3000/admin/students)                 | [🌐](https://gramorx.com/admin/students)                 | Admin        | `pages/admin/students/index.tsx`           | `Students`              |          |          |       |
| 13  | [ ]  | `/admin/teacher`                  | [🔗](http://localhost:3000/admin/teacher)                  | [🌐](https://gramorx.com/admin/teacher)                  | Admin        | `pages/admin/teacher/index.tsx`            | `TeacherAdmin`          |          |          |       |
| 14  | [ ]  | `/admin/teachers`                 | [🔗](http://localhost:3000/admin/teachers)                 | [🌐](https://gramorx.com/admin/teachers)                 | Admin        | `pages/admin/teachers/index.tsx`           | `Teachers`              |          |          |       |
| 15  | [ ]  | `/admin/vocabulary/new-sense`     | [🔗](http://localhost:3000/admin/vocabulary/new-sense)     | [🌐](https://gramorx.com/admin/vocabulary/new-sense)     | Admin        | `pages/admin/vocabulary/new-sense.tsx`     | `NewSense`              |          |          |       |
| 16  | [ ]  | `/admin/content/reading`          | [🔗](http://localhost:3000/admin/content/reading)          | [🌐](https://gramorx.com/admin/content/reading)          | Admin        | `pages/admin/content/reading.tsx`          | `ContentReading`        |          |          |       |
| 17  | [ ]  | `/admin/listening`                | [🔗](http://localhost:3000/admin/listening)                | [🌐](https://gramorx.com/admin/listening)                | Admin        | `pages/admin/listening.tsx`                | `ListeningAdmin`        |          |          |       |
| 18  | [ ]  | `/admin/listening/articles`       | [🔗](http://localhost:3000/admin/listening/articles)       | [🌐](https://gramorx.com/admin/listening/articles)       | Admin        | `pages/admin/listening/articles.tsx`       | `ListeningArticles`     |          |          |       |
| 19  | [ ]  | `/admin/listening/media`          | [🔗](http://localhost:3000/admin/listening/media)          | [🌐](https://gramorx.com/admin/listening/media)          | Admin        | `pages/admin/listening/media.tsx`          | `ListeningMedia`        |          |          |       |
| 20  | [ ]  | `/admin/reading`                  | [🔗](http://localhost:3000/admin/reading)                  | [🌐](https://gramorx.com/admin/reading)                  | Admin        | `pages/admin/reading.tsx`                  | `ReadingAdmin`          |          |          |       |
| 21  | [ ]  | `/admin/speaking`                 | [🔗](http://localhost:3000/admin/speaking)                 | [🌐](https://gramorx.com/admin/speaking)                 | Admin        | `pages/admin/speaking/index.tsx`           | `SpeakingAdmin`         |          |          |       |
| 22  | [ ]  | `/admin/speaking/attempts`        | [🔗](http://localhost:3000/admin/speaking/attempts)        | [🌐](https://gramorx.com/admin/speaking/attempts)        | Admin        | `pages/admin/speaking/attempts.tsx`        | `SpeakingAttempts`      |          |          |       |
| 23  | [ ]  | `/admin/writing`                  | [🔗](http://localhost:3000/admin/writing)                  | [🌐](https://gramorx.com/admin/writing)                  | Admin        | `pages/admin/writing/index.tsx`            | `WritingAdmin`          |          |          |       |
| 24  | [ ]  | `/admin/writing/topics`           | [🔗](http://localhost:3000/admin/writing/topics)           | [🌐](https://gramorx.com/admin/writing/topics)           | Admin        | `pages/admin/writing/topics.tsx`           | `WritingTopics`         |          |          |       |
| 25  | [ ]  | `/content/studio`                 | [🔗](http://localhost:3000/content/studio)                 | [🌐](https://gramorx.com/content/studio)                 | Admin        | `pages/content/studio/index.tsx`           | `StudioHub`             |          |          |       |
| 26  | [ ]  | `/content/studio/[id]`            | [🔗](http://localhost:3000/content/studio/[id])            | [🌐](https://gramorx.com/content/studio/[id])            | Admin        | `pages/content/studio/[id].tsx`            | `StudioDetail`          |          |          |       |
| 27  | [ ]  | `/orgs`                           | [🔗](http://localhost:3000/orgs)                           | [🌐](https://gramorx.com/orgs)                           | Institutions | `pages/orgs/index.tsx`                     | `OrgsHub`               |          |          |       |

</details>

<details>
<summary><strong>👨‍🏫 TeacherLayout</strong> – 8 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                        | Local                                                 | Live                                                | Module  | File                                  | Components          | Reviewer | Priority | Notes |
| --- | ---- | ---------------------------- | ----------------------------------------------------- | --------------------------------------------------- | ------- | ------------------------------------- | ------------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/teacher`                   | [🔗](http://localhost:3000/teacher)                   | [🌐](https://gramorx.com/teacher)                   | Teacher | `pages/teacher/index.tsx`             | `TeacherHub`        |          |          |       |
| 2   | [ ]  | `/teacher/Welcome`           | [🔗](http://localhost:3000/teacher/Welcome)           | [🌐](https://gramorx.com/teacher/Welcome)           | Teacher | `pages/teacher/Welcome.tsx`           | `Welcome`           |          |          |       |
| 3   | [ ]  | `/teacher/onboarding`        | [🔗](http://localhost:3000/teacher/onboarding)        | [🌐](https://gramorx.com/teacher/onboarding)        | Teacher | `pages/teacher/onboarding.tsx`        | `Onboarding`        |          |          |       |
| 4   | [ ]  | `/teacher/pending`           | [🔗](http://localhost:3000/teacher/pending)           | [🌐](https://gramorx.com/teacher/pending)           | Teacher | `pages/teacher/pending.tsx`           | `Pending`           |          |          |       |
| 5   | [ ]  | `/teacher/register`          | [🔗](http://localhost:3000/teacher/register)          | [🌐](https://gramorx.com/teacher/register)          | Teacher | `pages/teacher/register.tsx`          | `Register`          |          |          |       |
| 6   | [ ]  | `/teacher/cohorts/[id]`      | [🔗](http://localhost:3000/teacher/cohorts/[id])      | [🌐](https://gramorx.com/teacher/cohorts/[id])      | Teacher | `pages/teacher/cohorts/[id].tsx`      | `CohortDetail`      |          |          |       |
| 7   | [ ]  | `/onboarding/teacher`        | [🔗](http://localhost:3000/onboarding/teacher)        | [🌐](https://gramorx.com/onboarding/teacher)        | Teacher | `pages/onboarding/teacher/index.tsx`  | `OnboardingTeacher` |          |          |       |
| 8   | [ ]  | `/onboarding/teacher/status` | [🔗](http://localhost:3000/onboarding/teacher/status) | [🌐](https://gramorx.com/onboarding/teacher/status) | Teacher | `pages/onboarding/teacher/status.tsx` | `OnboardingStatus`  |          |          |       |

</details>

<details>
<summary><strong>🏛️ InstitutionsLayout</strong> – 4 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                            | Local                                                     | Live                                                    | Module       | File                                      | Components        | Reviewer | Priority | Notes |
| --- | ---- | -------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- | ------------ | ----------------------------------------- | ----------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/institutions`                  | [🔗](http://localhost:3000/institutions)                  | [🌐](https://gramorx.com/institutions)                  | Institutions | `pages/institutions/index.tsx`            | `InstitutionsHub` |          |          |       |
| 2   | [ ]  | `/institutions/[orgId]`          | [🔗](http://localhost:3000/institutions/[orgId])          | [🌐](https://gramorx.com/institutions/[orgId])          | Institutions | `pages/institutions/[orgId]/index.tsx`    | `OrgDetail`       |          |          |       |
| 3   | [ ]  | `/institutions/[orgId]/reports`  | [🔗](http://localhost:3000/institutions/[orgId]/reports)  | [🌐](https://gramorx.com/institutions/[orgId]/reports)  | Institutions | `pages/institutions/[orgId]/reports.tsx`  | `OrgReports`      |          |          |       |
| 4   | [ ]  | `/institutions/[orgId]/students` | [🔗](http://localhost:3000/institutions/[orgId]/students) | [🌐](https://gramorx.com/institutions/[orgId]/students) | Institutions | `pages/institutions/[orgId]/students.tsx` | `OrgStudents`     |          |          |       |

</details>

<details>
<summary><strong>🛒 MarketplaceLayout</strong> – 1 page – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route          | Local                                   | Live                                  | Module      | File                          | Components       | Reviewer | Priority | Notes |
| --- | ---- | -------------- | --------------------------------------- | ------------------------------------- | ----------- | ----------------------------- | ---------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/marketplace` | [🔗](http://localhost:3000/marketplace) | [🌐](https://gramorx.com/marketplace) | Marketplace | `pages/marketplace/index.tsx` | `MarketplaceHub` |          |          |       |

</details>

<details>
<summary><strong>📘 LearningLayout</strong> – 9 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                             | Local                                                      | Live                                                     | Module   | File                                       | Components        | Reviewer | Priority | Notes |
| --- | ---- | --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------ | ----------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/learning`                       | [🔗](http://localhost:3000/learning)                       | [🌐](https://gramorx.com/learning)                       | Learning | `pages/learning/index.tsx`                 | `LearningHub`     |          |          |       |
| 2   | [ ]  | `/learning/[slug]`                | [🔗](http://localhost:3000/learning/[slug])                | [🌐](https://gramorx.com/learning/[slug])                | Learning | `pages/learning/[slug].tsx`                | `LessonDetail`    |          |          |       |
| 3   | [ ]  | `/learning/drills`                | [🔗](http://localhost:3000/learning/drills)                | [🌐](https://gramorx.com/learning/drills)                | Learning | `pages/learning/drills.tsx`                | `Drills`          |          |          |       |
| 4   | [ ]  | `/learning/strategies`            | [🔗](http://localhost:3000/learning/strategies)            | [🌐](https://gramorx.com/learning/strategies)            | Learning | `pages/learning/strategies/index.tsx`      | `StrategiesIndex` |          |          |       |
| 5   | [ ]  | `/learning/strategies/[tipSlug]`  | [🔗](http://localhost:3000/learning/strategies/[tipSlug])  | [🌐](https://gramorx.com/learning/strategies/[tipSlug])  | Learning | `pages/learning/strategies/[tipSlug].tsx`  | `TipDetail`       |          |          |       |
| 6   | [ ]  | `/learning/skills`                | [🔗](http://localhost:3000/learning/skills)                | [🌐](https://gramorx.com/learning/skills)                | Learning | `pages/learning/skills/index.tsx`          | `SkillsIndex`     |          |          |       |
| 7   | [ ]  | `/learning/skills/[skill]`        | [🔗](http://localhost:3000/learning/skills/[skill])        | [🌐](https://gramorx.com/learning/skills/[skill])        | Learning | `pages/learning/skills/[skill].tsx`        | `SkillDetail`     |          |          |       |
| 8   | [ ]  | `/learning/skills/lessons`        | [🔗](http://localhost:3000/learning/skills/lessons)        | [🌐](https://gramorx.com/learning/skills/lessons)        | Learning | `pages/learning/skills/lessons/index.tsx`  | `LessonsIndex`    |          |          |       |
| 9   | [ ]  | `/learning/skills/lessons/[slug]` | [🔗](http://localhost:3000/learning/skills/lessons/[slug]) | [🌐](https://gramorx.com/learning/skills/lessons/[slug]) | Learning | `pages/learning/skills/lessons/[slug].tsx` | `LessonPlayer`    |          |          |       |

</details>

<details>
<summary><strong>👥 CommunityLayout</strong> – 3 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                  | Local                                           | Live                                          | Module    | File                               | Components     | Reviewer | Priority | Notes |
| --- | ---- | ---------------------- | ----------------------------------------------- | --------------------------------------------- | --------- | ---------------------------------- | -------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/community`           | [🔗](http://localhost:3000/community)           | [🌐](https://gramorx.com/community)           | Community | `pages/community/index.tsx`        | `CommunityHub` |          |          |       |
| 2   | [ ]  | `/community/questions` | [🔗](http://localhost:3000/community/questions) | [🌐](https://gramorx.com/community/questions) | Community | `pages/community/questions.tsx`    | `Questions`    |          |          |       |
| 3   | [ ]  | `/community/review`    | [🔗](http://localhost:3000/community/review)    | [🌐](https://gramorx.com/community/review)    | Community | `pages/community/review/index.tsx` | `ReviewIndex`  |          |          |       |

</details>

<details>
<summary><strong>📈 ReportsLayout</strong> – 1 page – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                     | Local                                              | Live                                             | Module  | File                               | Components      | Reviewer | Priority | Notes |
| --- | ---- | ------------------------- | -------------------------------------------------- | ------------------------------------------------ | ------- | ---------------------------------- | --------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/reports/band-analytics` | [🔗](http://localhost:3000/reports/band-analytics) | [🌐](https://gramorx.com/reports/band-analytics) | Reports | `pages/reports/band-analytics.tsx` | `BandAnalytics` |          |          |       |

</details>

<details>
<summary><strong>👤 ProfileLayout</strong> – 15 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                      | Local                                               | Live                                              | Module       | File                                     | Components              | Reviewer | Priority | Notes |
| --- | ---- | -------------------------- | --------------------------------------------------- | ------------------------------------------------- | ------------ | ---------------------------------------- | ----------------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/profile`                 | [🔗](http://localhost:3000/profile)                 | [🌐](https://gramorx.com/profile)                 | Profile      | `pages/profile/index.tsx`                | `ProfileHub`            |          |          |       |
| 2   | [ ]  | `/profile/streak`          | [🔗](http://localhost:3000/profile/streak)          | [🌐](https://gramorx.com/profile/streak)          | Gamification | `pages/profile/streak.tsx`               | `Streak`                |          |          |       |
| 3   | [ ]  | `/profile/setup`           | [🔗](http://localhost:3000/profile/setup)           | [🌐](https://gramorx.com/profile/setup)           | Profile      | `pages/profile/setup/index.tsx`          | `Setup`                 |          |          |       |
| 4   | [ ]  | `/account`                 | [🔗](http://localhost:3000/account)                 | [🌐](https://gramorx.com/account)                 | Account      | `pages/account/index.tsx`                | `AccountHub`            |          |          |       |
| 5   | [ ]  | `/account/activity`        | [🔗](http://localhost:3000/account/activity)        | [🌐](https://gramorx.com/account/activity)        | Account      | `pages/account/activity.tsx`             | `Activity`              |          |          |       |
| 6   | [ ]  | `/account/billing`         | [🔗](http://localhost:3000/account/billing)         | [🌐](https://gramorx.com/account/billing)         | Account      | `pages/account/billing.tsx`              | `Billing`               |          |          |       |
| 7   | [ ]  | `/account/billing-history` | [🔗](http://localhost:3000/account/billing-history) | [🌐](https://gramorx.com/account/billing-history) | Account      | `pages/account/billing-history.tsx`      | `BillingHistory`        |          |          |       |
| 8   | [ ]  | `/account/redeem`          | [🔗](http://localhost:3000/account/redeem)          | [🌐](https://gramorx.com/account/redeem)          | Account      | `pages/account/redeem.tsx`               | `Redeem`                |          |          |       |
| 9   | [ ]  | `/account/subscription`    | [🔗](http://localhost:3000/account/subscription)    | [🌐](https://gramorx.com/account/subscription)    | Account      | `pages/account/subscription.tsx`         | `Subscription`          |          |          |       |
| 10  | [ ]  | `/settings`                | [🔗](http://localhost:3000/settings)                | [🌐](https://gramorx.com/settings)                | Settings     | `pages/settings/index.tsx`               | `SettingsHub`           |          |          |       |
| 11  | [ ]  | `/settings/security`       | [🔗](http://localhost:3000/settings/security)       | [🌐](https://gramorx.com/settings/security)       | Settings     | `pages/settings/security.tsx`            | `SecuritySettings`      |          |          |       |
| 12  | [ ]  | `/settings/notifications`  | [🔗](http://localhost:3000/settings/notifications)  | [🌐](https://gramorx.com/settings/notifications)  | Settings     | `pages/settings/notifications/index.tsx` | `NotificationSettings`  |          |          |       |
| 13  | [ ]  | `/settings/language`       | [🔗](http://localhost:3000/settings/language)       | [🌐](https://gramorx.com/settings/language)       | Settings     | `pages/settings/language.tsx`            | `LanguageSettings`      |          |          |       |
| 14  | [ ]  | `/settings/accessibility`  | [🔗](http://localhost:3000/settings/accessibility)  | [🌐](https://gramorx.com/settings/accessibility)  | Settings     | `pages/settings/accessibility.tsx`       | `AccessibilitySettings` |          |          |       |
| 15  | [ ]  | `/saved`                   | [🔗](http://localhost:3000/saved)                   | [🌐](https://gramorx.com/saved)                   | Saved        | `pages/saved/index.tsx`                  | `SavedHub`              |          |          |       |

</details>

<details>
<summary><strong>🖥️ ProctoringLayout</strong> – 2 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                   | Local                                            | Live                                           | Module     | File                             | Components    | Reviewer | Priority | Notes |
| --- | ---- | ----------------------- | ------------------------------------------------ | ---------------------------------------------- | ---------- | -------------------------------- | ------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/proctoring/check`     | [🔗](http://localhost:3000/proctoring/check)     | [🌐](https://gramorx.com/proctoring/check)     | Proctoring | `pages/proctoring/check.tsx`     | `Check`       |          |          |       |
| 2   | [ ]  | `/proctoring/exam/[id]` | [🔗](http://localhost:3000/proctoring/exam/[id]) | [🌐](https://gramorx.com/proctoring/exam/[id]) | Proctoring | `pages/proctoring/exam/[id].tsx` | `ExamSession` |          |          |       |

</details>

<details>
<summary><strong>📊 AnalyticsLayout</strong> – 7 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                             | Local                                                      | Live                                                     | Module       | File                                       | Components            | Reviewer | Priority | Notes |
| --- | ---- | --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------ | ------------------------------------------ | --------------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/dashboard/ai-reports`           | [🔗](http://localhost:3000/dashboard/ai-reports)           | [🌐](https://gramorx.com/dashboard/ai-reports)           | Dashboard    | `pages/dashboard/ai-reports.tsx`           | `AiReports`           |          |          |       |
| 2   | [ ]  | `/predictor/result`               | [🔗](http://localhost:3000/predictor/result)               | [🌐](https://gramorx.com/predictor/result)               | Predictor    | `pages/predictor/result.tsx`               | `Result`              |          |          |       |
| 3   | [ ]  | `/analytics/listening`            | [🔗](http://localhost:3000/analytics/listening)            | [🌐](https://gramorx.com/analytics/listening)            | Listening    | `pages/analytics/listening.tsx`            | `ListeningAnalytics`  |          |          |       |
| 4   | [ ]  | `/analytics/listening/trajectory` | [🔗](http://localhost:3000/analytics/listening/trajectory) | [🌐](https://gramorx.com/analytics/listening/trajectory) | Listening    | `pages/analytics/listening/trajectory.tsx` | `ListeningTrajectory` |          |          |       |
| 5   | [ ]  | `/analytics/writing`              | [🔗](http://localhost:3000/analytics/writing)              | [🌐](https://gramorx.com/analytics/writing)              | Writing      | `pages/analytics/writing.tsx`              | `WritingAnalytics`    |          |          |       |
| 6   | [ ]  | `/mock/analytics`                 | [🔗](http://localhost:3000/mock/analytics)                 | [🌐](https://gramorx.com/mock/analytics)                 | Mock         | `pages/mock/analytics.tsx`                 | `Analytics`           |          |          |       |
| 7   | [ ]  | `/mock/reading/analytics`         | [🔗](http://localhost:3000/mock/reading/analytics)         | [🌐](https://gramorx.com/mock/reading/analytics)         | Mock Reading | `pages/mock/reading/analytics.tsx`         | `ReadingAnalytics`    |          |          |       |

</details>

<details>
<summary><strong>💳 BillingLayout</strong> – 8 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                 | Local                                          | Live                                         | Module    | File                           | Components        | Reviewer | Priority | Notes |
| --- | ---- | --------------------- | ---------------------------------------------- | -------------------------------------------- | --------- | ------------------------------ | ----------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/dashboard/billing`  | [🔗](http://localhost:3000/dashboard/billing)  | [🌐](https://gramorx.com/dashboard/billing)  | Dashboard | `pages/dashboard/billing.tsx`  | `Billing`         |          |          |       |
| 2   | [ ]  | `/settings/billing`   | [🔗](http://localhost:3000/settings/billing)   | [🌐](https://gramorx.com/settings/billing)   | Settings  | `pages/settings/billing.tsx`   | `BillingSettings` |          |          |       |
| 3   | [ ]  | `/premium/pin`        | [🔗](http://localhost:3000/premium/pin)        | [🌐](https://gramorx.com/premium/pin)        | Premium   | `pages/premium/pin.tsx`        | `Pin`             |          |          |       |
| 4   | [ ]  | `/checkout/success`   | [🔗](http://localhost:3000/checkout/success)   | [🌐](https://gramorx.com/checkout/success)   | Checkout  | `pages/checkout/success.tsx`   | `Success`         |          |          |       |
| 5   | [ ]  | `/checkout/save-card` | [🔗](http://localhost:3000/checkout/save-card) | [🌐](https://gramorx.com/checkout/save-card) | Checkout  | `pages/checkout/save-card.tsx` | `SaveCard`        |          |          |       |
| 6   | [ ]  | `/checkout/crypto`    | [🔗](http://localhost:3000/checkout/crypto)    | [🌐](https://gramorx.com/checkout/crypto)    | Checkout  | `pages/checkout/crypto.tsx`    | `Crypto`          |          |          |       |
| 7   | [ ]  | `/checkout/cancel`    | [🔗](http://localhost:3000/checkout/cancel)    | [🌐](https://gramorx.com/checkout/cancel)    | Checkout  | `pages/checkout/cancel.tsx`    | `Cancel`          |          |          |       |
| 8   | [ ]  | `/checkout/confirm`   | [🔗](http://localhost:3000/checkout/confirm)   | [🌐](https://gramorx.com/checkout/confirm)   | Checkout  | `pages/checkout/confirm.tsx`   | `Confirm`         |          |          |       |

</details>

<details>
<summary><strong>💬 CommunicationLayout</strong> – 2 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route             | Local                                      | Live                                     | Module        | File                            | Components         | Reviewer | Priority | Notes |
| --- | ---- | ----------------- | ------------------------------------------ | ---------------------------------------- | ------------- | ------------------------------- | ------------------ | -------- | -------- | ----- |
| 1   | [ ]  | `/notifications`  | [🔗](http://localhost:3000/notifications)  | [🌐](https://gramorx.com/notifications)  | Notifications | `pages/notifications/index.tsx` | `NotificationsHub` |          |          |       |
| 2   | [ ]  | `/community/chat` | [🔗](http://localhost:3000/community/chat) | [🌐](https://gramorx.com/community/chat) | Community     | `pages/community/chat.tsx`      | `Chat`             |          |          |       |

</details>

<details>
<summary><strong>📝 ExamLayout</strong> – 36 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                                | Local                                                         | Live                                                        | Module         | File                                          | Components               | Reviewer | Priority | Notes |
| --- | ---- | ------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- | -------------- | --------------------------------------------- | ------------------------ | -------- | -------- | ----- |
| 1   | [ ]  | `/mock/[section]`                    | [🔗](http://localhost:3000/mock/[section])                    | [🌐](https://gramorx.com/mock/[section])                    | Mock           | `pages/mock/[section].tsx`                    | `SectionMock`            |          |          |       |
| 2   | [ ]  | `/mock/dashboard`                    | [🔗](http://localhost:3000/mock/dashboard)                    | [🌐](https://gramorx.com/mock/dashboard)                    | Mock           | `pages/mock/dashboard.tsx`                    | `Dashboard`              |          |          |       |
| 3   | [ ]  | `/mock/resume`                       | [🔗](http://localhost:3000/mock/resume)                       | [🌐](https://gramorx.com/mock/resume)                       | Mock           | `pages/mock/resume.tsx`                       | `Resume`                 |          |          |       |
| 4   | [ ]  | `/mock/full`                         | [🔗](http://localhost:3000/mock/full)                         | [🌐](https://gramorx.com/mock/full)                         | Mock           | `pages/mock/full/index.tsx`                   | `FullMock`               |          |          |       |
| 5   | [ ]  | `/mock/listening`                    | [🔗](http://localhost:3000/mock/listening)                    | [🌐](https://gramorx.com/mock/listening)                    | Mock Listening | `pages/mock/listening/index.tsx`              | `ListeningMock`          |          |          |       |
| 6   | [ ]  | `/mock/listening/[slug]`             | [🔗](http://localhost:3000/mock/listening/[slug])             | [🌐](https://gramorx.com/mock/listening/[slug])             | Mock Listening | `pages/mock/listening/[slug].tsx`             | `ListeningDetailMock`    |          |          |       |
| 7   | [ ]  | `/mock/listening/result`             | [🔗](http://localhost:3000/mock/listening/result)             | [🌐](https://gramorx.com/mock/listening/result)             | Mock Listening | `pages/mock/listening/result.tsx`             | `ListeningResult`        |          |          |       |
| 8   | [ ]  | `/mock/listening/review`             | [🔗](http://localhost:3000/mock/listening/review)             | [🌐](https://gramorx.com/mock/listening/review)             | Mock Listening | `pages/mock/listening/review.tsx`             | `ListeningReviewMock`    |          |          |       |
| 9   | [ ]  | `/mock/listening/exam/[slug]`        | [🔗](http://localhost:3000/mock/listening/exam/[slug])        | [🌐](https://gramorx.com/mock/listening/exam/[slug])        | Mock Listening | `pages/mock/listening/exam/[slug].tsx`        | `ListeningExam`          |          |          |       |
| 10  | [ ]  | `/mock/listening/history`            | [🔗](http://localhost:3000/mock/listening/history)            | [🌐](https://gramorx.com/mock/listening/history)            | Mock Listening | `pages/mock/listening/history/index.tsx`      | `ListeningHistory`       |          |          |       |
| 11  | [ ]  | `/mock/listening/result/[attemptId]` | [🔗](http://localhost:3000/mock/listening/result/[attemptId]) | [🌐](https://gramorx.com/mock/listening/result/[attemptId]) | Mock Listening | `pages/mock/listening/result/[attemptId].tsx` | `ListeningResultAttempt` |          |          |       |
| 12  | [ ]  | `/mock/listening/review/[attemptId]` | [🔗](http://localhost:3000/mock/listening/review/[attemptId]) | [🌐](https://gramorx.com/mock/listening/review/[attemptId]) | Mock Listening | `pages/mock/listening/review/[attemptId].tsx` | `ListeningReviewAttempt` |          |          |       |
| 13  | [ ]  | `/mock/reading`                      | [🔗](http://localhost:3000/mock/reading)                      | [🌐](https://gramorx.com/mock/reading)                      | Mock Reading   | `pages/mock/reading/index.tsx`                | `ReadingMock`            |          |          |       |
| 14  | [ ]  | `/mock/reading/[slug]`               | [🔗](http://localhost:3000/mock/reading/[slug])               | [🌐](https://gramorx.com/mock/reading/[slug])               | Mock Reading   | `pages/mock/reading/[slug].tsx`               | `ReadingDetailMock`      |          |          |       |
| 15  | [ ]  | `/mock/reading/daily`                | [🔗](http://localhost:3000/mock/reading/daily)                | [🌐](https://gramorx.com/mock/reading/daily)                | Mock Reading   | `pages/mock/reading/daily.tsx`                | `ReadingDaily`           |          |          |       |
| 16  | [ ]  | `/mock/reading/techniques`           | [🔗](http://localhost:3000/mock/reading/techniques)           | [🌐](https://gramorx.com/mock/reading/techniques)           | Mock Reading   | `pages/mock/reading/techniques.tsx`           | `ReadingTechniques`      |          |          |       |
| 17  | [ ]  | `/mock/reading/challenges`           | [🔗](http://localhost:3000/mock/reading/challenges)           | [🌐](https://gramorx.com/mock/reading/challenges)           | Mock Reading   | `pages/mock/reading/challenges/index.tsx`     | `ReadingChallenges`      |          |          |       |
| 18  | [ ]  | `/mock/reading/challenges/accuracy`  | [🔗](http://localhost:3000/mock/reading/challenges/accuracy)  | [🌐](https://gramorx.com/mock/reading/challenges/accuracy)  | Mock Reading   | `pages/mock/reading/challenges/accuracy.tsx`  | `ChallengeAccuracy`      |          |          |       |
| 19  | [ ]  | `/mock/reading/challenges/mastery`   | [🔗](http://localhost:3000/mock/reading/challenges/mastery)   | [🌐](https://gramorx.com/mock/reading/challenges/mastery)   | Mock Reading   | `pages/mock/reading/challenges/mastery.tsx`   | `ChallengeMastery`       |          |          |       |
| 20  | [ ]  | `/mock/reading/challenges/speed`     | [🔗](http://localhost:3000/mock/reading/challenges/speed)     | [🌐](https://gramorx.com/mock/reading/challenges/speed)     | Mock Reading   | `pages/mock/reading/challenges/speed.tsx`     | `ChallengeSpeed`         |          |          |       |
| 21  | [ ]  | `/mock/reading/challenges/weekly`    | [🔗](http://localhost:3000/mock/reading/challenges/weekly)    | [🌐](https://gramorx.com/mock/reading/challenges/weekly)    | Mock Reading   | `pages/mock/reading/challenges/weekly.tsx`    | `ChallengeWeekly`        |          |          |       |
| 22  | [ ]  | `/mock/reading/drill/passage`        | [🔗](http://localhost:3000/mock/reading/drill/passage)        | [🌐](https://gramorx.com/mock/reading/drill/passage)        | Mock Reading   | `pages/mock/reading/drill/passage.tsx`        | `DrillPassage`           |          |          |       |
| 23  | [ ]  | `/mock/reading/drill/question-type`  | [🔗](http://localhost:3000/mock/reading/drill/question-type)  | [🌐](https://gramorx.com/mock/reading/drill/question-type)  | Mock Reading   | `pages/mock/reading/drill/question-type.tsx`  | `DrillQuestionType`      |          |          |       |
| 24  | [ ]  | `/mock/reading/drill/speed`          | [🔗](http://localhost:3000/mock/reading/drill/speed)          | [🌐](https://gramorx.com/mock/reading/drill/speed)          | Mock Reading   | `pages/mock/reading/drill/speed.tsx`          | `DrillSpeed`             |          |          |       |
| 25  | [ ]  | `/mock/reading/feedback/[attemptId]` | [🔗](http://localhost:3000/mock/reading/feedback/[attemptId]) | [🌐](https://gramorx.com/mock/reading/feedback/[attemptId]) | Mock Reading   | `pages/mock/reading/feedback/[attemptId].tsx` | `ReadingFeedback`        |          |          |       |
| 26  | [ ]  | `/mock/reading/history`              | [🔗](http://localhost:3000/mock/reading/history)              | [🌐](https://gramorx.com/mock/reading/history)              | Mock Reading   | `pages/mock/reading/history/index.tsx`        | `ReadingHistory`         |          |          |       |
| 27  | [ ]  | `/mock/reading/result/[attemptId]`   | [🔗](http://localhost:3000/mock/reading/result/[attemptId])   | [🌐](https://gramorx.com/mock/reading/result/[attemptId])   | Mock Reading   | `pages/mock/reading/result/[attemptId].tsx`   | `ReadingResult`          |          |          |       |
| 28  | [ ]  | `/mock/reading/review/[attemptId]`   | [🔗](http://localhost:3000/mock/reading/review/[attemptId])   | [🌐](https://gramorx.com/mock/reading/review/[attemptId])   | Mock Reading   | `pages/mock/reading/review/[attemptId].tsx`   | `ReadingReview`          |          |          |       |
| 29  | [ ]  | `/mock/reading/weekly`               | [🔗](http://localhost:3000/mock/reading/weekly)               | [🌐](https://gramorx.com/mock/reading/weekly)               | Mock Reading   | `pages/mock/reading/weekly/index.tsx`         | `ReadingWeekly`          |          |          |       |
| 30  | [ ]  | `/mock/reading/[slug]/result`        | [🔗](http://localhost:3000/mock/reading/[slug]/result)        | [🌐](https://gramorx.com/mock/reading/[slug]/result)        | Mock Reading   | `pages/mock/reading/[slug]/result.tsx`        | `ReadingSlugResult`      |          |          |       |
| 31  | [ ]  | `/mock/speaking`                     | [🔗](http://localhost:3000/mock/speaking)                     | [🌐](https://gramorx.com/mock/speaking)                     | Mock Speaking  | `pages/mock/speaking/index.tsx`               | `SpeakingMock`           |          |          |       |
| 32  | [ ]  | `/mock/speaking/[id]`                | [🔗](http://localhost:3000/mock/speaking/[id])                | [🌐](https://gramorx.com/mock/speaking/[id])                | Mock Speaking  | `pages/mock/speaking/[id].tsx`                | `SpeakingDetailMock`     |          |          |       |
| 33  | [ ]  | `/exam/rehearsal`                    | [🔗](http://localhost:3000/exam/rehearsal)                    | [🌐](https://gramorx.com/exam/rehearsal)                    | Exam           | `pages/exam/rehearsal.tsx`                    | `Rehearsal`              |          |          |       |
| 34  | [ ]  | `/placement/result`                  | [🔗](http://localhost:3000/placement/result)                  | [🌐](https://gramorx.com/placement/result)                  | Placement      | `pages/placement/result.tsx`                  | `PlacementResult`        |          |          |       |
| 35  | [ ]  | `/placement/run`                     | [🔗](http://localhost:3000/placement/run)                     | [🌐](https://gramorx.com/placement/run)                     | Placement      | `pages/placement/run.tsx`                     | `PlacementRun`           |          |          |       |
| 36  | [ ]  | `/placement/start`                   | [🔗](http://localhost:3000/placement/start)                   | [🌐](https://gramorx.com/placement/start)                   | Placement      | `pages/placement/start.tsx`                   | `PlacementStart`         |          |          |       |

</details>

<details>
<summary><strong>📚 ExamResourceLayout</strong> – 1 page – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                | Local                                         | Live                                        | Module  | File                          | Components         | Reviewer | Priority | Notes |
| --- | ---- | -------------------- | --------------------------------------------- | ------------------------------------------- | ------- | ----------------------------- | ------------------ | -------- | -------- | ----- |
| 1   | [ ]  | `/writing/resources` | [🔗](http://localhost:3000/writing/resources) | [🌐](https://gramorx.com/writing/resources) | Writing | `pages/writing/resources.tsx` | `WritingResources` |          |          |       |

</details>

<details>
<summary><strong>🌍 GlobalPageLayout</strong> – 12 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                          | Local                                                   | Live                                                  | Module    | File                                   | Components        | Reviewer | Priority | Notes |
| --- | ---- | ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------- | --------- | -------------------------------------- | ----------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/`                            | [🔗](http://localhost:3000/)                            | [🌐](https://gramorx.com/)                            | Home      | `pages/index.tsx`                      | `HomePage`        |          |          |       |
| 2   | [ ]  | `/accessibility`               | [🔗](http://localhost:3000/accessibility)               | [🌐](https://gramorx.com/accessibility)               | General   | `pages/accessibility.tsx`              | `Accessibility`   |          |          |       |
| 3   | [ ]  | `/data-deletion`               | [🔗](http://localhost:3000/data-deletion)               | [🌐](https://gramorx.com/data-deletion)               | Legal     | `pages/data-deletion.tsx`              | `DataDeletion`    |          |          |       |
| 4   | [ ]  | `/legal/privacy`               | [🔗](http://localhost:3000/legal/privacy)               | [🌐](https://gramorx.com/legal/privacy)               | Legal     | `pages/legal/privacy.tsx`              | `Privacy`         |          |          |       |
| 5   | [ ]  | `/legal/terms`                 | [🔗](http://localhost:3000/legal/terms)                 | [🌐](https://gramorx.com/legal/terms)                 | Legal     | `pages/legal/terms.tsx`                | `Terms`           |          |          |       |
| 6   | [ ]  | `/403`                         | [🔗](http://localhost:3000/403)                         | [🌐](https://gramorx.com/403)                         | Error     | `pages/403.tsx`                        | `403`             |          |          |       |
| 7   | [ ]  | `/404`                         | [🔗](http://localhost:3000/404)                         | [🌐](https://gramorx.com/404)                         | Error     | `pages/404.tsx`                        | `404`             |          |          |       |
| 8   | [ ]  | `/500`                         | [🔗](http://localhost:3000/500)                         | [🌐](https://gramorx.com/500)                         | Error     | `pages/500.tsx`                        | `500`             |          |          |       |
| 9   | [ ]  | `/restricted`                  | [🔗](http://localhost:3000/restricted)                  | [🌐](https://gramorx.com/restricted)                  | Error     | `pages/restricted.tsx`                 | `Restricted`      |          |          |       |
| 10  | [ ]  | `/.well-known/assetlinks.json` | [🔗](http://localhost:3000/.well-known/assetlinks.json) | [🌐](https://gramorx.com/.well-known/assetlinks.json) | System    | `pages/.well-known/assetlinks.json.ts` | `AssetLinks`      |          |          |       |
| 11  | [ ]  | `/pwa/app`                     | [🔗](http://localhost:3000/pwa/app)                     | [🌐](https://gramorx.com/pwa/app)                     | PWA       | `pages/pwa/app.tsx`                    | `App`             |          |          |       |
| 12  | [ ]  | `/r/[code]`                    | [🔗](http://localhost:3000/r/[code])                    | [🌐](https://gramorx.com/r/[code])                    | Shortlink | `pages/r/[code].tsx`                   | `RedirectHandler` |          |          |       |

</details>

<details>
<summary><strong>🚀 OnboardingLayout</strong> – 7 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                       | Local                                                | Live                                               | Module     | File                                 | Components      | Reviewer | Priority | Notes |
| --- | ---- | --------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ---------- | ------------------------------------ | --------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/onboarding`               | [🔗](http://localhost:3000/onboarding)               | [🌐](https://gramorx.com/onboarding)               | Onboarding | `pages/onboarding/index.tsx`         | `OnboardingHub` |          |          |       |
| 2   | [ ]  | `/onboarding/exam-date`     | [🔗](http://localhost:3000/onboarding/exam-date)     | [🌐](https://gramorx.com/onboarding/exam-date)     | Onboarding | `pages/onboarding/exam-date.tsx`     | `ExamDate`      |          |          |       |
| 3   | [ ]  | `/onboarding/notifications` | [🔗](http://localhost:3000/onboarding/notifications) | [🌐](https://gramorx.com/onboarding/notifications) | Onboarding | `pages/onboarding/notifications.tsx` | `Notifications` |          |          |       |
| 4   | [ ]  | `/onboarding/study-rhythm`  | [🔗](http://localhost:3000/onboarding/study-rhythm)  | [🌐](https://gramorx.com/onboarding/study-rhythm)  | Onboarding | `pages/onboarding/study-rhythm.tsx`  | `StudyRhythm`   |          |          |       |
| 5   | [ ]  | `/onboarding/target-band`   | [🔗](http://localhost:3000/onboarding/target-band)   | [🌐](https://gramorx.com/onboarding/target-band)   | Onboarding | `pages/onboarding/target-band.tsx`   | `TargetBand`    |          |          |       |
| 6   | [ ]  | `/onboarding/skills`        | [🔗](http://localhost:3000/onboarding/skills)        | [🌐](https://gramorx.com/onboarding/skills)        | Onboarding | `pages/onboarding/skills.tsx`        | `Skills`        |          |          |       |
| 7   | [ ]  | `/onboarding/welcome`       | [🔗](http://localhost:3000/onboarding/welcome)       | [🌐](https://gramorx.com/onboarding/welcome)       | Onboarding | `pages/onboarding/welcome/index.tsx` | `Welcome`       |          |          |       |

</details>

<details>
<summary><strong>🧰 ResourcesLayout</strong> – 3 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                             | Local                                                      | Live                                                     | Module    | File                                       | Components      | Reviewer | Priority | Notes |
| --- | ---- | --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | --------- | ------------------------------------------ | --------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/tools/listening/dictation`      | [🔗](http://localhost:3000/tools/listening/dictation)      | [🌐](https://gramorx.com/tools/listening/dictation)      | Listening | `pages/tools/listening/dictation.tsx`      | `Dictation`     |          |          |       |
| 2   | [ ]  | `/tools/listening/accent-trainer` | [🔗](http://localhost:3000/tools/listening/accent-trainer) | [🌐](https://gramorx.com/tools/listening/accent-trainer) | Listening | `pages/tools/listening/accent-trainer.tsx` | `AccentTrainer` |          |          |       |
| 3   | [ ]  | `/tools/mark-sections/[slug]`     | [🔗](http://localhost:3000/tools/mark-sections/[slug])     | [🌐](https://gramorx.com/tools/mark-sections/[slug])     | Tools     | `pages/tools/mark-sections/[slug].tsx`     | `SectionMarker` |          |          |       |

</details>

<details>
<summary><strong>✍️ WritingLayout</strong> – 15 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                            | Local                                                     | Live                                                    | Module  | File                                      | Components        | Reviewer | Priority | Notes |
| --- | ---- | -------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- | ------- | ----------------------------------------- | ----------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/writing/[slug]`                | [🔗](http://localhost:3000/writing/[slug])                | [🌐](https://gramorx.com/writing/[slug])                | Writing | `pages/writing/[slug].tsx`                | `WritingDetail`   |          |          |       |
| 2   | [ ]  | `/writing/progress`              | [🔗](http://localhost:3000/writing/progress)              | [🌐](https://gramorx.com/writing/progress)              | Writing | `pages/writing/progress.tsx`              | `WritingProgress` |          |          |       |
| 3   | [ ]  | `/writing/overview`              | [🔗](http://localhost:3000/writing/overview)              | [🌐](https://gramorx.com/writing/overview)              | Writing | `pages/writing/overview.tsx`              | `WritingOverview` |          |          |       |
| 4   | [ ]  | `/writing/library`               | [🔗](http://localhost:3000/writing/library)               | [🌐](https://gramorx.com/writing/library)               | Writing | `pages/writing/library.tsx`               | `WritingLibrary`  |          |          |       |
| 5   | [ ]  | `/writing/drills`                | [🔗](http://localhost:3000/writing/drills)                | [🌐](https://gramorx.com/writing/drills)                | Writing | `pages/writing/drills/index.tsx`          | `DrillsIndex`     |          |          |       |
| 6   | [ ]  | `/writing/drills/[slug]`         | [🔗](http://localhost:3000/writing/drills/[slug])         | [🌐](https://gramorx.com/writing/drills/[slug])         | Writing | `pages/writing/drills/[slug].tsx`         | `DrillDetail`     |          |          |       |
| 7   | [ ]  | `/writing/learn`                 | [🔗](http://localhost:3000/writing/learn)                 | [🌐](https://gramorx.com/writing/learn)                 | Writing | `pages/writing/learn/index.tsx`           | `LearnIndex`      |          |          |       |
| 8   | [ ]  | `/writing/learn/coherence`       | [🔗](http://localhost:3000/writing/learn/coherence)       | [🌐](https://gramorx.com/writing/learn/coherence)       | Writing | `pages/writing/learn/coherence.tsx`       | `LearnCoherence`  |          |          |       |
| 9   | [ ]  | `/writing/learn/grammar`         | [🔗](http://localhost:3000/writing/learn/grammar)         | [🌐](https://gramorx.com/writing/learn/grammar)         | Writing | `pages/writing/learn/grammar.tsx`         | `LearnGrammar`    |          |          |       |
| 10  | [ ]  | `/writing/learn/lexical`         | [🔗](http://localhost:3000/writing/learn/lexical)         | [🌐](https://gramorx.com/writing/learn/lexical)         | Writing | `pages/writing/learn/lexical.tsx`         | `LearnLexical`    |          |          |       |
| 11  | [ ]  | `/writing/learn/task1-overview`  | [🔗](http://localhost:3000/writing/learn/task1-overview)  | [🌐](https://gramorx.com/writing/learn/task1-overview)  | Writing | `pages/writing/learn/task1-overview.tsx`  | `Task1Overview`   |          |          |       |
| 12  | [ ]  | `/writing/learn/task2-structure` | [🔗](http://localhost:3000/writing/learn/task2-structure) | [🌐](https://gramorx.com/writing/learn/task2-structure) | Writing | `pages/writing/learn/task2-structure.tsx` | `Task2Structure`  |          |          |       |
| 13  | [ ]  | `/writing/review/calibrate`      | [🔗](http://localhost:3000/writing/review/calibrate)      | [🌐](https://gramorx.com/writing/review/calibrate)      | Writing | `pages/writing/review/calibrate.tsx`      | `ReviewCalibrate` |          |          |       |
| 14  | [ ]  | `/writing/review/[attemptId]`    | [🔗](http://localhost:3000/writing/review/[attemptId])    | [🌐](https://gramorx.com/writing/review/[attemptId])    | Writing | `pages/writing/review/[attemptId].tsx`    | `ReviewAttempt`   |          |          |       |
| 15  | [ ]  | `/review/writing/[id]`           | [🔗](http://localhost:3000/review/writing/[id])           | [🌐](https://gramorx.com/review/writing/[id])           | Writing | `pages/review/writing/[id].tsx`           | `WritingReview`   |          |          |       |

</details>

<details>
<summary><strong>🧪 WritingExamLayout</strong> – 10 pages – 0% done ░░░░░░░░░░</summary>

| Seq | Done | Route                               | Local                                                        | Live                                                       | Module       | File                                         | Components       | Reviewer | Priority | Notes |
| --- | ---- | ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------ | -------------------------------------------- | ---------------- | -------- | -------- | ----- |
| 1   | [ ]  | `/writing/mock`                     | [🔗](http://localhost:3000/writing/mock)                     | [🌐](https://gramorx.com/writing/mock)                     | Writing      | `pages/writing/mock/index.tsx`               | `MockIndex`      |          |          |       |
| 2   | [ ]  | `/writing/mock/[mockId]/workspace`  | [🔗](http://localhost:3000/writing/mock/[mockId]/workspace)  | [🌐](https://gramorx.com/writing/mock/[mockId]/workspace)  | Writing      | `pages/writing/mock/[mockId]/workspace.tsx`  | `MockWorkspace`  |          |          |       |
| 3   | [ ]  | `/writing/mock/[mockId]/start`      | [🔗](http://localhost:3000/writing/mock/[mockId]/start)      | [🌐](https://gramorx.com/writing/mock/[mockId]/start)      | Writing      | `pages/writing/mock/[mockId]/start.tsx`      | `MockStart`      |          |          |       |
| 4   | [ ]  | `/writing/mock/[mockId]/review`     | [🔗](http://localhost:3000/writing/mock/[mockId]/review)     | [🌐](https://gramorx.com/writing/mock/[mockId]/review)     | Writing      | `pages/writing/mock/[mockId]/review.tsx`     | `MockReview`     |          |          |       |
| 5   | [ ]  | `/writing/mock/[mockId]/results`    | [🔗](http://localhost:3000/writing/mock/[mockId]/results)    | [🌐](https://gramorx.com/writing/mock/[mockId]/results)    | Writing      | `pages/writing/mock/[mockId]/results.tsx`    | `MockResults`    |          |          |       |
| 6   | [ ]  | `/writing/mock/[mockId]/evaluating` | [🔗](http://localhost:3000/writing/mock/[mockId]/evaluating) | [🌐](https://gramorx.com/writing/mock/[mockId]/evaluating) | Writing      | `pages/writing/mock/[mockId]/evaluating.tsx` | `MockEvaluating` |          |          |       |
| 7   | [ ]  | `/mock/writing`                     | [🔗](http://localhost:3000/mock/writing)                     | [🌐](https://gramorx.com/mock/writing)                     | Mock Writing | `pages/mock/writing/index.tsx`               | `WritingMock`    |          |          |       |
| 8   | [ ]  | `/mock/writing/run`                 | [🔗](http://localhost:3000/mock/writing/run)                 | [🌐](https://gramorx.com/mock/writing/run)                 | Mock Writing | `pages/mock/writing/run.tsx`                 | `WritingRun`     |          |          |       |
| 9   | [ ]  | `/mock/writing/[testId]`            | [🔗](http://localhost:3000/mock/writing/[testId])            | [🌐](https://gramorx.com/mock/writing/[testId])            | Mock Writing | `pages/mock/writing/[testId].tsx`            | `WritingTest`    |          |          |       |
| 10  | [ ]  | `/mock/writing/result/[attemptId]`  | [🔗](http://localhost:3000/mock/writing/result/[attemptId])  | [🌐](https://gramorx.com/mock/writing/result/[attemptId])  | Mock Writing | `pages/mock/writing/result/[attemptId].tsx`  | `WritingResult`  |          |          |       |

</details>
