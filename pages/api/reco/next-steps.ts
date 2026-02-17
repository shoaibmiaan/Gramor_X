import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { supabaseServer } from '@/lib/supabaseServer';

type Recommendation = {
  id: string;
  title: string;
  description: string;
  url: string;
  tag: string;
  source: 'study-hub' | 'coach' | 'resource';
};

type SuccessResponse = { ok: true; links: Recommendation[] };

type ErrorResponse = { ok: false; error: string };

const BodySchema = z.object({
  weakTypes: z.array(z.string().min(1)).min(1).max(5),
  difficulty: z.enum(['easy', 'med', 'hard']).optional(),
  limit: z.number().int().min(1).max(5).default(3),
});

const TYPE_RECOMMENDATIONS: Record<string, Recommendation[]> = {
  tfng: [
    {
      id: 'tfng-strategy',
      title: 'True/False/Not Given playbook',
      description: 'Learn the scanning rhythm and keyword traps that IELTS uses in TF/NG sets.',
      url: '/study-hub/reading/true-false-not-given-strategy',
      tag: 'Strategy',
      source: 'study-hub',
    },
    {
      id: 'tfng-drill',
      title: '15-minute TF/NG drill',
      description: 'Timed practice that mirrors Cambridge Section 1 passages with instant AI feedback.',
      url: '/coach/reading/drills/true-false-not-given',
      tag: 'Drill',
      source: 'coach',
    },
    {
      id: 'tfng-review',
      title: 'Evidence spotting walkthrough',
      description: 'Watch a coach annotate the exact sentence that flips True to False in sample passages.',
      url: '/study-hub/reading/evidence-spotting',
      tag: 'Lesson',
      source: 'study-hub',
    },
  ],
  matching: [
    {
      id: 'matching-headings',
      title: 'Matching Headings mini-course',
      description: 'Break paragraphs into focus sentences and apply the elimination grid method.',
      url: '/study-hub/reading/matching-headings',
      tag: 'Course',
      source: 'study-hub',
    },
    {
      id: 'matching-drill',
      title: 'Paragraph mapping drill',
      description: 'Coach-guided drill that trains you to chunk topics before looking at answer choices.',
      url: '/coach/reading/drills/matching-headings',
      tag: 'Drill',
      source: 'coach',
    },
    {
      id: 'matching-cheatsheet',
      title: 'Connector words cheat sheet',
      description: 'Downloadable reference listing the topic sentences that signal contrast, cause, or result.',
      url: '/study-hub/reading/connector-cheatsheet',
      tag: 'Resource',
      source: 'resource',
    },
  ],
  mcq: [
    {
      id: 'mcq-strategy',
      title: 'Multiple-choice decoding',
      description: 'Spot the paraphrase and eliminate distractors with the 2-pass skim + scan loop.',
      url: '/study-hub/reading/multiple-choice',
      tag: 'Strategy',
      source: 'study-hub',
    },
    {
      id: 'mcq-drill',
      title: 'MCQ comprehension sprints',
      description: '10-question sprints that surface paraphrasing traps and track timing.',
      url: '/coach/reading/drills/mcq',
      tag: 'Drill',
      source: 'coach',
    },
    {
      id: 'mcq-review',
      title: 'Distractor lab',
      description: 'Analyse why wrong answers look tempting and rewrite them into correct statements.',
      url: '/study-hub/reading/distractor-lab',
      tag: 'Workshop',
      source: 'study-hub',
    },
  ],
  short: [
    {
      id: 'gapfill-routines',
      title: 'Gap-fill accuracy routine',
      description: 'Master spelling, grammar agreement, and synonym swaps for short-answer questions.',
      url: '/study-hub/reading/gap-fill-techniques',
      tag: 'Routine',
      source: 'study-hub',
    },
    {
      id: 'gapfill-drill',
      title: 'Short-answer precision drill',
      description: 'Timed blanks with AI checking spelling, plural forms, and paraphrased answers.',
      url: '/coach/reading/drills/gap-fill',
      tag: 'Drill',
      source: 'coach',
    },
    {
      id: 'gapfill-templates',
      title: 'Answer template bank',
      description: 'Templates for rephrasing numerical and short-response answers without grammar mistakes.',
      url: '/study-hub/reading/answer-templates',
      tag: 'Template',
      source: 'resource',
    },
  ],
  default: [
    {
      id: 'reading-roadmap',
      title: 'IELTS Reading roadmap',
      description: 'Step-by-step path to move from passive reading to test-ready scanning and inference.',
      url: '/study-hub/reading/roadmap',
      tag: 'Roadmap',
      source: 'study-hub',
    },
    {
      id: 'coach-onboarding',
      title: 'Book an AI coach refresh',
      description: 'Schedule a 20-minute personalised drill plan tuned to your latest attempt analytics.',
      url: '/coach/reading/refresh',
      tag: 'Coach',
      source: 'coach',
    },
    {
      id: 'reading-lab',
      title: 'Live Reading Lab replay',
      description: 'Replay a tutor-led session that dissects timing, annotation, and evidence citations.',
      url: '/study-hub/reading/live-lab',
      tag: 'Replay',
      source: 'resource',
    },
  ],
};

const DIFFICULTY_RECOMMENDATIONS: Record<'easy' | 'med' | 'hard', Recommendation[]> = {
  easy: [
    {
      id: 'accuracy-warmup',
      title: 'Accuracy warm-up set',
      description: 'Quick wins to rebuild confidence on easier questions before tackling harder sets.',
      url: '/coach/reading/drills/warm-up',
      tag: 'Warm-up',
      source: 'coach',
    },
  ],
  med: [
    {
      id: 'mid-band-strategy',
      title: 'Band 6–7 strategy clinic',
      description: 'Video class on staying consistent when passages introduce paraphrased evidence.',
      url: '/study-hub/reading/band-7-strategy',
      tag: 'Clinic',
      source: 'study-hub',
    },
  ],
  hard: [
    {
      id: 'advanced-inference',
      title: 'Inference and writer’s opinion lab',
      description: 'Targeted drills on the hardest question stems with AI rationale comparisons.',
      url: '/coach/reading/drills/inference-lab',
      tag: 'Advanced',
      source: 'coach',
    },
  ],
};

type CachedEntry = {
  payload: SuccessResponse;
  expiresAt: number;
};

const CACHE_TTL_MS = 1000 * 60 * 10;
const cache = new Map<string, CachedEntry>();

async function handler(req: NextApiRequest, res: NextApiResponse<SuccessResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const parse = BodySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, error: parse.error.message });
  }

  const { weakTypes, difficulty, limit } = parse.data;

  const supabase = supabaseServer(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthenticated' });
  }

  const cacheKey = `${[...weakTypes].sort().join('|')}|${difficulty ?? 'any'}|${limit}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return res.status(200).json(cached.payload);
  }

  const links = buildRecommendations(weakTypes, difficulty, limit);
  const payload: SuccessResponse = { ok: true, links };
  cache.set(cacheKey, { payload, expiresAt: now + CACHE_TTL_MS });
  return res.status(200).json(payload);
}

function buildRecommendations(types: string[], difficulty: 'easy' | 'med' | 'hard' | undefined, limit: number): Recommendation[] {
  const unique = new Map<string, Recommendation>();

  const add = (items: Recommendation[] | undefined) => {
    items?.forEach((item) => {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
      }
    });
  };

  types.forEach((type) => {
    const normalised = normaliseType(type);
    add(TYPE_RECOMMENDATIONS[normalised] ?? TYPE_RECOMMENDATIONS.default);
  });

  if (difficulty) {
    add(DIFFICULTY_RECOMMENDATIONS[difficulty]);
  }

  if (unique.size < limit) {
    add(TYPE_RECOMMENDATIONS.default);
  }

  return Array.from(unique.values()).slice(0, limit);
}

function normaliseType(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('match')) return 'matching';
  if (lower.includes('heading')) return 'matching';
  if (lower.includes('tf') || lower.includes('not given') || lower.includes('ynng')) return 'tfng';
  if (lower.includes('gap') || lower.includes('short')) return 'short';
  if (lower.includes('mcq') || lower.includes('choice')) return 'mcq';
  return lower;
}

export default withPlan('starter', handler);
