// pages/api/reading/dashboard.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: { persistSession: false },
    },
  );

type AttemptRow = {
  id: string;
  user_id: string;
  test_id: string | null;
  passage_id: string | null;
  created_at: string;
  duration_sec: number | null;
  score: number | null;
  correct_questions: number | null;
  total_questions: number | null;
};

type AttemptDetailRow = {
  attempt_id: string;
  question_id: string;
  correct: boolean | null;
  time_sec: number | null;
};

type QuestionRow = { id: string; type: string | null };
type PassageRow = { id: string; title: string | null; slug: string | null };
type TestRow = { id: string; title: string | null; slug: string | null };
type UserStatsRow = {
  user_id: string;
  streak_days: number | null;
  total_practices: number | null;
};

const emptyPayload = (note?: string) => ({
  kpis: {
    bandEstimate: null,
    bandStd: null,
    accuracy10: null,
    accuracyDelta10: null,
    avgSecPerQ: null,
    streakDays: null,
    totalPractices: null,
  },
  trend: [],
  byType: [],
  timeVsScore: [],
  weakAreas: [],
  recent: [],
  saved: [],
  queued: [],
  ...(note ? { note } : {}),
});

function extractBearerToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length ? token : null;
}

function normScore(a: AttemptRow): number | null {
  if (typeof a.score === 'number') return a.score > 1 ? a.score / 100 : a.score;
  if (
    typeof a.correct_questions === 'number' &&
    typeof a.total_questions === 'number' &&
    a.total_questions > 0
  ) {
    return a.correct_questions / a.total_questions;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'server_config_error' });
  }

  const sb = supabaseAdmin();

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const userId = user.id;

  try {
    const { data: attemptsRaw, error: attemptsErr } = await sb
      .from('reading_attempts')
      .select(
        'id,user_id,test_id,passage_id,created_at,duration_sec,score,correct_questions,total_questions',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60);

    if (attemptsErr) {
      return res.status(200).json(emptyPayload('reading_attempts query failed'));
    }

    const attempts: AttemptRow[] = (attemptsRaw ?? []) as AttemptRow[];
    const latest = attempts.slice(0, 20);

    const latestIds = latest.map((a) => a.id);
    let details: AttemptDetailRow[] = [];
    if (latestIds.length) {
      const { data: det, error: detErr } = await sb
        .from('attempts_reading')
        .select('attempt_id,question_id,correct,time_sec')
        .in('attempt_id', latestIds)
        .limit(1000);
      if (!detErr && det) details = det as AttemptDetailRow[];
    }

    const qIds = Array.from(new Set(details.map((d) => d.question_id)));
    const questions: Record<string, string | null> = {};
    if (qIds.length) {
      const { data: qRows, error: qErr } = await sb
        .from('reading_questions')
        .select('id,type')
        .in('id', qIds)
        .limit(2000);
      if (!qErr && qRows) {
        for (const q of qRows as QuestionRow[]) questions[q.id] = q.type;
      }
    }

    const passageIds = Array.from(
      new Set(attempts.map((a) => a.passage_id).filter((x): x is string => !!x)),
    );
    const testIds = Array.from(
      new Set(attempts.map((a) => a.test_id).filter((x): x is string => !!x)),
    );

    const passagesById: Record<string, PassageRow> = {};
    if (passageIds.length) {
      const { data: pRows } = await sb
        .from('reading_passages')
        .select('id,title,slug')
        .in('id', passageIds)
        .limit(2000);
      for (const p of (pRows ?? []) as PassageRow[]) passagesById[p.id] = p;
    }

    const testsById: Record<string, TestRow> = {};
    if (testIds.length) {
      const { data: tRows } = await sb
        .from('reading_tests')
        .select('id,title,slug')
        .in('id', testIds)
        .limit(2000);
      for (const t of (tRows ?? []) as TestRow[]) testsById[t.id] = t;
    }

    let userStats: UserStatsRow | null = null;
    const { data: us } = await sb
      .from('reading_user_stats')
      .select('user_id,streak_days,total_practices')
      .eq('user_id', userId)
      .maybeSingle();
    userStats = (us as UserStatsRow | null) ?? null;

    const last10Scores = attempts
      .slice(0, 10)
      .map(normScore)
      .filter((n): n is number => n != null);
    const accuracy10 = last10Scores.length ? avg(last10Scores) : null;

    const prev10Scores = attempts
      .slice(10, 20)
      .map(normScore)
      .filter((n): n is number => n != null);
    const accuracyPrev10 = prev10Scores.length ? avg(prev10Scores) : null;

    const accuracyDelta10 =
      typeof accuracy10 === 'number' && typeof accuracyPrev10 === 'number'
        ? accuracy10 - accuracyPrev10
        : null;

    const allScores = attempts.map(normScore).filter((n): n is number => n != null);
    const bandEstimate = allScores.length ? toBand(avg(allScores)) : null;
    const bandStd = allScores.length > 1 ? stddev(allScores.map(toBand)) : null;

    const timeDenoms = latest
      .map((a) => ({
        dur: typeof a.duration_sec === 'number' ? a.duration_sec : null,
        n:
          typeof a.total_questions === 'number' && a.total_questions > 0 ? a.total_questions : null,
      }))
      .filter((x): x is { dur: number; n: number } => x.dur != null && x.n != null);

    const avgSecPerQ = timeDenoms.length
      ? Math.round(avg(timeDenoms.map((x) => x.dur / x.n)))
      : null;

    const trend = latest.map((a) => ({ date: a.created_at, score: normScore(a) ?? 0 }));

    const byTypeAgg: Record<string, { correct: number; total: number }> = {};
    for (const d of details) {
      const type = (questions[d.question_id] || 'unknown').toLowerCase();
      if (!byTypeAgg[type]) byTypeAgg[type] = { correct: 0, total: 0 };
      byTypeAgg[type].total += 1;
      if (d.correct) byTypeAgg[type].correct += 1;
    }

    const byType = Object.entries(byTypeAgg)
      .map(([type, v]) => ({
        type,
        accuracy: v.total > 0 ? v.correct / v.total : 0,
        attempts: v.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const timeVsScore = latest
      .map((a) => ({
        id: a.id,
        minutes: Math.max(1, Math.round(((a.duration_sec ?? 0) / 60) * 10) / 10),
        score: normScore(a) ?? 0,
      }))
      .filter((x) => Number.isFinite(x.minutes) && Number.isFinite(x.score));

    const recent = attempts.slice(0, 7).map((a) => {
      const pass = a.passage_id ? passagesById[a.passage_id] : null;
      const test = a.test_id ? testsById[a.test_id] : null;
      const title = pass?.title || test?.title || 'Reading practice';
      const slug = pass?.slug || test?.slug || a.id;
      const hrefReview = pass?.slug
        ? `/reading/${pass.slug}#review`
        : test?.slug
          ? `/reading/${test.slug}#review`
          : `/reading/${slug}#review`;

      return {
        slug: String(slug),
        title: String(title),
        date: a.created_at,
        score: normScore(a) ?? 0,
        minutes: Math.max(1, Math.round(((a.duration_sec ?? 0) / 60) * 10) / 10),
        types: [],
        hrefReview,
      };
    });

    const weakAreas =
      byType.length >= 2
        ? byType.slice(0, 2).map((w) => ({
            label: w.type,
            reason: `Accuracy ${Math.round(w.accuracy * 100)}% over ${w.attempts} Qs`,
            href: `/reading?type=${encodeURIComponent(w.type)}`,
          }))
        : [];

    return res.status(200).json({
      kpis: {
        bandEstimate,
        bandStd,
        accuracy10,
        accuracyDelta10,
        avgSecPerQ,
        streakDays: userStats?.streak_days ?? null,
        totalPractices: userStats?.total_practices ?? attempts.length,
      },
      trend,
      byType,
      timeVsScore,
      weakAreas,
      recent,
      saved: [],
      queued: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled';
    return res.status(200).json(emptyPayload(message));
  }
}

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function stddev(xs: number[]) {
  const m = avg(xs);
  const v = avg(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function toBand(p: number) {
  return 4 + p * 5;
}
