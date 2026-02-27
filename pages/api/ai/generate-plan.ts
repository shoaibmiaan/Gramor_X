import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import {
  generateOnboardingStudyPlan,
  onboardingPayloadSchema,
  studyPlanSchema,
  type StudyPlan,
} from '@/lib/onboarding/aiStudyPlan';

type ResponseBody = { plan: StudyPlan } | { error: string };

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

    const generated = await generateOnboardingStudyPlan(input);
    const validated = studyPlanSchema.safeParse(generated);
    if (!validated.success) {
      return res.status(500).json({ error: 'Failed to build a valid study plan' });
    }

    const plan = validated.data;

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
    return res.status(500).json({ error: 'Failed to generate study plan' });
  }
}
