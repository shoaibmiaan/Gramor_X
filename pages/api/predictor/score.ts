// pages/api/predictor/score.ts
import type { NextApiHandler } from 'next';

import { runPredictor, type PredictorInput, type PredictorResult } from '@/lib/predictor';

type Success = Readonly<{ ok: true } & PredictorResult>;
type Failure = Readonly<{ ok: false; error: string }>;
type ResBody = Success | Failure;

const handler: NextApiHandler<ResBody> = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const body: PredictorInput = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as PredictorInput;
    const result = runPredictor(body);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Prediction failed';
    return res.status(400).json({ ok: false, error: message });
  }
};

export default handler;
