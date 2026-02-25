import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getServerClient } from '@/lib/supabaseServer';
import {
  buildFallbackPlan,
  calculateDailyHours,
  normalizeStudyPlan,
  onboardingPayloadSchema,
  weakestSkill,
  type OnboardingPayload,
  type StudyPlan,
} from '@/lib/onboarding/aiStudyPlan';

type ResponseBody = { plan: StudyPlan } | { error: string };

function buildPrompt(payload: OnboardingPayload): string {
  const priority = weakestSkill(payload);
  const dailyHours = calculateDailyHours(payload.examDate);

  return [
    'You are an IELTS strategist. Return ONLY valid JSON.',
    'Output schema must be exactly:',
    '{"duration_weeks":number,"daily_hours":number,"weekly_plan":[{"week":number,"focus":string,"tasks":[string]}],"priority_skill":"Reading"|"Writing"|"Listening"|"Speaking"}',
    'Hard constraints:',
    `- daily_hours MUST be ${dailyHours}`,
    `- priority_skill MUST be "${priority}"`,
    `- first 2 weeks MUST prioritize ${priority}`,
    '- If target band high + short deadline: strategy heavy.',
    '- If lower band + longer timeline: foundation heavy.',
    '- Use practical IELTS-focused tasks only.',
    `Student profile JSON: ${JSON.stringify(payload)}`,
  ].join('\n');
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function generateWithOpenAI(payload: OnboardingPayload): Promise<StudyPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackPlan(payload);
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You create realistic IELTS plans and must return strict JSON with no extra prose.',
        },
        { role: 'user', content: buildPrompt(payload) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '';
    const parsed = safeJsonParse(text);
    if (!parsed) {
      return buildFallbackPlan(payload);
    }

    return normalizeStudyPlan(payload, parsed);
  } catch (error) {
    console.error('[generate-plan] openai error', error);
    return buildFallbackPlan(payload);
  }
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
      console.error('[generate-plan] supabase upsert failed', upsertError);
      return res.status(500).json({ error: 'Failed to save onboarding data' });
    }

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('[generate-plan] failed', error);
    return res.status(500).json({ error: 'Failed to generate AI study plan' });
  }
}
