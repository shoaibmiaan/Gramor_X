import { beforeEach, describe, expect, it, vi } from 'vitest';

const setSessionMock = vi.fn();
const signInWithOtpMock = vi.fn();
const verifyOtpMock = vi.fn();
const getSessionMock = vi.fn();
const getUserMock = vi.fn();
const signOutMock = vi.fn();
const resendMock = vi.fn();
const resetPasswordMock = vi.fn();
const updateUserMock = vi.fn();
const exchangeCodeMock = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      setSession: setSessionMock,
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
      getSession: getSessionMock,
      getUser: getUserMock,
      signOut: signOutMock,
      resend: resendMock,
      resetPasswordForEmail: resetPasswordMock,
      updateUser: updateUserMock,
      exchangeCodeForSession: exchangeCodeMock,
      onAuthStateChange: vi.fn(),
      mfa: {
        challenge: vi.fn(),
        verify: vi.fn(),
      },
    },
  },
}));

const apiLoginMock = vi.fn();
const apiSetSessionMock = vi.fn();
const apiLoginEventMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: apiLoginMock,
      setSession: apiSetSessionMock,
      loginEvent: apiLoginEventMock,
    },
  },
}));

import { loginEmail, loginPhoneOtp, signupPhone, verifyOtp, resolveAuthRedirect } from '@/lib/auth';

describe('auth service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loginEmail normalizes API + session setup', async () => {
    apiLoginMock.mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r' }, mfaRequired: false } });
    setSessionMock.mockResolvedValue({ data: { session: { access_token: 'a' } }, error: null });
    apiSetSessionMock.mockResolvedValue({ data: { ok: true } });

    const result = await loginEmail({ email: 'test@example.com', password: 'pw' });

    expect(result.ok).toBe(true);
    expect(apiLoginMock).toHaveBeenCalled();
    expect(setSessionMock).toHaveBeenCalled();
    expect(apiSetSessionMock).toHaveBeenCalled();
  });

  it('loginPhoneOtp verifies sms token', async () => {
    verifyOtpMock.mockResolvedValue({ data: { session: { access_token: 'token' }, user: { id: 'u1' } }, error: null });
    const result = await loginPhoneOtp({ phone: '+1234567890', token: '123456' });

    expect(result.ok).toBe(true);
    expect(verifyOtpMock).toHaveBeenCalledWith({ phone: '+1234567890', token: '123456', type: 'sms' });
  });

  it('signupPhone delegates to OTP sign-in path', async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const result = await signupPhone({ phone: '+1234567890' });
    expect(result.ok).toBe(true);
    expect(signInWithOtpMock).toHaveBeenCalled();
  });

  it('verifyOtp wraps supabase verifyOtp', async () => {
    verifyOtpMock.mockResolvedValue({ data: { session: null, user: null }, error: null });
    const result = await verifyOtp({ email: 'test@example.com', token: '111111', type: 'signup' });
    expect(result.ok).toBe(true);
  });

  it('resolveAuthRedirect sanitizes unsafe targets', () => {
    expect(resolveAuthRedirect('https://evil.site', '/dashboard')).toBe('/dashboard');
    expect(resolveAuthRedirect('/login', '/dashboard')).toBe('/dashboard');
    expect(resolveAuthRedirect('/safe/path', '/dashboard')).toBe('/safe/path');
  });
});
