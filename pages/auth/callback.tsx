import type { GetServerSideProps } from 'next';
import { createServerSupabaseClient, exchangeAndSetSession } from '@/lib/auth/server';
import { setAuthCookies } from '@/lib/auth/cookies';

const HOME = '/dashboard';

function safeNext(next: string | string[] | undefined) {
  const value = typeof next === 'string' ? next : Array.isArray(next) ? next[0] : '';
  if (!value || !value.startsWith('/') || value.startsWith('//')) return HOME;
  if (/^\/auth\//.test(value) || /^\/(login|signup)(\/|$)/.test(value)) return HOME;
  return value;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  const next = safeNext(query.next);

  const code = typeof query.code === 'string' ? query.code : '';
  const tokenHash = typeof query.token_hash === 'string' ? query.token_hash : '';
  const type = typeof query.type === 'string' ? query.type : '';

  try {
    if (code) {
      const exchanged = await exchangeAndSetSession(req as any, res as any, code);
      if (!exchanged.ok) {
        return { redirect: { destination: '/login?error=callback_exchange_failed', permanent: false } };
      }
      return { redirect: { destination: next, permanent: false } };
    }

    if (tokenHash && type) {
      const supabase = createServerSupabaseClient(req as any, res as any);
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
      if (error || !data.session?.access_token || !data.session.refresh_token) {
        return { redirect: { destination: '/login?error=callback_verify_failed', permanent: false } };
      }

      setAuthCookies(res as any, {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        expiresIn: data.session.expires_in,
      });

      return { redirect: { destination: next, permanent: false } };
    }
  } catch {
    return { redirect: { destination: '/login?error=callback_failed', permanent: false } };
  }

  return { redirect: { destination: HOME, permanent: false } };
};

export default function AuthCallbackPage() {
  return null;
}
