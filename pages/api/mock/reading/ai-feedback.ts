// pages/api/mock/reading/ai-feedback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/withPlan';

const Body = z.object({
  slug: z.string(),
  attemptId: z.string().nullable().optional(),
  bandScore: z.number(),
  correct: z.number().int(),
  total: z.number().int(),
  totalTimeSeconds: z.number().int(),
  sections: z.array(
    z.object({
      label: z.string(),
      correct: z.number().int(),
      total: z.number().int(),
    }),
  ),
  weakTypes: z.array(
    z.object({
      label: z.string(),
      accuracyPercent: z.number().int(),
    }),
  ),
});

type BodyType = z.infer<typeof Body>;

type AiFeedbackResponse = {
  summary: string;
  bullets: string[];
};

/**
 * Fallback: rule-based feedback if AI is off / fails
 */
function buildRuleBasedFeedback(input: BodyType): AiFeedbackResponse {
  const { bandScore, totalTimeSeconds, weakTypes, sections } = input;

  const timeMinutes = Math.round(totalTimeSeconds / 60);
  const worstType = weakTypes.slice().sort((a, b) => a.accuracyPercent - b.accuracyPercent)[0];

  const weakestPassage = sections
    .map((s) => ({
      label: s.label,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  let bandComment: string;
  if (bandScore < 5.5) {
    bandComment =
      'You are below Band 6 right now. The main issue is inconsistent accuracy across passages and question types.';
  } else if (bandScore < 6.5) {
    bandComment =
      'You are in the Band 5.5–6.5 zone. The base is okay, but your mistakes show unstable control under time pressure.';
  } else {
    bandComment =
      'You are already around Band 6.5+ — the next jump will come from cleaning up avoidable mistakes and tightening timing.';
  }

  const summary = [
    bandComment,
    weakestPassage
      ? `Your weakest passage this attempt was ${weakestPassage.label} with around ${weakestPassage.accuracy}% accuracy.`
      : '',
    worstType
      ? `The question type causing the most damage is ${worstType.label} — your accuracy here is only about ${worstType.accuracyPercent}%.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const bullets: string[] = [];

  if (worstType) {
    bullets.push(
      `Drill 10–15 questions of “${worstType.label}” specifically, instead of random question sets.`,
    );
  }

  if (weakestPassage) {
    bullets.push(
      `Re-scan ${weakestPassage.label} and compare each wrong answer with the exact paragraph. Train yourself to justify every answer with a sentence from the text.`,
    );
  }

  if (timeMinutes > 60) {
    bullets.push(
      `You took ~${timeMinutes} minutes. In the real test you only get 60. Start using a hard 60-minute timer for every mock.`,
    );
  } else if (timeMinutes > 50) {
    bullets.push(
      `You finished in ~${timeMinutes} minutes. Aim to consistently finish in 50–55 minutes so you have time to check TFNG and MCQs.`,
    );
  } else {
    bullets.push(
      `Your timing (~${timeMinutes} minutes) is decent. Now focus on accuracy in your weakest question type to push the band up.`,
    );
  }

  bullets.push(
    'Do one more full Reading mock this week and compare your accuracy by question type. The goal is to move your worst type above 60% first.',
  );

  return { summary, bullets };
}

/**
 * AI-based feedback using GROQ (OpenAI-compatible endpoint)
 * - Uses GROQ_API_KEY (server-side only)
 * - Uses GROQ_MODEL or defaults to a good model
 */
async function buildGroqFeedback(input: BodyType): Promise<AiFeedbackResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

  if (!apiKey) {
    // no key, bail to rule-based
    return buildRuleBasedFeedback(input);
  }

  const { bandScore, correct, total, totalTimeSeconds, sections, weakTypes } = input;

  const timeMinutes = Math.round(totalTimeSeconds / 60);

  const sectionsText =
    sections.length === 0
      ? 'No section breakdown available.'
      : sections
          .map(
            (s) =>
              `${s.label}: ${s.correct}/${s.total} correct (${s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0}% accuracy)`,
          )
          .join('; ');

  const weakTypesText =
    weakTypes.length === 0
      ? 'No weak types detected.'
      : weakTypes
          .map((w) => `${w.label}: ${w.accuracyPercent}% accuracy`)
          .join('; ');

  const prompt = `
You are an IELTS Reading coach. The student just finished a full IELTS Reading mock test.

Give:
1) A SHORT summary (2–3 sentences, max) of their performance.
2) 3–5 bullet-point recommendations that are specific and actionable.

Be direct, practical, and exam-focused. No fluff. Tone: supportive but honest.

DATA:
- Estimated Band Score: ${bandScore}
- Correct: ${correct}/${total}
- Time Taken: ~${timeMinutes} minutes
- Passage Breakdown: ${sectionsText}
- Weak Question Types: ${weakTypesText}
  `.trim();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert IELTS Reading coach. You give concise, actionable feedback based strictly on the data provided.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    // API blew up → fallback
    return buildRuleBasedFeedback(input);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };

  const content = json.choices?.[0]?.message?.content ?? '';

  if (!content) {
    return buildRuleBasedFeedback(input);
  }

  // Very cheap parse: first paragraph = summary, bullets = lines starting with "-" or "•"
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);

  const summaryLines: string[] = [];
  const bulletLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
      bulletLines.push(line.replace(/^[-•\d.]+\s*/, '').trim());
    } else {
      summaryLines.push(line);
    }
  }

  const summary =
    summaryLines.join(' ').trim() ||
    'Here is a performance summary based on your Reading mock test stats.';
  const bullets = bulletLines.length > 0 ? bulletLines : buildRuleBasedFeedback(input).bullets;

  return { summary, bullets };
}

async function baseHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = parse.data;

  try {
    const feedback = await buildGroqFeedback(body);
    const payload: AiFeedbackResponse = {
      summary: feedback.summary,
      bullets: feedback.bullets,
    };
    return res.status(200).json(payload);
  } catch (err) {
    // Just in case both AI + fallback blow up unexpectedly
    const fb = buildRuleBasedFeedback(body);
    return res.status(200).json(fb);
  }
}

// Guard with plan: starter+ (admins/teachers bypass)
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withPlan('starter', baseHandler, {
    allowRoles: ['admin', 'teacher'],
  })(req, res);
}
