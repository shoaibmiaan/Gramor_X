// pages/api/ai/vocab/rewrite.ts

import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';

type RewriteResponse =
  | {
      ok: true;
      original: string;
      rewritten: string;
      meta: {
        tokens_before: number;
        tokens_after: number;
      };
    }
  | { error: string; details?: unknown };

function naiveRewrite(text: string): string {
  // Minimal "smart" cleanup to behave like *something* real
  // without needing any external AI service.
  // - trim
  // - collapse spaces
  // - normalize case on first char
  // - remove obvious duplicates separated by commas

  let cleaned = text.trim().replace(/\s+/g, ' ');

  // Normalize repeated comma-separated items (e.g. "happy, happy, glad")
  const parts = cleaned.split(',').map((p) => p.trim());
  if (parts.length > 1) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const p of parts) {
      const key = p.toLowerCase();
      if (!seen.has(key) && p.length > 0) {
        seen.add(key);
        deduped.push(p);
      }
    }
    cleaned = deduped.join(', ');
  }

  if (!cleaned) return text.trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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

  const body = (req.body ?? {}) as { text?: string };
  const text = typeof body.text === 'string' ? body.text : undefined;

  if (!text || !text.trim()) {
    logger.warn('invalid rewrite payload', { bodyPreview: JSON.stringify(req.body).slice(0, 200) });
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
    const original = text;
    const rewritten = naiveRewrite(text);

    const latency = Date.now() - startedAt;
    logger.info('vocab rewrite served', {
      userId: user.id,
      latencyMs: latency,
      originalLength: original.length,
      rewrittenLength: rewritten.length,
    });

    await trackor.log('vocab_rewrite_used', {
      user_id: user.id,
      latency_ms: latency,
      request_id: requestId,
      ip: clientIp,
      original_length: original.length,
      rewritten_length: rewritten.length,
    });

    return res.status(200).json({
      ok: true,
      original,
      rewritten,
      meta: {
        tokens_before: original.split(/\s+/).filter(Boolean).length,
        tokens_after: rewritten.split(/\s+/).filter(Boolean).length,
      },
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

// User-facing AI vocab rewrite endpoint – gated by plan but no extra packages.
export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
