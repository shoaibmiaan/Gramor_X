import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ai, AI_MODEL } from '@/lib/ai';

const BodySchema = z.object({ response: z.string().min(20).max(4000) });
const DiagnosticSchema = z.object({
  grammar: z.string().min(1),
  coherence: z.string().min(1),
  vocabulary: z.string().min(1),
  estimated_band: z.number().min(0).max(9),
});

type Ok = z.infer<typeof DiagnosticSchema>;
type Err = { error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an IELTS diagnostic grader. Return strict JSON with keys: grammar, coherence, vocabulary, estimated_band. Keep each text brief. estimated_band must be a number 0-9.',
        },
        { role: 'user', content: parsed.data.response },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      return res.status(502).json({ error: 'Provider returned empty response' });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      return res.status(502).json({ error: 'Provider response was not valid JSON', details: String(error) });
    }

    const result = DiagnosticSchema.safeParse(payload);
    if (!result.success) {
      return res.status(502).json({ error: 'Provider response failed validation', details: result.error.flatten() });
    }

    return res.status(200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to run diagnostic', details: error?.message ?? String(error) });
  }
}
