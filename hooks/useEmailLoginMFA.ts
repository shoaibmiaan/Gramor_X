import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { createMfaChallengeForUser, verifyMfaOtp } from '@/lib/auth';

export { createMfaChallengeForUser, verifyMfaOtp };

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
