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

model UserVocabProfile {
  userId         String   @map("user_id")
  wordId         String   @map("word_id")
  attempts       Int      @default(0)
  correctCount   Int      @default(0) @map("correct_count")
  lastSeen       DateTime @default(now()) @map("last_seen")
  strengthScore  Float    @default(0) @map("strength_score")
  difficulty     String?
  responseTimeMs Int?     @map("response_time_ms")

  @@id([userId, wordId])
  @@index([userId, strengthScore])
  @@map("user_vocab_profile")
}
```

## Migration Notes

1. Create both tables before enabling `/api/quiz/vocab/start` and `/api/quiz/vocab/submit`.
2. Backfill `user_vocab_profile` for existing vocabulary attempts if historical data exists.
3. Add retention policy for `quiz_events` (e.g., archive rows > 180 days).
4. If running multi-instance serverless, replace in-memory session replay cache with Redis.
