// pages/api/reading/dashboard.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Prefer your existing helper if present
// import { getServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

// ---- Adjust these if your env helpers differ
const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  });

/**
 * Expected minimal columns:
 * reading_attempts: id, user_id, test_id, passage_id, created_at, duration_sec, score (0..1 or 0..100), correct_questions, total_questions
 * attempts_reading: attempt_id, question_id, correct (bool), time_sec
 * reading_questions: id, type ('tfng'|'mcq'|'matching'|'short'|...)
 * reading_passages: id, title, slug
 * reading_tests: id, title, slug
 * reading_user_stats (optional): user_id, streak_days, total_practices
 */

type AttemptRow = {
  id: string;
  user_id: string;
  test_id: string | null;
  passage_id: string | null;
  created_at: string;
  duration_sec: number | null;
  score: number | null; // 0..1 or 0..100
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
type UserStatsRow = { user_id: string; streak_days: number | null; total_practices: number | null };

function normScore(a: AttemptRow): number | null {
  if (a == null) return null;
  if (typeof a.score === 'number') {
    // Heuristic: treat >1 as percentage
    return a.score > 1 ? a.score / 100 : a.score;
  }
  if (typeof a.correct_questions === 'number' && typeof a.total_questions === 'number' && a.total_questions > 0) {
    return a.correct_questions / a.total_questions;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sb = supabaseAdmin();

    // ---- Get user from a bearer cookie/session (if you gate with RLS, keep this).
    // Service role is used above for simplicity, but if you prefer per-request auth:
    // const supa = getServerClient(req, res);
    // const { data: { user } } = await supa.auth.getUser();

    // If you want to require auth, flip allowGuest to false
    const allowGuest = true;

    // Try to infer user via a light JWT in Authorization, else treat as guest
    let userId: string | null = null;
    try {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data?.user) userId = data.user.id;
      }
    } catch {
      // ignore; we'll be guest
    }

    if (!userId && !allowGuest) {
      return res.status(401).json({ error: 'not_authenticated' });
    }

    // ---- Fetch attempts (latest first)
    const attemptsQ = sb
      .from('reading_attempts')
      .select('id,user_id,test_id,passage_id,created_at,duration_sec,score,correct_questions,total_questions')
      .order('created_at', { ascending: false })
      .limit(60);

    const { data: attemptsRaw, error: attemptsErr } = await attemptsQ;
    if (attemptsErr) {
      // Don’t explode the UI — return empty, plus an informational hint
      return res.status(200).json({
        kpis: { bandEstimate: null, bandStd: null, accuracy10: null, accuracyDelta10: null, avgSecPerQ: null, streakDays: null, totalPractices: null },
        trend: [],
        byType: [],
        timeVsScore: [],
        weakAreas: [],
        recent: [],
        saved: [],
        queued: [],
        note: 'reading_attempts query failed',
      });
    }

    const attempts: AttemptRow[] = (attemptsRaw ?? []) as any;
    const latest = attempts.slice(0, 20);

    // ---- Batch fetch per-question results for last ~200 details
    const latestIds = latest.map((a) => a.id);
    let details: AttemptDetailRow[] = [];
    if (latestIds.length) {
      const { data: det, error: detErr } = await sb
        .from('attempts_reading')
        .select('attempt_id,question_id,correct,time_sec')
        .in('attempt_id', latestIds)
        .limit(1000);
      if (!detErr && det) details = det as any;
    }

    // ---- Fetch question types for involved questions
    const qIds = Array.from(new Set(details.map((d) => d.question_id)));
    let questions: Record<string, string | null> = {};
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

    // ---- Simple resource titles (passage/test)
    const passageIds = Array.from(new Set(attempts.map((a) => a.passage_id).filter(Boolean))) as string[];
    const testIds = Array.from(new Set(attempts.map((a) => a.test_id).filter(Boolean))) as string[];

    let passagesById: Record<string, PassageRow> = {};
    if (passageIds.length) {
      const { data: pRows } = await sb.from('reading_passages').select('id,title,slug').in('id', passageIds).limit(2000);
      (pRows ?? []).forEach((p: any) => (passagesById[p.id] = p));
    }

    let testsById: Record<string, TestRow> = {};
    if (testIds.length) {
      const { data: tRows } = await sb.from('reading_tests').select('id,title,slug').in('id', testIds).limit(2000);
      (tRows ?? []).forEach((t: any) => (testsById[t.id] = t));
    }

    // ---- Optional user stats
    let userStats: UserStatsRow | null = null;
    if (userId) {
      const { data: us } = await sb.from('reading_user_stats').select('user_id,streak_days,total_practices').eq('user_id', userId).maybeSingle();
      userStats = (us as any) || null;
    }

    // ---- Compute KPIs
    const last10 = attempts.slice(0, 10);
    const last10Scores = last10.map(normScore).filter((n): n is number => n != null);
    const accuracy10 = last10Scores.length ? avg(last10Scores) : null;

    const prev10 = attempts.slice(10, 20);
    const prev10Scores = prev10.map(normScore).filter((n): n is number => n != null);
    const accuracyPrev10 = prev10Scores.length ? avg(prev10Scores) : null;
    const accuracyDelta10 =
      typeof accuracy10 === 'number' && typeof accuracyPrev10 === 'number' ? accuracy10 - accuracyPrev10 : null;

    const allScores = attempts.map(normScore).filter((n): n is number => n != null);
    const bandEstimate = allScores.length ? toBand(avg(allScores)) : null;
    const bandStd = allScores.length > 1 ? stddev(allScores.map(toBand)) : null;

    // average seconds per question over last 20 with Q data
    const timeDenoms = latest
      .map((a) => {
        const n = typeof a.total_questions === 'number' && a.total_questions > 0 ? a.total_questions : null;
        const dur = typeof a.duration_sec === 'number' ? a.duration_sec : null;
        return { dur, n };
      })
      .filter((x) => x.dur != null && x.n != null);
    const avgSecPerQ =
      timeDenoms.length ? Math.round(avg(timeDenoms.map((x) => (x.dur as number) / (x.n as number)))) : null;

    const streakDays = userStats?.streak_days ?? null;
    const totalPractices = userStats?.total_practices ?? attempts.length;

    // ---- Trend (last 20)
    const trend = latest.map((a) => ({ date: a.created_at, score: normScore(a) ?? 0 }));

    // ---- By type (heatmap) from attempts_reading + reading_questions
    const byTypeAgg: Record<string, { correct: number; total: number }> = {};
    for (const d of details) {
      const t = (questions[d.question_id] || 'unknown')?.toLowerCase();
      if (!byTypeAgg[t]) byTypeAgg[t] = { correct: 0, total: 0 };
      byTypeAgg[t].total += 1;
      if (d.correct) byTypeAgg[t].correct += 1;
    }
    const byType = Object.entries(byTypeAgg)
      .map(([type, v]) => ({
        type,
        accuracy: v.total > 0 ? v.correct / v.total : 0,
        attempts: v.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // weakest first

    // ---- Time vs score (from attempts)
    const timeVsScore = latest
      .map((a) => ({
        id: a.id,
        minutes: Math.max(1, Math.round(((a.duration_sec ?? 0) / 60) * 10) / 10),
        score: normScore(a) ?? 0,
      }))
      .filter((x) => Number.isFinite(x.minutes) && Number.isFinite(x.score));

    // ---- Recent table (last 7)
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
        types: [], // could be filled from details if you want
        hrefReview,
      };
    });

    // ---- Weak areas (top 2 weakest)
    const weakAreas =
      byType.length >= 2
        ? byType.slice(0, 2).map((w) => ({
            label: w.type,
            reason: `Accuracy ${Math.round(w.accuracy * 100)}% over ${w.attempts} Qs`,
            href: `/reading?type=${encodeURIComponent(w.type)}`,
          }))
        : [];

    // ---- Response
    return res.status(200).json({
      kpis: {
        bandEstimate,
        bandStd,
        accuracy10,
        accuracyDelta10,
        avgSecPerQ,
        streakDays,
        totalPractices,
      },
      trend,
      byType,
      timeVsScore,
      weakAreas,
      recent,
      saved: [], // integrate when you add a "saved" table
      queued: [], // integrate with a "queue" table
    });
  } catch (e: any) {
    return res.status(200).json({
      kpis: { bandEstimate: null, bandStd: null, accuracy10: null, accuracyDelta10: null, avgSecPerQ: null, streakDays: null, totalPractices: null },
      trend: [],
      byType: [],
      timeVsScore: [],
      weakAreas: [],
      recent: [],
      saved: [],
      queued: [],
      note: e?.message || 'Unhandled',
    });
  }
}

// ---- helpers
function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}
function stddev(xs: number[]) {
  const m = avg(xs);
  const v = avg(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}
function toBand(p: number) {
  // Simple mapping: 0..1 -> 4.0..9.0 (tweak if you have a calibrated curve)
  return 4 + p * 5;
}
