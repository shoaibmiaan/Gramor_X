import type { Session, User } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getAuthErrorMessage } from '@/lib/authErrors';
import { buildPkcePair, readStoredPkceVerifier, submitPkceSignup } from '@/lib/auth/pkce';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type JsonRecord = Record<string, unknown>;

export type LoginResponse = {
  session: Session | null;
  mfaRequired: boolean;
};

export type PhoneOtpInput = {
  phone: string;
  shouldCreateUser: boolean;
  data?: Record<string, string>;
};

export type VerifyEmailOtpInput = {
  email: string;
  token: string;
};

async function postJson<T>(url: string, body?: JsonRecord, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    credentials: 'same-origin',
    ...init,
    body: body ? JSON.stringify(body) : init.body,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof payload?.error === 'string'
        ? payload.error
        : getAuthErrorMessage(payload?.error) ?? 'Auth request failed.';
    throw new Error(msg);
  }

  return payload as T;
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/api/auth/login', { email, password });
}

export async function syncServerSession(session: Session | null, event = 'SIGNED_IN') {
  const response = await postJson<{ ok?: boolean }>('/api/auth/set-session', { event, session });
  return response.ok !== false;
}

export async function recordLoginEvent(session?: Session | null, allowResync = true): Promise<void> {
  try {
    const res = await fetch('/api/auth/login-event', { method: 'POST', credentials: 'same-origin' });
    if (res.status === 401 && allowResync && session) {
      const resynced = await syncServerSession(session, 'SIGNED_IN').catch(() => false);
      if (resynced) await recordLoginEvent(session, false);
      return;
    }
  } catch {
    // non-blocking telemetry
  }
}

export async function setClientSession(session: Session) {
  await supabaseBrowser.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();
  return user ?? null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();
  return session ?? null;
}



export async function createMfaChallengeForUser(user: User | null) {
  const factors = (user as any)?.factors ?? [];
  if (!factors.length) return { factorId: null, challengeId: null };

  const factor = factors[0];
  const { data: challenge, error } = await supabaseBrowser.auth.mfa.challenge({ factorId: factor.id });
  if (error) {
    return { factorId: null, challengeId: null, error: getAuthErrorMessage(error) };
  }

  return { factorId: factor.id as string, challengeId: challenge?.id ?? null };
}

export async function verifyMfaOtp(
  factorId: string,
  challengeId: string,
  code: string,
  onVerified?: () => void | Promise<void>,
) {
  const { error } = await supabaseBrowser.auth.mfa.verify({ factorId, challengeId, code });
  if (error) {
    return { error: getAuthErrorMessage(error) };
  }

  await getCurrentSession();
  setTimeout(() => {
    void onVerified?.();
  }, 50);

  const session = await getCurrentSession();
  void recordLoginEvent(session);

  return { error: null };
}

export async function requestPhoneOtp({ phone, shouldCreateUser, data }: PhoneOtpInput) {
  return supabaseBrowser.auth.signInWithOtp({ phone, options: { shouldCreateUser, data } });
}

export async function verifyPhoneSignupOtp(phone: string, token: string) {
  return supabaseBrowser.auth.verifyOtp({ phone, token, type: 'sms' });
}

export async function verifyPhoneLoginOtp(phone: string, token: string) {
  // Existing behavior used signInWithOtp(token) for login path.
  // @ts-expect-error token login is supported by supabase-js runtime.
  return supabaseBrowser.auth.signInWithOtp({ phone, token });
}

export async function markUserActive() {
  try {
    await supabaseBrowser.auth.updateUser({ data: { status: 'active' } });
  } catch {
    // non-blocking profile update
  }
}

export async function redeemReferral(code: string, accessToken: string) {
  await postJson('/api/referrals/redeem', { code }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function notifyOtpResendLimit(phone: string) {
  await postJson('/api/auth/otp-limit', { phone });
}

export async function sendVerificationCode(email: string) {
  return supabaseBrowser.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
}

export async function resendSignupEmail(email: string, emailRedirectTo: string) {
  return supabaseBrowser.auth.resend({
    // @ts-expect-error supabase-js may not expose resend type yet
    type: 'signup',
    email,
    options: { emailRedirectTo },
  });
}

export async function verifyEmailOtp({ email, token }: VerifyEmailOtpInput) {
  const signupAttempt = await supabaseBrowser.auth.verifyOtp({ email, token, type: 'signup' });
  if (!signupAttempt.error) return signupAttempt;

  return supabaseBrowser.auth.verifyOtp({ email, token, type: 'email' });
}

export async function signupWithEmailPkce(input: {
  email: string;
  password: string;
  redirectTo: string;
  role?: string;
}) {
  const pkcePair = await buildPkcePair();
  await submitPkceSignup({
    email: input.email,
    password: input.password,
    redirectTo: input.redirectTo,
    data: { role: input.role || 'student' },
    codeChallenge: pkcePair.challenge,
    codeChallengeMethod: pkcePair.method,
  });

  return pkcePair;
}

export function getStoredPkceVerifier() {
  return readStoredPkceVerifier() || '';
}





export async function exchangeCodeForSession(codeOrUrl: string) {
  return supabaseBrowser.auth.exchangeCodeForSession(codeOrUrl);
}

export async function verifyOtpWithTokenHash(type: string, tokenHash: string) {
  return supabaseBrowser.auth.verifyOtp({ type: type as never, token_hash: tokenHash });
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  return supabaseBrowser.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function verifyRecoveryOtp(email: string, token: string) {
  return supabaseBrowser.auth.verifyOtp({ email, token, type: 'recovery' });
}

export async function verifyTotp(code: string) {
  return supabaseBrowser.auth.verifyOtp({ type: 'totp', token: code });
}

export async function exchangeCodeWithVerifier(authCode: string, codeVerifier: string) {
  return postJson<{ data?: { session?: Session } | Session; error?: string }>('/api/auth/exchange-code', {
    auth_code: authCode,
    code_verifier: codeVerifier,
  });
}

export async function bridgeCurrentSession() {
  const session = await getCurrentSession();
  return syncServerSession(session, 'SIGNED_IN');
}

export async function getProfileRoleAndOnboarding(userId: string) {
  return supabaseBrowser
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', userId)
    .single();
}

export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabaseBrowser
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return null;
  return typeof data?.role === 'string' ? data.role : null;
}


export async function isPasswordReused(password: string) {
  return supabaseBrowser.rpc('password_is_reused', { new_password: password });
}

export async function updatePassword(password: string) {
  return supabaseBrowser.auth.updateUser({ password });
}

export async function signOutAndRedirect(router?: { replace: (path: string) => unknown }) {
  try {
    await supabaseBrowser.auth.signOut({ scope: 'local' } as never);
  } catch {
    // continue sign-out cleanup
  }

  try {
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
  } catch {
    // continue sign-out cleanup
  }

  try {
    localStorage.removeItem('selectedRole');
    sessionStorage.removeItem('selectedRole');
  } catch {
    // ignore storage access issues
  }

  if (typeof window !== 'undefined' && !router) {
    window.location.replace('/login?signedout=1');
    return;
  }

  if (router) {
    await router.replace('/login?signedout=1');
  }
}

export { buildPkcePair, submitPkceSignup };

export class ApiAuthError extends Error {
  statusCode: number;

  constructor(message = 'Unauthorized', statusCode = 401) {
    super(message);
    this.name = 'ApiAuthError';
    this.statusCode = statusCode;
  }
}

export async function requireAuth(req: NextApiRequest, res?: NextApiResponse): Promise<User> {
  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiAuthError('Unauthorized', 401);
  }

  return user;
}
