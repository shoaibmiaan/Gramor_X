import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { env } from '@/lib/env';
import type { WritingTaskType } from '@/lib/writing/schemas';
import type { Database } from '@/types/supabase';
import type { PromptCard } from '@/types/writing-dashboard';

type GeneratedPrompt = Readonly<{
  title: string;
  summary: string;
  outline: string[];
  task: WritingTaskType;
  difficulty: number;
}>;

type ResponseBody =
  | { ok: true; prompts: PromptCard[] }
  | { ok: false; error: string };

const GenerateSchema = z.object({
  count: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  task: z.enum(['task1', 'task2']),
  difficulty: z.number().int().min(1).max(5),
  theme: z.string().trim().max(120).optional(),
  style: z.string().trim().max(240).optional(),
});

const MODEL_TIMEOUT_MS = 12_000;

type Provider = 'groq' | 'openai';

const difficultyCopy = (value: number) => {
  if (value <= 1) return 'Beginner';
  if (value === 2) return 'Intermediate';
  if (value === 3) return 'Upper-intermediate';
  if (value === 4) return 'Advanced';
  return 'Band 8+';
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'prompt';

const uniqueSlug = (input: string) => `${slugify(input)}-${Math.random().toString(36).slice(2, 6)}`;

const providersInOrder = (): Provider[] => {
  const preferred = (env.GX_AI_PROVIDER || '').toLowerCase();
  const list: Provider[] = [];
  if (preferred === 'groq' && env.GROQ_API_KEY) list.push('groq');
  if (preferred === 'openai' && env.OPENAI_API_KEY) list.push('openai');
  if (!list.includes('groq') && env.GROQ_API_KEY) list.push('groq');
  if (!list.includes('openai') && env.OPENAI_API_KEY) list.push('openai');
  return list;
};

const buildSystemPrompt = (task: WritingTaskType, difficulty: number) => {
  const taskLabel = task === 'task1' ? 'Task 1 (academic data report)' : 'Task 2 (essay)';
  return `You are an IELTS writing coach creating fresh practice prompts. Respond with strictly valid JSON for a key "prompts" containing an array of prompt objects. Each prompt must include title, summary, and outline (array of 3 bullet points). Prompts must align with ${taskLabel} at a ${difficultyCopy(difficulty)} difficulty.`;
};

const buildUserPrompt = (
  count: number,
  task: WritingTaskType,
  difficulty: number,
  theme?: string,
  style?: string,
) => {
  const lines = [
    `Generate exactly ${count} unique IELTS writing prompts.`,
    `Task: ${task === 'task1' ? 'Task 1 (academic report)' : 'Task 2 (essay response)'} with difficulty ${difficulty} (${difficultyCopy(difficulty)}).`,
    'Return JSON in the shape {"prompts":[{"title":"...","summary":"...","outline":["...","...","..."]}]} without any extra text.',
  ];
  if (theme) {
    lines.push(`Theme focus: ${theme}.`);
  }
  if (style) {
    lines.push(`Style hints: ${style}.`);
  }
  if (task === 'task1') {
    lines.push('Include references to charts, graphs, maps, or processes so the learner can analyse visuals.');
  } else {
    lines.push('Encourage nuanced argumentation suitable for IELTS Task 2 essays.');
  }
  return lines.join('\n');
};

const parseModelPayload = (content: unknown): GeneratedPrompt[] => {
  if (typeof content !== 'string' || content.trim().length === 0) return [];
  const trimmed = content.trim();
  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  const candidate = direct ?? tryParse(trimmed.replace(/^[^{\[]+/, '').replace(/[^}\]]+$/, ''));
  const data: any = Array.isArray(candidate?.prompts) ? candidate.prompts : candidate;
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      const summary = typeof item?.summary === 'string' ? item.summary.trim() : '';
      const outlineSource = Array.isArray(item?.outline) ? item.outline : [];
      const outline = outlineSource
        .map((entry: unknown) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry: string) => entry.length > 0)
        .slice(0, 4);
      if (!title) return null;
      return {
        title,
        summary,
        outline,
        task: (item?.task === 'task1' || item?.task === 'task2' ? item.task : undefined) ?? 'task2',
        difficulty: Number.isFinite(Number(item?.difficulty)) ? Number(item.difficulty) : undefined,
      } as Partial<GeneratedPrompt>;
    })
    .filter(Boolean)
    .map((item) => ({
      title: item!.title,
      summary: item!.summary || 'Focus on the core trend before exploring supporting details.',
      outline: (item!.outline as string[]) ?? [],
      task: (item!.task as WritingTaskType) ?? 'task2',
      difficulty: Number.isFinite(item!.difficulty) ? Number(item!.difficulty) : 3,
    }));
};

async function generateWithProvider(
  provider: Provider,
  body: { count: number; task: WritingTaskType; difficulty: number; theme?: string; style?: string },
  signal: AbortSignal,
): Promise<GeneratedPrompt[] | null> {
  const system = buildSystemPrompt(body.task, body.difficulty);
  const user = buildUserPrompt(body.count, body.task, body.difficulty, body.theme, body.style);
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  if (provider === 'groq' && env.GROQ_API_KEY) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 900,
        messages,
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}`);
    }
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    const parsed = parseModelPayload(content);
    return parsed.length > 0 ? parsed : null;
  }

  if (provider === 'openai' && env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 900,
        messages,
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    const parsed = parseModelPayload(content);
    return parsed.length > 0 ? parsed : null;
  }

  return null;
}

const fallbackThemes: Record<WritingTaskType, string[]> = {
  task1: [
    'international student enrolment',
    'renewable energy sources',
    'daily water consumption',
    'commuter transport choices',
    'household spending categories',
  ],
  task2: [
    'urban development',
    'technology in education',
    'environmental sustainability',
    'work-life balance',
    'public health initiatives',
  ],
};

const fallbackOutlines: Record<WritingTaskType, string[]> = {
  task1: [
    'Provide a concise overview of the most significant trend or shift.',
    'Compare the highest and lowest figures and highlight notable similarities.',
    'Explain any anomalies or periods of rapid change that stand out.',
  ],
  task2: [
    'Introduce the issue and present a clear position.',
    'Discuss one compelling argument with evidence or examples.',
    'Balance the discussion with an opposing view or limitation before concluding.',
  ],
};

const buildFallbackPrompts = (
  count: number,
  task: WritingTaskType,
  difficulty: number,
  theme?: string,
  style?: string,
): GeneratedPrompt[] => {
  const pool = fallbackThemes[task];
  const summaryBase = style && style.length > 0 ? style : difficultyCopy(difficulty);
  const prompts: GeneratedPrompt[] = [];
  for (let i = 0; i < count; i += 1) {
    const themeVariant = pool[(i + pool.length) % pool.length];
    const focus = theme || themeVariant;
    const title =
      task === 'task1'
        ? `The charts illustrate trends in ${focus}. Summarise the main features and compare where relevant.`
        : `Some people believe ${focus} benefits society, while others worry about its drawbacks. Discuss both views and give your opinion.`;
    prompts.push({
      title,
      summary: `Focus on ${summaryBase.toLowerCase()} ideas linked to ${focus}.`,
      outline: fallbackOutlines[task],
      task,
      difficulty,
    });
  }
  return prompts;
};

const mapInsertedRow = (
  row: Database['public']['Tables']['writing_prompts']['Row'],
  summary: string | null,
): PromptCard => {
  const outline = (row.outline_json ?? null) as { summary?: string | null; items?: unknown } | null;
  const outlineItems = Array.isArray(outline?.items)
    ? (outline?.items as unknown[]).filter((entry): entry is string => typeof entry === 'string')
    : null;

  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    taskType: row.task_type as WritingTaskType,
    difficulty: row.difficulty ?? 2,
    outlineSummary: summary,
    outlineItems,
    createdAt: row.created_at ?? null,
    source: 'generated',
  };
};

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  const body = parsed.data;
  let generated: GeneratedPrompt[] = [];
  const providers = providersInOrder();

  if (providers.length > 0) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    try {
      for (const provider of providers) {
        try {
          const result = await generateWithProvider(provider, body, controller.signal);
          if (result && result.length === body.count) {
            generated = result.map((item) => ({
              ...item,
              task: body.task,
              difficulty: body.difficulty,
            }));
            break;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('[api/ai/writing/prompts] provider failed', provider, error);
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (generated.length === 0) {
    generated = buildFallbackPrompts(body.count, body.task, body.difficulty, body.theme, body.style);
  }

  const now = new Date().toISOString();
  const rows = generated.map((prompt) => ({
    task_type: body.task,
    slug: uniqueSlug(prompt.title),
    topic: prompt.title.trim().slice(0, 180),
    difficulty: body.difficulty,
    outline_json: {
      summary: prompt.summary.slice(0, 180) || null,
      items: prompt.outline,
    },
    created_at: now,
  }));

  const { data, error } = await supabaseAdmin
    .from('writing_prompts')
    .insert(rows)
    .select('id, slug, topic, task_type, difficulty, outline_json, created_at');

  if (error || !data) {
    return res.status(500).json({ ok: false, error: error?.message || 'Failed to save prompts' });
  }

  const prompts = data.map((row, index) => {
    const outline = (row.outline_json ?? null) as { summary?: string | null } | null;
    return mapInsertedRow(row, outline?.summary ?? generated[index]?.summary ?? null);
  });

  return res.status(200).json({ ok: true, prompts });
}

export default withPlan('master', handler);
