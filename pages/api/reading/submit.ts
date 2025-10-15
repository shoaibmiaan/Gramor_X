import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { trackor } from '@/lib/analytics/trackor.server';
import { gradeReadingAttempt } from '@/lib/reading/grade';

type Body = {
  slug?: string;
  passageSlug?: string;
  answers?: Record<string, unknown>;
  durationMs?: number | null;
  meta?: Record<string, unknown>;
};

function extractRationale(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;
  const candidate = obj.rationale ?? obj.explanation ?? obj.feedback ?? null;
  return typeof candidate === 'string' ? candidate : null;
}

function coerceDuration(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.round(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const { slug, passageSlug, answers, durationMs, meta }: Body = req.body ?? {};
  const testSlug = (passageSlug || slug || '').trim();

  if (!testSlug) {
    return res.status(400).json({ error: 'Missing passage slug' });
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers payload must be an object' });
  }

  const { data: questionRows, error: qErr } = await supabaseAdmin
    .from('reading_questions')
    .select('id,order_no,kind,prompt,answers,options,points,rationale')
    .eq('passage_slug', testSlug)
    .order('order_no', { ascending: true });

  if (qErr) {
    return res.status(500).json({ error: qErr.message || 'Failed to load questions' });
  }

  if (!questionRows || questionRows.length === 0) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const normalizedQuestions = (questionRows ?? []).map((row: any) => {
    const options = row.options;
    const rationale = extractRationale(row.rationale ?? options);
    return {
      id: String(row.id),
      order_no:
        typeof row.order_no === 'number'
          ? row.order_no
          : Number.isFinite(Number(row.order_no))
          ? Number(row.order_no)
          : 0,
      kind: String(row.kind ?? 'short') as any,
      prompt: String(row.prompt ?? ''),
      answers: row.answers,
      options,
      points:
        typeof row.points === 'number' && !Number.isNaN(row.points)
          ? row.points
          : null,
      rationale,
    };
  });

  const result = gradeReadingAttempt(normalizedQuestions, answers);
  const attemptId = randomUUID();
  const duration = coerceDuration(durationMs);
  const summary = {
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    totalPoints: result.totalPoints,
    earnedPoints: result.earnedPoints,
    percentage: result.percentage,
  };

  const insertPayload = {
    id: attemptId,
    user_id: user.id,
    passage_slug: testSlug,
    correct_count: result.correctCount,
    total_questions: result.totalQuestions,
    total_points: result.totalPoints,
    earned_points: result.earnedPoints,
    band: result.band,
    duration_ms: duration,
    answers_json: answers,
    result_json: {
      summary,
      items: result.items,
      breakdown: result.breakdown,
      meta: meta ?? null,
    },
    meta: meta ?? null,
  };

  const { error: insertError } = await supabaseAdmin
    .from('reading_responses')
    .insert(insertPayload);

  if (insertError) {
    return res.status(500).json({ error: insertError.message || 'Failed to save attempt' });
  }

  await trackor.log('reading_attempt_submitted', {
    attempt_id: attemptId,
    user_id: user.id,
    passage_slug: testSlug,
    correct_count: result.correctCount,
    total_questions: result.totalQuestions,
    total_points: result.totalPoints,
    earned_points: result.earnedPoints,
    band: result.band,
    duration_ms: duration,
    percentage: result.percentage,
  });

  try {
    await trackor.log('grade_submitted', {
      attempt_id: attemptId,
      user_id: user.id,
      passage_slug: testSlug,
      correct_count: result.correctCount,
      total_questions: result.totalQuestions,
      earned_points: result.earnedPoints,
      band: result.band,
      percentage: result.percentage,
      assessment: 'reading',
    });
  } catch (error) {
    console.warn('[reading.submit] analytics failed', error);
  }

  return res.status(200).json({
    attemptId,
    score: { correct: result.correctCount, total: result.totalQuestions },
    band: result.band,
    breakdown: result.breakdown,
  });
}
