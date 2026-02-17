import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { rawToBand } from '@/lib/listening/band';
import { scoreAll } from '@/lib/listening/score';
import { trackor } from '@/lib/analytics/trackor.server';
import { normLetter, normText, sortPairs } from '@/lib/listening/normalize';

type Body = { test_slug: string; answers: { qno:number; answer:any }[]; meta?: any };

async function getUserId(req: NextApiRequest, res: NextApiResponse) {
  // Parse and verify the Supabase auth session from cookies
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthenticated');
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  let userId: string;
  try {
    userId = await getUserId(req, res);
  } catch {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const { test_slug, answers, meta }: Body = req.body || {};
  if (!test_slug || !Array.isArray(answers)) return res.status(400).json({ error: 'Invalid payload' });

  // Pull questions for deterministic scoring on server
  const { data: questions, error: qErr } = await supabaseAdmin
    .from('listening_questions')
    .select('qno,type,answer_key')
    .eq('test_slug', test_slug)
    .order('qno');

  if (qErr) return res.status(500).json({ error: qErr.message });
  if (!questions || questions.length === 0) return res.status(404).json({ error: 'Test not found' });

  // Score
  const { total, perSection } = scoreAll(
    (questions ?? []).map(q => ({ qno:q.qno, type:q.type as any, answer_key:q.answer_key as any })),
    answers
  );
  const band = rawToBand(total);

  const submittedAt = new Date().toISOString();

  // Persist attempt
  const { data: attemptRow, error: aErr } = await supabaseAdmin
    .from('listening_attempts')
    .insert({
      user_id: userId,
      test_slug,
      submitted_at: submittedAt,
      score: total,
      band,
      section_scores: perSection,
      meta: meta ?? {},
    })
    .select('id')
    .single();

  if (aErr || !attemptRow) return res.status(500).json({ error: aErr?.message || 'Insert failed' });

  // Persist answers (normalized correctness)
  const answerByQno = new Map((questions ?? []).map(q => [q.qno, q] as const));
  const userAnswers = answers.map(a => {
    const q = answerByQno.get(a.qno);
    let isCorrect = false;
    if (q) {
      if (q.type === 'mcq') isCorrect = normLetter(a.answer) === normLetter(q.answer_key?.value);
      else if (q.type === 'gap') isCorrect = normText(a.answer) === normText(q.answer_key?.text);
      else if (q.type === 'match') {
        const want = JSON.stringify(sortPairs(q.answer_key?.pairs ?? []));
        const got = JSON.stringify(sortPairs(Array.isArray(a.answer) ? a.answer : []));
        isCorrect = want === got && (q.answer_key?.pairs ?? []).length > 0;
      }
    }
    return {
      attempt_id: attemptRow.id,
      qno: a.qno,
      answer: a.answer,
      is_correct: isCorrect,
    };
  });

  const { error: uaErr } = await supabaseAdmin
    .from('listening_user_answers')
    .insert(userAnswers);

  if (uaErr) return res.status(500).json({ error: uaErr.message });

  await trackor.log('listening_attempt_submitted', {
    attempt_id: attemptRow.id,
    user_id: userId,
    test_slug,
    score: total,
    band,
    section_scores: perSection,
    question_count: questions.length,
    submitted_at: submittedAt,
    meta: meta ?? {},
  });

  res.status(200).json({ attemptId: attemptRow.id, score: total, band, sectionScores: perSection });
}
