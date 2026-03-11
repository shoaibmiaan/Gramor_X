import type {
  AuthChangeEvent,
  Session,
  User,
  VerifyOtpParams,
  SignInWithPasswordCredentials,
} from '@supabase/supabase-js';

import { api } from '@/lib/api';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabaseClient';

export type AuthResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const DEFAULT_AUTH_ERROR = 'Unable to continue. Please try again.';

function mapAuthError(error: unknown, fallback = DEFAULT_AUTH_ERROR): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return getAuthErrorMessage(error) || error.message || fallback;
  return fallback;
}

export function resolveAuthRedirect(next?: string | null, fallback = '/dashboard') {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('/login') || next.startsWith('/signup')) return fallback;
  return next;
}

export async function loginEmail(payload: SignInWithPasswordCredentials): Promise<AuthResult<{ session: Session | null; mfaRequired?: boolean }>> {
  try {
    const { data } = await api.auth.login({
      email: payload.email,
      password: payload.password,
    });

    if (!data.session) {
      return { ok: false, error: mapAuthError(data.error, 'Unable to sign in. Please try again.') };
    }

    const { data: setSessionData, error } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (error) {
      return { ok: false, error: mapAuthError(error, 'Unable to set your session.') };
    }

    await api.auth.setSession(data.session);

    return { ok: true, data: { session: setSessionData.session, mfaRequired: data.mfaRequired } };
  } catch (error) {
    return { ok: false, error: mapAuthError(error, 'Unable to sign in. Please try again.') };
  }
}

export const loginPassword = loginEmail;


export async function loginEmailOtp(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    return { ok: !error, error: error ? mapAuthError(error) : undefined };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function loginPhoneOtp(payload: { phone: string; token?: string; shouldCreateUser?: boolean }): Promise<AuthResult<{ session: Session | null; user: User | null }>> {
  try {
    if (payload.token) {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: payload.phone,
        token: payload.token,
        type: 'sms',
      });
      if (error) return { ok: false, error: mapAuthError(error) };
      return { ok: true, data: { session: data.session, user: data.user } };
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: payload.phone,
      options: { shouldCreateUser: payload.shouldCreateUser ?? false },
    });
    if (error) return { ok: false, error: mapAuthError(error) };
    return { ok: true, data: { session: null, user: null } };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function signupEmail(payload: { email: string; data?: Record<string, unknown>; emailRedirectTo?: string }): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: payload.email,
      options: {
        shouldCreateUser: true,
        data: payload.data,
        emailRedirectTo: payload.emailRedirectTo,
      },
    });
    if (error) return { ok: false, error: mapAuthError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function signupPhone(payload: { phone: string; data?: Record<string, unknown> }): Promise<AuthResult> {
  const result = await loginPhoneOtp({ phone: payload.phone, shouldCreateUser: true });
  return { ok: result.ok, error: result.error };
}

export async function verifyOtp(payload: VerifyOtpParams): Promise<AuthResult<{ session: Session | null; user: User | null }>> {
  try {
    const { data, error } = await supabase.auth.verifyOtp(payload);
    if (error) return { ok: false, error: mapAuthError(error) };
    return { ok: true, data: { session: data.session, user: data.user } };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    await supabase.auth.signOut({ scope: 'local' } as never);
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapAuthError(error, 'Unable to sign out right now.') };
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error: error ? mapAuthError(error) : null };
}

export async function validateToken(token?: string | null): Promise<AuthResult<{ user: User | null }>> {
  try {
    if (!token) return { ok: false, error: 'Missing token' };
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return { ok: false, error: mapAuthError(error, 'Invalid token') };
    return { ok: true, data: { user: data.user } };
  } catch (error) {
    return { ok: false, error: mapAuthError(error, 'Invalid token') };
  }
}

export async function resendOtp(payload: { type: 'signup' | 'email_change' | 'phone_change' | 'sms'; email?: string; phone?: string; options?: { emailRedirectTo?: string } }) {
  const { error } = await supabase.auth.resend(payload as any);
  return { ok: !error, error: error ? mapAuthError(error) : null };
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { ok: !error, error: error ? mapAuthError(error) : null };
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  return { ok: !error, error: error ? mapAuthError(error, 'Unable to update password.') : null };
}

export async function updateUserMetadata(data: Record<string, unknown>) {
  const { error } = await supabase.auth.updateUser({ data });
  return { ok: !error, error: error ? mapAuthError(error) : null };
}

export async function exchangeCodeForSession(codeOrUrl: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(codeOrUrl);
  return { data, error: error ? mapAuthError(error) : null };
}

export async function setSession(session: { access_token: string; refresh_token: string }) {
  const { data, error } = await supabase.auth.setSession(session);
  return { data, error: error ? mapAuthError(error) : null };
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error: error ? mapAuthError(error) : null };
}

export async function recordLoginEvent() {
  try {
    await api.auth.loginEvent();
  } catch {
    // non-fatal
  }
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function createMfaChallenge(factorId: string) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  return { data, error: error ? mapAuthError(error) : null };
}

export async function verifyMfaChallenge(factorId: string, challengeId: string, code: string) {
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  return { ok: !error, error: error ? mapAuthError(error) : null };
}
