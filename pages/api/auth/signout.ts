// pages/api/auth/signout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { enforceSameOrigin } from '@/lib/security/csrf';
import { clearSession } from '@/lib/auth/server';

/**
 * Clears Supabase auth cookies set by the Next.js helpers (if used).
 * Safe to call even if you don't use the helpers.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!enforceSameOrigin(req, res)) return;

  clearSession(res);

  res.status(200).json({ ok: true });
}
