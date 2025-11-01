import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { env } from '@/lib/env';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient, supabaseService } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import type { WritingTaskType } from '@/lib/writing/schemas';

type PromptRow = Database['public']['Tables']['writing_prompts']['Row'];

type PromptCard = {
  id: string;
  slug: string;
  topic: string;
  taskType: WritingTaskType;
  difficulty: number;
  outlineSummary: string | null;
};

type OkResponse = { ok: true; prompts: PromptCard[] };
type ErrorResponse = { ok: false; error: string };

const routeName = 'api/writing/prompts';

const generatorSchema = z.object({
  taskType: z.union([z.literal('task1'), z.literal('task2')]),
  difficulty: z
    .number({ invalid_type_error: 'Difficulty must be a number' })
    .int()
    .min(1)
    .max(5),
  count: z
    .number({ invalid_type_error: 'Count must be a number' })
    .int()
    .refine((value) => value === 1 || value === 3 || value === 5, 'Count must be 1, 3, or 5'),
  theme: z
    .string()
    .trim()
    .max(120)
    .optional(),
  style: z
    .string()
    .trim()
    .max(280)
    .optional(),
});

const clampDifficulty = (value: number) => {
  if (Number.isNaN(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
};

const mapPromptRow = (row: PromptRow): PromptCard => {
  const outline = (row.outline_json ?? null) as { summary?: unknown } | null;
  const summary = typeof outline?.summary === 'string' ? outline.summary : null;
  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    taskType: row.task_type as WritingTaskType,
    difficulty: row.difficulty ?? 2,
    outlineSummary: summary,
  };
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);

const buildSlug = (value: string, seed: string) => {
  const base = slugify(value) || 'prompt';
  const suffix = seed.slice(0, 8);
  return `${base}-${suffix}`;
};

const extractJson = (raw: string) => {
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Invalid JSON payload from model');
  }
  const slice = cleaned.slice(start, end + 1);
  return JSON.parse(slice) as unknown;
};

type GeneratedPromptPayload = {
  prompt: string;
  summary?: string;
  difficulty?: number;
};

const parseGeneratedPrompts = (payload: unknown): GeneratedPromptPayload[] => {
  if (!payload || typeof payload !== 'object') return [];
  const promptsValue =
    Array.isArray((payload as { prompts?: unknown }).prompts)
      ? ((payload as { prompts?: unknown }).prompts as unknown[])
      : Array.isArray(payload)
      ? (payload as unknown[])
      : [];
  return promptsValue
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const promptText = String((item as { prompt?: unknown; topic?: unknown }).prompt ?? (item as { topic?: unknown }).topic ?? '');
      const summaryText = (item as { summary?: unknown; outline?: unknown }).summary ?? (item as { outline?: unknown }).outline;
      const difficultyValue = Number((item as { difficulty?: unknown }).difficulty);
      if (!promptText.trim()) return null;
      return {
        prompt: promptText.trim(),
        summary: typeof summaryText === 'string' ? summaryText.trim() : undefined,
        difficulty: Number.isFinite(difficultyValue) ? difficultyValue : undefined,
      };
    })
    .filter((item): item is GeneratedPromptPayload => Boolean(item));
};

const generateWithGemini = async (
  input: z.infer<typeof generatorSchema>,
  logger: ReturnType<typeof createRequestLogger>,
) => {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('AI configuration missing');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const difficultyLabel = `${input.difficulty}/5`;
  const descriptors = [
    `Generate ${input.count} distinct IELTS ${input.taskType === 'task1' ? 'Task 1 (Academic)' : 'Task 2'} writing prompts.`,
    `Each prompt should align with difficulty ${difficultyLabel} where 1 is easiest and 5 is most challenging.`,
    'Provide realistic, exam-ready wording suitable for use in a timed writing attempt.',
    'For each prompt also supply a one-sentence summary to highlight the focus.',
    'Respond in JSON format using: { "prompts": [{ "prompt": string, "summary": string, "difficulty": number }] }.',
    'Do not include any additional commentary or markdown.',
  ];

  if (input.theme) {
    descriptors.push(`Ensure the prompts relate to the theme: ${input.theme}.`);
  }
  if (input.style) {
    descriptors.push(`Incorporate these style hints where relevant: ${input.style}.`);
  }

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: descriptors.join('\n'),
          },
        ],
      },
    ],
  });

  const raw = result.response.text().trim();
  logger.debug('model response received', { rawLength: raw.length });
  const parsed = extractJson(raw);
  return parseGeneratedPrompts(parsed).slice(0, input.count);
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse<OkResponse | ErrorResponse>) => {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
  const logger = createRequestLogger(routeName, { requestId });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Not signed in' });
  }

  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = (() => {
    const parsed = Number(limitParam);
    if (!Number.isFinite(parsed)) return 24;
    return Math.max(1, Math.min(48, Math.floor(parsed)));
  })();

  const { data, error } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, outline_json')
    .order('difficulty', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('failed to load prompts', { error: error.message });
    return res.status(500).json({ ok: false, error: 'Failed to load prompts' });
  }

  const prompts = (data ?? []).map(mapPromptRow);
  return res.status(200).json({ ok: true, prompts });
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse<OkResponse | ErrorResponse>) => {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
  const logger = createRequestLogger(routeName, { requestId });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('unauthenticated prompt generation attempt');
    return res.status(401).json({ ok: false, error: 'Not signed in' });
  }

  let rawBody: unknown = req.body;
  if (typeof req.body === 'string') {
    try {
      rawBody = JSON.parse(req.body);
    } catch (parseError) {
      logger.warn('invalid json body', { error: parseError instanceof Error ? parseError.message : parseError });
      return res.status(400).json({ ok: false, error: 'Invalid request payload' });
    }
  }
  const bodyRecord = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};
  const parsed = generatorSchema.safeParse({
    ...bodyRecord,
    difficulty: Number(bodyRecord?.difficulty),
    count: Number(bodyRecord?.count),
  });

  if (!parsed.success) {
    logger.warn('invalid generation payload', { issues: parsed.error.flatten() });
    return res.status(400).json({ ok: false, error: 'Invalid generation request' });
  }

  try {
    const generated = await generateWithGemini(parsed.data, logger.child({ userId: user.id }));

    if (generated.length === 0) {
      logger.warn('model returned no prompts');
      return res.status(502).json({ ok: false, error: 'AI did not return any prompts' });
    }

    const seed = randomUUID().replace(/-/g, '');
    const rows = generated.map((item, index) => ({
      slug: buildSlug(item.prompt, seed.slice(index * 6)),
      topic: item.prompt,
      task_type: parsed.data.taskType,
      difficulty: clampDifficulty(item.difficulty ?? parsed.data.difficulty),
      outline_json: item.summary ? { summary: item.summary } : null,
    }));

    const slugs = rows.map((row) => row.slug);

    const service = supabaseService<Database>();
    const { data, error } = await service
      .from('writing_prompts')
      .insert(rows)
      .select('id, slug, topic, task_type, difficulty, outline_json');

    if (error) {
      logger.error('failed to persist generated prompts', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Unable to save generated prompts' });
    }

    const ordered = (data ?? []).sort(
      (a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug),
    );
    const prompts = ordered.map(mapPromptRow);
    logger.info('generated prompts saved', { count: prompts.length, userId: user.id });
    return res.status(200).json({ ok: true, prompts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Prompt generation failed';
    logger.error('generation failed', { error: message, userId: user.id });
    return res.status(502).json({ ok: false, error: message });
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkResponse | ErrorResponse>,
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
