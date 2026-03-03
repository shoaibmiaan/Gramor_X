// pages/api/auth/signout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { enforceSameOrigin } from '@/lib/security/csrf';
import { clearSession } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { logAccountAudit, logLogout } from '@/lib/audit';

/**
 * Clears Supabase auth cookies set by the Next.js helpers (if used).
 * Safe to call even if you don't use the helpers.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!enforceSameOrigin(req, res)) return;

  const supabase = createSupabaseServerClient({ req, res });
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const ipHeader = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null;
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
  const uaHeader = req.headers['user-agent'];
  const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : (uaHeader ?? null);

  if (user?.id) {
    await logAccountAudit(supabase, user.id, 'logout', {}, { ip, userAgent });
    await logLogout(user.id, req);
  }

  clearSession(res);

  res.status(200).json({ ok: true });
}
