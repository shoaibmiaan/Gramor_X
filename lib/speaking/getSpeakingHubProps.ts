import type { IncomingMessage, ServerResponse } from 'http';

import { env } from '@/lib/env';
import { getServerClient } from '@/lib/supabaseServer';
import type { SpeakingAttemptSummary, SpeakingPracticeHubProps } from '@/types/speakingPracticeHub';

export async function getSpeakingHubServerProps(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SpeakingPracticeHubProps> {
  const supabase = getServerClient(req as any, res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limit = Number.parseInt(env.SPEAKING_DAILY_LIMIT || '5', 10);

  if (!user) {
    return {
      attempts: [],
      attemptsToday: 0,
      limit,
      signedIn: false,
    };
  }

  const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: attemptsToday = 0 } = await supabase
    .from('speaking_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', sinceIso);

  const { data: attemptRows = [] } = await supabase
    .from('speaking_attempts')
    .select('id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const attempts: SpeakingAttemptSummary[] = [];

  if (attemptRows.length > 0) {
    const ids = attemptRows.map((attempt) => attempt.id);
    const { data: clipRows = [] } = await supabase
      .from('speaking_clips')
      .select('attempt_id, part, overall')
      .in('attempt_id', ids);

    const summaries = new Map<string, SpeakingAttemptSummary>();
    attemptRows.forEach((attempt) => {
      summaries.set(attempt.id, {
        id: attempt.id,
        created_at: attempt.created_at,
        overall: null,
        parts: { p1: null, p2: null, p3: null },
      });
    });

    clipRows.forEach((clip: { attempt_id: string; part: string | null; overall: number | null }) => {
      const summary = summaries.get(clip.attempt_id);
      if (!summary) return;

      if (clip.part === 'p1' || clip.part === 'p2' || clip.part === 'p3') {
        summary.parts[clip.part] = typeof clip.overall === 'number' ? Number(clip.overall) : null;
      }
    });

    summaries.forEach((summary) => {
      const values = Object.values(summary.parts).filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value),
      );

      summary.overall = values.length
        ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1))
        : null;

      attempts.push(summary);
    });
  }

  return {
    attempts,
    attemptsToday,
    limit,
    signedIn: true,
  };
}
