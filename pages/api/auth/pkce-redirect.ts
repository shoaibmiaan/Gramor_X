import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const params = new URLSearchParams();
  const keepKeys = ['next', 'role', 'ref', 'email', 'code_verifier'];
  for (const key of keepKeys) {
    const value = req.query[key];
    if (typeof value === 'string' && value) {
      params.set(key, value);
    }
  }

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

  const authCode = typeof req.query.code === 'string' ? req.query.code : null;
  if (authCode) {
    params.set('auth_code', authCode);
  }

  const destination = `/auth/verify${params.toString() ? `?${params.toString()}` : ''}`;
  res.writeHead(307, { Location: destination });
  res.end();
}
