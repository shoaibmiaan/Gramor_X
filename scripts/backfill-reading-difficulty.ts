import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type QuestionRow = {
  id: string;
  kind: string;
  order_no: number | null;
};

type Difficulty = 'easy' | 'med' | 'hard';

function pickDifficulty(question: QuestionRow): Difficulty {
  const order = Number.isFinite(question.order_no) ? Number(question.order_no) : null;
  const kind = question.kind?.toLowerCase?.() ?? '';

  if (kind === 'matching') return 'hard';
  if (kind === 'short') return 'hard';

  if (order != null) {
    if (order <= 5) return 'easy';
    if (order >= 20) return 'hard';
  }

  return kind === 'tfng' ? 'med' : 'med';
}

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    // eslint-disable-next-line no-await-in-loop
    await fn(slice);
  }
}

async function main() {
  console.log('Fetching reading questions…');
  const { data, error } = await supabase
    .from('reading_questions')
    .select('id, kind, order_no');

  if (error) {
    console.error('Failed to load reading questions:', error.message);
    process.exit(1);
  }

  const questions = (data as QuestionRow[]) || [];
  if (!questions.length) {
    console.log('No questions found. Nothing to backfill.');
    return;
  }

  const payload = questions.map((row) => ({
    question_id: row.id,
    difficulty: pickDifficulty(row),
  }));

  console.log(`Upserting difficulty for ${payload.length} questions…`);
  await chunked(payload, 100, async (chunk) => {
    const { error: upsertError } = await supabase
      .from('reading_items')
      .upsert(chunk, { onConflict: 'question_id' });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  });

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
