// pages/api/auth/pkce-redirect.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const params = new URLSearchParams();

  // Preserve your custom params
  const keepKeys = ['next', 'role', 'ref', 'email', 'code_verifier'];
  for (const key of keepKeys) {
    const value = req.query[key];
    if (typeof value === 'string' && value) {
      params.set(key, value);
    }
  }

  // Supabase auth params we must forward
  const supabaseParams = [
    'access_token',
    'refresh_token',
    'expires_in',
    'token_type',
    'type',
    'token_hash',
    'provider_token',
    'provider_refresh_token',
    'error',
    'error_code',
    'error_description',
  ];

  for (const key of supabaseParams) {
    const value = req.query[key];
    if (typeof value === 'string' && value) {
      params.set(key, value);
    }
  }

  // PKCE code
  const authCode = typeof req.query.code === 'string' ? req.query.code : null;
  if (authCode) {
    params.set('code', authCode);
  }

  // ✅ Redirect to the correct verification page
  const destination = `/auth/confirm${params.toString() ? `?${params.toString()}` : ''}`;

  res.writeHead(307, { Location: destination });
  res.end();
}