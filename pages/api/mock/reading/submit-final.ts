// pages/api/mock/reading/submit-final.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

// XP logic – tweak numbers however you like
function calculateXpForReadingAttempt(correctCount: number, totalQuestions: number, bandScore: number | null) {
  const basePerCorrect = 5; // XP per correct answer
  const baseXp = correctCount * basePerCorrect;

  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const accuracyBonus = Math.round(accuracy * 20); // up to +20 XP

  const bandBonus = bandScore ? Math.max(0, Math.round((bandScore - 5) * 10)) : 0;

  const completionBonus = totalQuestions >= 40 ? 20 : 10;

  return baseXp + accuracyBonus + bandBonus + completionBonus;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient({ req, res });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { attemptId, durationSeconds } = req.body as {
    attemptId?: string;
    durationSeconds?: number;
  };

  if (!attemptId) {
    return res.status(400).json({ error: 'Missing attemptId' });
  }

  // 1) Load the attempt row
  const { data: attempt, error: attemptError } = await supabase
    .from('reading_attempts')
    .select('id, user_id, status, test_id, raw_score, band_score, duration_seconds, started_at, submitted_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError) {
    console.error('reading submit-final: attempt fetch error', attemptError);
    return res.status(500).json({ error: 'Failed to load attempt' });
  }

  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (attempt.user_id !== user.id) {
    return res.status(403).json({ error: 'Not your attempt' });
  }

  if (attempt.status === 'submitted') {
    // Don’t give XP twice
    return res.status(200).json({ status: 'already_submitted' });
  }

  // 2) Compute correctCount & totalQuestions
  // Prefer raw_score if already set; otherwise compute from reading_attempt_answers
  let correctCount: number;
  let totalQuestions: number;

  if (attempt.raw_score != null) {
    correctCount = Number(attempt.raw_score);
    // Get total_questions from tests table
    const { data: testRow, error: testError } = await supabase
      .from('reading_tests')
      .select('total_questions')
      .eq('id', attempt.test_id)
      .maybeSingle();

    if (testError) {
      console.error('reading submit-final: test fetch error', testError);
      return res.status(500).json({ error: 'Failed to load test meta' });
    }

    totalQuestions = testRow?.total_questions ?? correctCount; // fallback
  } else {
    // Raw score not populated – aggregate from answers
    const { data: answers, error: answersError } = await supabase
      .from('reading_attempt_answers')
      .select('is_correct')
      .eq('attempt_id', attemptId);

    if (answersError) {
      console.error('reading submit-final: answers fetch error', answersError);
      return res.status(500).json({ error: 'Failed to load answers' });
    }

    totalQuestions = answers?.length ?? 0;
    correctCount = answers?.filter((a) => a.is_correct === true).length ?? 0;

    // Optional: write raw_score back to attempts if you want to keep it
    const { error: patchScoreError } = await supabase
      .from('reading_attempts')
      .update({ raw_score: correctCount })
      .eq('id', attemptId)
      .eq('user_id', user.id);

    if (patchScoreError) {
      console.warn('reading submit-final: failed to patch raw_score', patchScoreError);
    }
  }

  // 3) Band score
  const bandScore: number | null =
    attempt.band_score != null ? Number(attempt.band_score) : null;

  // 4) Finalise attempt (set status + submitted_at + duration)
  const attemptUpdate: Record<string, any> = {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };

  if (typeof durationSeconds === 'number') {
    attemptUpdate.duration_seconds = durationSeconds;
  } else if (attempt.started_at) {
    // rough fallback duration in seconds
    const started = new Date(attempt.started_at).getTime();
    const now = Date.now();
    attemptUpdate.duration_seconds = Math.max(
      attempt.duration_seconds ?? 0,
      Math.round((now - started) / 1000),
    );
  }

  const { error: updateAttemptError } = await supabase
    .from('reading_attempts')
    .update(attemptUpdate)
    .eq('id', attemptId)
    .eq('user_id', user.id);

  if (updateAttemptError) {
    console.error('reading submit-final: update attempt error', updateAttemptError);
    return res.status(500).json({ error: 'Failed to finalise attempt' });
  }

  // 5) Load existing stats + profile in parallel
  const [statsRes, profileRes] = await Promise.all([
    supabase
      .from('user_competitive_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('country, current_streak')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const existingStats = statsRes.data ?? null;
  if (statsRes.error) {
    console.warn('reading submit-final: stats fetch error', statsRes.error);
  }

  const profile = profileRes.data ?? null;
  if (profileRes.error) {
    console.warn('reading submit-final: profile fetch error', profileRes.error);
  }

  const prevTotalXp = existingStats?.total_xp ?? 0;
  const prevWeeklyXp = existingStats?.weekly_xp ?? 0;
  const prevAttempts = existingStats?.attempts_total ?? 0;
  const prevOverallBand: number | null = existingStats?.overall_band ?? null;
  const prevReadingBand: number | null = existingStats?.reading_band ?? null;
  const prevCountryCode: string | null = existingStats?.country_code ?? null;
  const prevStreakDays: number = existingStats?.streak_days ?? 0;

  // 6) XP calc
  const gainedXp = calculateXpForReadingAttempt(correctCount, totalQuestions, bandScore);
  const newTotalXp = prevTotalXp + gainedXp;
  const newWeeklyXp = prevWeeklyXp + gainedXp;
  const newAttemptsTotal = prevAttempts + 1;

  // 7) Bands – store BEST so far
  let newOverallBand: number | null = prevOverallBand;
  let newReadingBand: number | null = prevReadingBand;

  if (bandScore !== null) {
    if (newOverallBand === null || bandScore > newOverallBand) {
      newOverallBand = bandScore;
    }
    if (newReadingBand === null || bandScore > newReadingBand) {
      newReadingBand = bandScore;
    }
  }

  // 8) Country & streak
  const countryCode = prevCountryCode ?? profile?.country ?? null;
  const newStreakDays = profile?.current_streak ?? prevStreakDays;

  // 9) Upsert into user_competitive_stats
  const payload = {
    user_id: user.id,
    total_xp: newTotalXp,
    weekly_xp: newWeeklyXp,
    overall_band: newOverallBand,
    reading_band: newReadingBand,
    attempts_total: newAttemptsTotal,
    streak_days: newStreakDays,
    country_code: countryCode,
  };

  const { error: upsertError } = await supabase
    .from('user_competitive_stats')
    .upsert(payload, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('reading submit-final: stats upsert error', upsertError);
    // We still return success for the attempt; leaderboard can lag if needed
  }

  return res.status(200).json({
    status: 'submitted',
    attemptId,
    correctCount,
    totalQuestions,
    bandScore,
    gainedXp,
    totalXp: newTotalXp,
  });
}
