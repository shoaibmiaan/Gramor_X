import type { NextApiResponse } from 'next';
import type { NextApiRequest } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveUserRole } from '@/lib/serverRole';
import type { AppRole } from '@/lib/roles';
import type { AuthErrorCode, AuthErrorResponse } from '@/types/auth';
import type { User } from '@/types/user';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? (code === 'unauthorized' ? 'Unauthorized' : 'Forbidden'));
    this.name = 'AuthError';
    this.code = code;
  }
}

export function writeAuthError(
  res: NextApiResponse,
  code: AuthErrorCode,
  message?: string,
): NextApiResponse<AuthErrorResponse> {
  return res.status(code === 'unauthorized' ? 401 : 403).json({
    ok: false,
    error: code,
    message: message ?? (code === 'unauthorized' ? 'Unauthorized' : 'Forbidden'),
  });
}

export async function getAuthenticatedUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new AuthError('unauthorized', error.message);
  }
  return data.user ?? null;
}

export async function requireAuth(supabase: SupabaseClient): Promise<User> {
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    throw new AuthError('unauthorized');
  }
  return user;
}

export async function requireRole(
  supabase: SupabaseClient,
  allowedRoles: AppRole | AppRole[],
): Promise<{ user: User; role: AppRole }> {
  const user = await requireAuth(supabase);
  const role = await resolveUserRole(user);
  const allowList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!role || !allowList.includes(role)) {
    throw new AuthError('forbidden');
  }

  return { user, role };
}

export async function requireApiAuth(req: NextApiRequest, res: NextApiResponse): Promise<User> {
  const supabase = createSupabaseServerClient({ req, res });
  return requireAuth(supabase);
}

export async function requireApiRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: AppRole | AppRole[],
): Promise<{ user: User; role: AppRole }> {
  const supabase = createSupabaseServerClient({ req, res });
  return requireRole(supabase, allowedRoles);
}
