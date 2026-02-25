import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getServerClient } from '@/lib/supabaseServer';
import {
  buildFallbackPlan,
  onboardingPayloadSchema,
  studyPlanSchema,
  weakestSkill,
  type OnboardingPayload,
  type StudyPlan,
} from '@/lib/onboarding/aiStudyPlan';

type ResponseBody =
  | { plan: StudyPlan }
  | { error: string };

function buildPrompt(payload: OnboardingPayload): string {
  const priority = weakestSkill(payload);
  return [
    'You are an IELTS strategist. Return ONLY valid JSON.',
    'Generate a personalized study plan with this exact schema:',
    '{ duration_weeks:number, daily_hours:number, weekly_plan:[{week:number, focus:string, tasks:string[]}], priority_skill:"Reading"|"Writing"|"Listening"|"Speaking" }',
    'Planning logic requirements:',
    '- If target band is high and deadline is short, make strategy/timed-practice heavy.',
    '- If target band is low and timeline is long, make foundation/concept heavy.',
    '- Prioritize weakest skill first.',
    '- Keep tasks practical and IELTS specific.',
    `Student profile: ${JSON.stringify(payload)}`,
    `Weakest skill inferred: ${priority}`,
  ].join('\n');
}

async function generateWithOpenAI(payload: OnboardingPayload): Promise<StudyPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackPlan(payload);
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You create concise, realistic IELTS study plans in JSON.' },
      { role: 'user', content: buildPrompt(payload) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    return buildFallbackPlan(payload);
  }

  const parsed = JSON.parse(text) as unknown;
  const validated = studyPlanSchema.safeParse(parsed);
  if (!validated.success) {
    return buildFallbackPlan(payload);
  }

  return validated.data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsedInput = onboardingPayloadSchema.safeParse(req.body);
  if (!parsedInput.success) {
    return res.status(400).json({ error: 'Invalid onboarding payload' });
  }

  try {
    const input = parsedInput.data;
    const plan = await generateWithOpenAI(input);

    const { error: upsertError } = await supabase.from('user_onboarding').upsert(
      {
        user_id: user.id,
        target_band: input.targetBand,
        exam_date: input.examDate,
        reading_level: input.readingLevel,
        writing_level: input.writingLevel,
        listening_level: input.listeningLevel,
        speaking_level: input.speakingLevel,
        learning_style: input.learningStyle,
        generated_plan: plan,
      },
      { onConflict: 'user_id' },
    );

    if (upsertError) {
      return res.status(500).json({ error: 'Failed to save onboarding data' });
    }

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('[generate-plan] failed', error);
    return res.status(500).json({ error: 'Failed to generate AI study plan' });
  }
}
