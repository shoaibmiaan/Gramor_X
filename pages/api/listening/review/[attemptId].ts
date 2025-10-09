import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const attemptId = String(req.query.attemptId);

  const { data: attempt, error: e1 } = await supabaseAdmin
    .from('listening_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (e1 || !attempt) return res.status(404).json({ error: e1?.message || 'Attempt not found' });

  const [{ data: answers, error: e2 }, { data: questions, error: e3 }, { data: sections, error: e4 }, { data: test, error: e5 }] =
    await Promise.all([
      supabaseAdmin
        .from('listening_user_answers')
        .select('qno,answer,is_correct')
        .eq('attempt_id', attemptId)
        .order('qno'),
      supabaseAdmin
        .from('listening_questions')
        .select('qno,type,prompt,options,match_left,match_right,answer_key,section_order')
        .eq('test_slug', attempt.test_slug)
        .order('qno'),
      supabaseAdmin
        .from('listening_sections')
        .select('order_no,title,transcript,start_ms,end_ms')
        .eq('test_slug', attempt.test_slug)
        .order('order_no'),
      supabaseAdmin
        .from('listening_tests')
        .select('slug,title')
        .eq('slug', attempt.test_slug)
        .maybeSingle(),
    ]);

  if (e2 || e3 || e4 || e5)
    return res.status(500).json({ error: e2?.message || e3?.message || e4?.message || e5?.message });

  res.json({
    attempt: {
      id: attempt.id,
      test_slug: attempt.test_slug,
      score: attempt.score,
      band: attempt.band,
      section_scores: attempt.section_scores,
      submitted_at: attempt.submitted_at,
      meta: attempt.meta,
    },
    test: test ? { slug: test.slug, title: test.title } : null,
    answers: answers ?? [],
    questions: questions ?? [],
    sections: sections ?? [],
  });
}
