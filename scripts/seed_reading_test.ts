import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type RawQuestion = {
  id: string;
  type: string;
  prompt: string;
  answer?: any;
  acceptable?: string[];
  options?: string[];
};

type RawPassage = {
  id: string;
  title: string;
  text: string;
  questions: RawQuestion[];
};

type RawTest = {
  id: string;
  title?: string;
  durationSec?: number;
  passages: RawPassage[];
};

function normaliseChoices(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((opt) => (typeof opt === 'string' ? opt.trim() : String(opt ?? ''))).filter(Boolean);
}

function normaliseAnswer(answer: unknown): string | string[] | null {
  if (answer == null) return null;
  if (Array.isArray(answer)) {
    return answer
      .map((val) => (typeof val === 'string' ? val.trim() : String(val)))
      .filter((val) => val.length > 0);
  }
  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    if (!trimmed) return null;
    if (trimmed.includes('/') || trimmed.includes('|')) {
      return trimmed
        .split(/[\/]|\|/)
        .map((segment) => segment.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    }
    return trimmed;
  }
  return String(answer);
}

function computeWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function mapQuestion(raw: RawQuestion, order: number) {
  const basePrompt = raw.prompt?.trim?.() ?? '';
  const lowerType = raw.type?.toLowerCase?.() ?? 'mcq';

  if (!basePrompt) {
    throw new Error(`Question ${raw.id} is missing a prompt.`);
  }

  if (lowerType === 'tfng') {
    return {
      order_no: order,
      kind: 'tfng',
      prompt: basePrompt,
      options: { choices: ['True', 'False', 'Not Given'] },
      answers: normaliseAnswer(raw.answer),
    };
  }

  if (lowerType === 'yynn' || lowerType === 'ynng') {
    return {
      order_no: order,
      kind: 'tfng',
      prompt: basePrompt,
      options: { choices: ['Yes', 'No', 'Not Given'], variant: 'ynng' },
      answers: normaliseAnswer(raw.answer),
    };
  }

  if (lowerType === 'gap' || lowerType === 'fill' || lowerType === 'short') {
    const acceptable = Array.isArray(raw.acceptable)
      ? raw.acceptable.map((val) => (typeof val === 'string' ? val.trim() : String(val))).filter(Boolean)
      : null;
    const answers = normaliseAnswer(raw.answer);
    const payload: Record<string, unknown> = { variant: 'gap' };
    if (acceptable && acceptable.length > 0) payload.acceptable = acceptable;

    return {
      order_no: order,
      kind: 'short',
      prompt: basePrompt,
      options: payload,
      answers: acceptable && acceptable.length > 0 ? acceptable : answers,
    };
  }

  if (lowerType === 'match') {
    const choices = normaliseChoices(raw.options);
    return {
      order_no: order,
      kind: 'matching',
      prompt: basePrompt,
      options: { choices, variant: 'matching-single' },
      answers: normaliseAnswer(raw.answer),
    };
  }

  return {
    order_no: order,
    kind: 'mcq',
    prompt: basePrompt,
    options: { choices: normaliseChoices(raw.options) },
    answers: normaliseAnswer(raw.answer),
  };
}

async function seedPassage(test: RawTest, passage: RawPassage, index: number) {
  const slug = `${test.id}-${passage.id}`.toLowerCase();
  const title = `${test.title ?? 'Reading Test'} – Passage ${index + 1}`;
  const durationMinutes = test.durationSec ? Math.round(test.durationSec / 60 / test.passages.length) : 20;
  const words = computeWordCount(passage.text || '');

  console.log(`\n→ Seeding ${slug}`);

  const { error: deleteErr } = await supabase.from('reading_questions').delete().eq('passage_slug', slug);
  if (deleteErr) {
    throw new Error(`Failed to clear existing questions for ${slug}: ${deleteErr.message}`);
  }

  const { data: upserted, error: upsertErr } = await supabase
    .from('reading_tests')
    .upsert(
      {
        slug,
        title,
        summary: passage.title ?? null,
        passage_text: passage.text,
        difficulty: 'Academic',
        words,
        duration_minutes: durationMinutes,
        published: true,
      },
      { onConflict: 'slug' }
    )
    .select('id, slug')
    .single();

  if (upsertErr) {
    throw new Error(`Failed to upsert reading_tests row for ${slug}: ${upsertErr.message}`);
  }

  const mappedQuestions = passage.questions.map((raw, idx) => {
    const base = mapQuestion(raw, idx + 1);
    const currentOptions = base.options && typeof base.options === 'object' ? base.options : {};
    const mergedOptions = {
      ...currentOptions,
      sourceId: raw.id ?? null,
    };

    return {
      passage_slug: slug,
      ...base,
      options: mergedOptions,
      points: 1,
    };
  });

  const { error: insertErr } = await supabase.from('reading_questions').insert(mappedQuestions);
  if (insertErr) {
    throw new Error(`Failed to insert questions for ${slug}: ${insertErr.message}`);
  }

  console.log(`   ✓ Inserted ${mappedQuestions.length} questions (test id: ${upserted?.id ?? 'unknown'})`);
}

async function main() {
  const fileArg = process.argv[2] ?? 'data/reading/reading-test-1.json';
  const target = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(target)) {
    console.error(`Unable to find JSON at ${target}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(target, 'utf8')) as RawTest;

  if (!raw?.passages?.length) {
    throw new Error('Input JSON does not contain any passages.');
  }

  console.log(`Seeding Reading test "${raw.id}" with ${raw.passages.length} passages…`);

  for (let i = 0; i < raw.passages.length; i += 1) {
    await seedPassage(raw, raw.passages[i], i);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
