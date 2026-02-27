// api/onboarding/diagnostic.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const DiagnosticSchema = z.object({
  answers: z.record(z.number().int().min(1).max(5)),
  estimatedScores: z.object({
    reading: z.number().min(0).max(9),
    listening: z.number().min(0).max(9),
    writing: z.number().min(0).max(9),
    speaking: z.number().min(0).max(9)
  })
});

type DiagnosticResponse = {
  success: boolean;
  message?: string;
  nextStep?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiagnosticResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - please log in'
    });
  }

  const parse = DiagnosticSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payload',
      message: 'Answers must be 1-5 and scores must be valid bands.'
    });
  }

  const { answers, estimatedScores } = parse.data;

  try {
    // 1. Save diagnostic raw data
    const { error: insertErr } = await supabase
      .from('diagnostic_results')
      .insert({
        user_id: user.id,
        answers,
        estimated_scores: estimatedScores,
        created_at: new Date().toISOString()
      });

    if (insertErr) throw insertErr;

    // 2. Update profile with estimated baseline scores
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        baseline_scores: estimatedScores,
        onboarding_step: 3,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      message: 'Diagnostic results saved successfully',
      nextStep: '/onboarding/baseline' // or '/onboarding/review', etc.
    });
  } catch (err: any) {
    console.error('Diagnostic save error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save diagnostic results'
    });
  }
}