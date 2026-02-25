// api/onboarding/baseline.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

// Valid IELTS band scores (0.0 to 9.0 in 0.5 increments)
const VALID_BANDS = [
  0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5,
  4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5,
  8.0, 8.5, 9.0
] as const;

const BandSchema = z.number()
  .min(0)
  .max(9)
  .refine(val => VALID_BANDS.includes(val as any), {
    message: "Score must be a valid IELTS band (0.0–9.0 in 0.5 steps)"
  });

const BaselineSchema = z.object({
  reading: BandSchema,
  writing: BandSchema,
  listening: BandSchema,
  speaking: BandSchema,
  source: z.enum(['self-assessment', 'diagnostic', 'previous-test']).optional().default('self-assessment'),
});

type BaselineResponse = {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  details?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaselineResponse>
) {
  const supabase = getServerClient(req, res);

  // Auth check for all methods
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'You must be logged in.'
    });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, supabase, user.id);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, supabase, user.id);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    message: `Only GET and POST are supported.`
  });
}

// ─── GET: Load user's baseline scores + diagnostic info ───
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<BaselineResponse>,
  supabase: any,
  userId: string
) {
  try {
    // Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('baseline_scores, onboarding_step, target_band, updated_at')
      .eq('user_id', userId)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Profile not found.'
      });
    }

    // Check for latest diagnostic (optional)
    const { data: diagnostic } = await supabase
      .from('diagnostic_results')
      .select('estimated_scores, answers, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      data: {
        baseline_scores: profile.baseline_scores || null,
        onboarding_step: profile.onboarding_step || 1,
        target_band: profile.target_band || null,
        last_updated: profile.updated_at,
        has_diagnostic: !!diagnostic,
        diagnostic_data: diagnostic || null
      }
    });
  } catch (err) {
    console.error('GET /baseline error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal error',
      message: 'Failed to load baseline data.'
    });
  }
}

// ─── POST: Save baseline scores (manual or from diagnostic) ───
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<BaselineResponse>,
  supabase: any,
  userId: string
) {
  // Validate payload
  const parseResult = BaselineSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      message: 'Invalid band scores or format.',
      details: parseResult.error.flatten()
    });
  }

  const { reading, writing, listening, speaking, source } = parseResult.data;
  const baselineScores = { reading, writing, listening, speaking };

  // Prevent all-zero submission (realistic check)
  if (Object.values(baselineScores).every(s => s === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid scores',
      message: 'At least one skill should have a score above 0.'
    });
  }

  try {
    // Get current target band (for insights)
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_band')
      .eq('user_id', userId)
      .single();

    const target = profile?.target_band || 6.5;
    const avg = (reading + writing + listening + speaking) / 4;
    const gap = target - avg;

    // Save scores
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        baseline_scores: baselineScores,
        onboarding_step: 3, // move forward in flow
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateErr) throw updateErr;

    // Log submission (audit trail)
    await supabase.from('submission_logs').insert({
      user_id: userId,
      type: 'baseline_scores',
      data: baselineScores,
      source,
      created_at: new Date().toISOString()
    });

    // Prepare useful insights for frontend
    const insights = {
      average_score: Number(avg.toFixed(1)),
      gap_to_target: Number(gap.toFixed(1)),
      strongest_skill: getStrongestSkill(baselineScores),
      weakest_skill: getWeakestSkill(baselineScores),
      recommendation: getRecommendation(avg, target, gap)
    };

    return res.status(200).json({
      success: true,
      message: 'Baseline scores saved successfully',
      data: {
        baseline_scores: baselineScores,
        onboarding_step: 3,
        next_step: '/onboarding/study-rhythm', // adjust if needed
        insights
      }
    });
  } catch (err: any) {
    console.error('POST /baseline error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to save scores. Please try again.'
    });
  }
}

// Helpers
function getStrongestSkill(scores: Record<string, number>): string {
  return Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function getWeakestSkill(scores: Record<string, number>): string {
  return Object.entries(scores).reduce((a, b) => (b[1] < a[1] ? b : a))[0];
}

function getRecommendation(avg: number, target: number, gap: number): string {
  if (gap <= 0) return "You're already at or above target — focus on maintenance.";
  if (gap < 1) return "Very close! We'll polish weak areas and exam technique.";
  if (gap < 2) return "Moderate gap — structured plan to boost weaker skills.";
  return "Significant gap — we'll build strong foundation step by step.";
}