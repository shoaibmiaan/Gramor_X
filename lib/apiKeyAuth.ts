import crypto from 'crypto';
import type { NextApiRequest } from 'next';
import { supabaseService } from '@/lib/supabaseServer';

export type ApiKeyAuthResult = { ok: true; userId: string; keyId: string; permissions: Record<string, unknown> } | { ok: false; error: string };

function extractApiKey(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const header = req.headers['x-api-key'];
  if (typeof header === 'string') return header.trim();
  return null;
}

export async function authenticateApiKey(req: NextApiRequest): Promise<ApiKeyAuthResult> {
  const raw = extractApiKey(req);
  if (!raw) return { ok: false, error: 'missing_api_key' };

  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const db = supabaseService() as any;
  const { data, error } = await db
    .from('api_keys')
    .select('id, user_id, permissions, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !data) return { ok: false, error: 'invalid_api_key' };

  await db.from('api_keys').update({ last_used: new Date().toISOString() }).eq('id', data.id);
  return { ok: true, userId: data.user_id, keyId: data.id, permissions: data.permissions ?? {} };
}

export function issueApiKey(): { plainText: string; keyHash: string; keyPrefix: string } {
  const plainText = `gx_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(plainText).digest('hex');
  return { plainText, keyHash, keyPrefix: plainText.slice(0, 10) };
}
