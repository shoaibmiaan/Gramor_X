import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { createMfaChallenge, verifyMfaChallenge, getSession, recordLoginEvent } from '@/lib/auth';
import { getAuthErrorMessage } from '@/lib/authErrors';

export async function createMfaChallengeForUser(user: User | null) {
  const factors = (user as any)?.factors ?? [];
  if (!factors.length) return { factorId: null, challengeId: null };
  const f = factors[0];
  const { data: challenge, error } = await createMfaChallenge(f.id as string);
  if (error) {
    return { factorId: null, challengeId: null, error: getAuthErrorMessage(error) };
  }
  return { factorId: f.id as string, challengeId: challenge?.id ?? null };
}

export async function verifyMfaOtp(
  factorId: string,
  challengeId: string,
  code: string,
  onVerified?: () => void | Promise<void>,
) {
  const verification = await verifyMfaChallenge(factorId, challengeId, code);
  if (!verification.ok) {
    return { error: getAuthErrorMessage(verification.error) };
  }

  await getSession();

  setTimeout(() => {
    void onVerified?.();
  }, 50);

  void recordLoginEvent();

  return { error: null };
}

export default function useEmailLoginMFA() {
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createChallenge(user: User | null, onVerified?: () => void | Promise<void>) {
    const res = await createMfaChallengeForUser(user);
    if (res.error) {
      setError(res.error);
      return true;
    }
    if (res.factorId && res.challengeId) {
      setFactorId(res.factorId);
      setChallengeId(res.challengeId);
      setOtpSent(true);
      return true;
    }

    if (onVerified) {
      await onVerified();
      return true;
    }

    return false;
  }

  async function verifyOtp(e?: React.FormEvent, onVerified?: () => void | Promise<void>) {
    if (e) e.preventDefault();
    if (!factorId || !challengeId) return;
    setVerifying(true);
    const res = await verifyMfaOtp(factorId, challengeId, otp, onVerified);
    setVerifying(false);
    if (res.error) setError(res.error);
  }

  return { otp, setOtp, otpSent, createChallenge, verifyOtp, verifying, error, setError };
}
