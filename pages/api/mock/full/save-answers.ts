// pages/api/mock/full/save-answers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

type ModuleType = 'listening' | 'reading' | 'writing' | 'speaking';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  const {
    fullAttemptId,
    module,
    questionId,
    answer,
    // for modules where answers are multiple (e.g. list of answers), you can extend this
  }: {
    fullAttemptId: string;
    module: ModuleType;
    questionId: string;
    answer: string;
  } = req.body || {};

  if (!fullAttemptId || !module || !questionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1) Ensure this full attempt belongs to user & is in_progress
    const { data: fullAttempt, error: fetchError } = await supabase
      .from('mock_full_attempts')
      .select('*')
      .eq('id', fullAttemptId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !fullAttempt) {
      return res.status(404).json({ error: 'Full attempt not found' });
    }

    if (fullAttempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Attempt not in progress' });
    }

    // 2) Route by module – example shows Listening/Reading pattern
    let tableName: string;
    let attemptIdColumn: string;

    switch (module) {
      case 'listening':
        tableName = 'attempts_listening_answers';
        attemptIdColumn = 'attempt_id';
        break;
      case 'reading':
        tableName = 'attempts_reading_answers';
        attemptIdColumn = 'attempt_id';
        break;
      case 'writing':
        tableName = 'attempts_writing_answers';
        attemptIdColumn = 'attempt_id';
        break;
      case 'speaking':
        tableName = 'attempts_speaking_answers';
        attemptIdColumn = 'attempt_id';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported module' });
    }

    // TODO: you need the module-specific attempt_id here
    // for simplicity, assume you already stored it on mock_full_attempts
    const moduleAttemptId = fullAttempt[`${module}_attempt_id`];
    if (!moduleAttemptId) {
      return res.status(400).json({ error: `No ${module} attempt linked to this full attempt` });
    }

    // 3) Upsert answer
    const { error: upsertError } = await supabase
      .from(tableName)
      .upsert(
        {
          [attemptIdColumn]: moduleAttemptId,
          question_id: questionId,
          answer_text: answer,
        },
        {
          onConflict: `${attemptIdColumn},question_id`,
        }
      );

    if (upsertError) {
      console.error(upsertError);
      return res.status(500).json({ error: 'Failed to save answer' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
