import type { NextApiRequest, NextApiResponse } from 'next';

import { env } from '@/lib/env';

export type ExchangeResponse =
  | { data: Record<string, any>; error?: undefined }
  | { data?: undefined; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ExchangeResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { auth_code: authCode, code_verifier: codeVerifier } = req.body ?? {};

  if (typeof authCode !== 'string' || typeof codeVerifier !== 'string' || !authCode || !codeVerifier) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(503).json({ error: 'supabase_not_configured' });
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=pkce`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload) {
      const message = payload?.error_description || payload?.error || payload?.msg || 'exchange_failed';
      return res.status(400).json({ error: message });
    }

    return res.status(200).json({ data: payload });
  } catch (error) {
    console.error('[api/auth/exchange-code] Failed to exchange auth code:', error);
    return res.status(500).json({ error: 'exchange_failed' });
  }
}
