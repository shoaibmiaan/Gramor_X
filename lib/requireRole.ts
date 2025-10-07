// lib/requireRole.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type AppRole = 'admin' | 'teacher' | 'student';

// -- Internal: parse cookies both from req.cookies and raw header (SSR safety)
function getCookie(req: NextApiRequest, name: string): string | undefined {
  // 1) Next parses cookies for us in most cases
  // @ts-expect-error TODO: tighten type for cookies in custom server
  const v = req.cookies?.[name];
  if (v) return v;

  // 2) Fallback: parse raw header (some dev servers/edge cases)
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const parts = raw.split(';').map((p) => p.trim());
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}

// -- Supabase auth cookie → access_token
function getCookieToken(req: NextApiRequest): string | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  if (!url) return null;

  const projectRef = url.replace(/^https?:\/\//, '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const raw = getCookie(req, cookieName);
  if (!raw) return null;

  // Value is JSON. It can be either an object or a stringified object.
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(decodeURIComponent(raw)) : raw;
    // Support both shapes (older/newer helpers)
    if (parsed?.access_token) return parsed.access_token as string;
    if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token as string;
  } catch {
    // ignore and fall through
  }
  return null;
}

async function getUserFromRequest(req: NextApiRequest): Promise<User | null> {
  // Prefer Authorization: Bearer <token>
  const authHeader = req.headers.authorization || '';
  let token: string | null = null;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = getCookieToken(req);
  }
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function getRoleForUser(user: User): Promise<AppRole | null> {
  // 1) app_metadata / user_metadata
  const metaRole =
    (user.app_metadata?.role as AppRole | undefined) ??
    (user.user_metadata?.role as AppRole | undefined);
  if (metaRole) return metaRole;

  // 2) DB profile (your schema uses profiles)
  const { data: prof } = await supabaseAdmin
    .from('profiles') // <-- ensure this table exists in your project
    .select('role')
    .eq('id', user.id)
    .single();

  const dbRole = prof?.role as AppRole | undefined;
  return dbRole ?? null;
}

/**
 * Strict role assertion (does NOT write to response).
 * Throws Error('unauthorized'|'forbidden') for callers who want try/catch.
 */
export async function assertRole(
  req: NextApiRequest,
  allowed: AppRole | AppRole[]
): Promise<{ user: User; role: AppRole }> {
  const user = await getUserFromRequest(req);
  if (!user) throw new Error('unauthorized');

  const role = await getRoleForUser(user);
  if (!role) throw new Error('forbidden');

  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(role)) throw new Error('forbidden');

  return { user, role };
}

/**
 * SSR/API-friendly guard.
 * - If `res` is provided, it will handle redirects and return `false` on failure (no thrown error).
 * - If `res` is omitted, behaves like `assertRole` (throws).
 *
 * Usage in `getServerSideProps`:
 *   const ok = await requireRole(ctx.req, ctx.res, 'admin');
 *   if (!ok) return { redirect: { destination: '/login', permanent: false } };
 */
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse | undefined,
  allowed: AppRole | AppRole[]
): Promise<boolean>;
export async function requireRole(
  req: NextApiRequest,
  allowed: AppRole | AppRole[]
): Promise<{ user: User; role: AppRole }>;
export async function requireRole(
  req: NextApiRequest,
  resOrAllowed: NextApiResponse | AppRole | AppRole[] | undefined,
  maybeAllowed?: AppRole | AppRole[]
): Promise<boolean | { user: User; role: AppRole }> {
  // Overload resolution
  const hasRes = !!maybeAllowed;
  const res = (hasRes ? (resOrAllowed as NextApiResponse) : undefined) as NextApiResponse | undefined;
  const allowed = (hasRes ? maybeAllowed : resOrAllowed) as AppRole | AppRole[];

  // No response provided -> throw on failure
  if (!res) {
    return assertRole(req, allowed);
  }

  // With response provided -> handle redirects and return boolean
  try {
    await assertRole(req, allowed);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unauthorized';
    if (msg === 'unauthorized') {
      // Not logged in → login
      res.writeHead(302, { Location: '/login' });
      res.end();
    } else {
      // Logged in but wrong role → restricted
      res.writeHead(302, { Location: '/restricted' });
      res.end();
    }
    return false;
  }
}
