// pages/api/listening/admin/upsert-question.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { ListeningQuestionTypeSchema } from '@/lib/listening/questionTypes.schema';

const BodySchema = z.object({
  id: z.string().uuid().optional(),
  testId: z.string().uuid(),
  sectionNumber: z.number().int().positive(),
  questionNumber: z.number().int().positive(),
  prompt: z.string().min(1),
  questionType: ListeningQuestionTypeSchema, // <— typed & validated
  correctAnswer: z.string().min(1).optional(),
  options: z.array(z.string()).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const {
    id,
    testId,
    sectionNumber,
    questionNumber,
    prompt,
    questionType,
    correctAnswer,
    options,
  } = parsed.data;

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // UPSERT
  const payload = {
    test_id: testId,
    section_number: sectionNumber,
    question_number: questionNumber,
    prompt,
    question_type: questionType, // <— safe string like "mcq"
    correct_answer: correctAnswer ?? null,
    options: options ?? null,
  };

  if (id) {
    const { error } = await supabase
      .from('listening_questions')
      .update(payload)
      .eq('id', id)
      .eq('test_id', testId);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase
      .from('listening_questions')
      .insert(payload);
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
