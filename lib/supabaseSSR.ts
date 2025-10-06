// lib/supabaseSSR.ts (no-SSR version)
// Drop-in replacement so existing API routes keep working without @supabase/ssr.
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import cookie from 'cookie';

function bearerFromCookies(req: NextApiRequest): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return;
  const parsed = cookie.parse(raw);
  const t = parsed['sb-access-token'];
  return t ? `Bearer ${t}` : undefined;
}

export function supabaseServer(req: NextApiRequest, _res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Prefer Authorization header; fall back to cookie if present.
  const auth = (req.headers.authorization as string | undefined) || bearerFromCookies(req);

  return createClient(url, anon, {
    global: { headers: auth ? { Authorization: auth } : {} },
  });
}

// Back-compat alias so existing imports keep working
export const createSSRClient = supabaseServer;
