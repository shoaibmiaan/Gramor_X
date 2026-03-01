# Vocab Quiz Schema Extension (Prisma-style)

```prisma
model QuizEvent {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  quizSessionId String   @map("quiz_session_id")
  eventType     String   @map("event_type")
  payload       Json?
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([quizSessionId])
  @@map("quiz_events")
}

model VocabQuizSession {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  quizSessionId   String   @unique @map("quiz_session_id")
  questions       Json
  durationSeconds Int      @default(60) @map("duration_seconds")
  status          String   @default("active")
  expiresAt       DateTime @map("expires_at")
  submittedAt     DateTime? @map("submitted_at")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([status, expiresAt])
  @@map("vocab_quiz_sessions")
}

model VocabQuizAnswer {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  quizSessionId String   @map("quiz_session_id")
  questionId    String   @map("question_id")
  selectedIndex Int      @map("selected_index")
  responseTimeMs Int     @map("response_time_ms")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([userId, quizSessionId])
  @@index([quizSessionId])
  @@map("vocab_quiz_answers")
}

model VocabQuizResult {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  quizSessionId   String   @unique @map("quiz_session_id")
  scoreCorrect    Int      @map("score_correct")
  scoreTotal      Int      @map("score_total")
  accuracy        Float
  weightedAccuracy Float   @map("weighted_accuracy")
  avgResponseMs   Int      @map("avg_response_ms")
  resultPayload   Json     @map("result_payload")
  submittedAt     DateTime @map("submitted_at")

  @@index([userId, submittedAt])
  @@map("vocab_quiz_results")
}

model UserVocabProfile {
  userId              String   @map("user_id")
  wordId              String   @map("word_id")
  attempts            Int      @default(0)
  correctCount        Int      @default(0) @map("correct_count")
  lastSeen            DateTime @default(now()) @map("last_seen")
  strengthScore       Float    @default(0) @map("strength_score")
  difficulty          String?
  responseTimeMs      Int?     @map("response_time_ms")
  source              String?  @default("vocab_quiz")
  latestQuizSessionId String?  @map("latest_quiz_session_id")

  @@id([userId, wordId])
  @@index([userId, strengthScore])
  @@map("user_vocab_profile")
}
```

## Migration Notes

1. Create `vocab_quiz_sessions`, `vocab_quiz_answers`, and `vocab_quiz_results` before deploying the new APIs.
2. Keep `quiz_events` for analytics/audit and append `started`/`submitted` events from API handlers.
3. Add retention policy for `vocab_quiz_answers` and `quiz_events` (for example archive rows older than 180 days).
4. Enforce RLS policies by `auth.uid() = user_id` for user-level reads; writes stay server-side.
5. Optional: add Redis rate-limit/session cache if you need multi-region throttling in addition to DB replay protection.

## SQL to run

Use the migration directly in Supabase SQL editor or CLI.

### Option A: Supabase SQL Editor

Run the full file:

`supabase/migrations/20260417000000_vocab_quiz_engine.sql`

### Option B: Supabase CLI

```bash
supabase db push
```

### Option C: Direct psql execution

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260417000000_vocab_quiz_engine.sql
```
