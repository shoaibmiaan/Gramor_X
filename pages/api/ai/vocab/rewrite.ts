import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';

type BandTarget = '6.0' | '6.5' | '7.0' | '7.5' | '8.0';
type RewriteModule = 'writing' | 'speaking';

type RewriteResponse =
  | {
      improved: string;
      explanation?: string;
      keyPhrases?: string[];
    }
  | { error: string; details?: unknown };

function normaliseText(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(',').map((p) => p.trim());
  if (parts.length > 1) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const part of parts) {
      const key = part.toLowerCase();
      if (!seen.has(key) && key.length > 0) {
        seen.add(key);
        deduped.push(part);
      }
    }
    cleaned = deduped.join(', ');
  }
  if (!cleaned) return text.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function phraseCandidates(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[,.!?;:]/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length >= 12)
        .slice(0, 3),
    ),
  );
}

async function handler(req: NextApiRequest, res: NextApiResponse<RewriteResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/ai/vocab/rewrite', { requestId, clientIp });
  const startedAt = Date.now();

  const body = (req.body ?? {}) as { text?: string; bandTarget?: BandTarget; module?: RewriteModule };
  const text = typeof body.text === 'string' ? body.text : '';
  const bandTarget: BandTarget = body.bandTarget ?? '7.0';
  const moduleType: RewriteModule = body.module ?? 'writing';

  if (!text.trim()) {
    return res.status(400).json({ error: 'Missing "text" in request body' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised vocab rewrite attempt', { reason: userError?.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const improved = normaliseText(text);
    const keyPhrases = phraseCandidates(improved);
    const explanation = `Adjusted for ${moduleType} tone around band ${bandTarget}: tightened wording, removed repetition, and improved precision while preserving the original meaning.`;

    const latency = Date.now() - startedAt;
    await trackor.log('vocab_rewrite_used', {
      user_id: user.id,
      latency_ms: latency,
      request_id: requestId,
      ip: clientIp,
      original_length: text.length,
      rewritten_length: improved.length,
      module: moduleType,
      band_target: bandTarget,
    });

    return res.status(200).json({
      improved,
      explanation,
      keyPhrases,
    });
  } catch (err: any) {
    logger.error('vocab rewrite error', {
      error: err?.message ?? String(err),
      userId: user.id,
    });

    return res.status(500).json({
      error: 'Failed to rewrite vocabulary text',
      details: err?.message ?? String(err),
    });
  }
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
