// pages/api/exp/assign.ts
import type { NextApiHandler } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  recordExperimentConversion,
  recordExperimentExposure,
  resolveExperimentAssignment,
  type ExperimentAssignmentState,
} from '@/lib/exp/assign';

const BodySchema = z.object({
  experiment: z.string().min(1),
  action: z.enum(['assign', 'expose', 'convert']).optional(),
  context: z.record(z.any()).optional(),
});

type ErrorResponse = { ok: false; error: string };

type SuccessResponse = {
  ok: true;
} & ExperimentAssignmentState;

function toResponsePayload(assignment: ExperimentAssignmentState): SuccessResponse {
  const payload: SuccessResponse = {
    ok: true,
    experiment: assignment.experiment,
    variant: assignment.variant,
    status: assignment.status,
    created: assignment.created,
    assignedAt: assignment.assignedAt,
    holdout: assignment.holdout,
  } as SuccessResponse;

  if (typeof assignment.exposures === 'number') {
    payload.exposures = assignment.exposures;
  }
  if (typeof assignment.conversions === 'number') {
    payload.conversions = assignment.conversions;
  }

  return payload;
}

const handler: NextApiHandler<SuccessResponse | ErrorResponse> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const parse = BodySchema.safeParse(req.body ?? {});
  if (!parse.success) {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  const { experiment, action = 'assign', context } = parse.data;

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    let assignment: ExperimentAssignmentState | null = null;

    if (action === 'assign') {
      assignment = await resolveExperimentAssignment({
        experimentKey: experiment,
        userId: user.id,
        context,
      });
    } else if (action === 'expose') {
      assignment = await recordExperimentExposure({
        experimentKey: experiment,
        userId: user.id,
        context,
      });
    } else if (action === 'convert') {
      assignment = await recordExperimentConversion({
        experimentKey: experiment,
        userId: user.id,
        context,
      });
    }

    if (!assignment) {
      return res.status(404).json({ ok: false, error: 'Assignment not found' });
    }

    return res.status(200).json(toResponsePayload(assignment));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(500).json({ ok: false, error: message });
  }
};

export default handler;
