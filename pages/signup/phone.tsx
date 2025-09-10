'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { isValidE164Phone } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function SignupWithPhone() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'request' | 'verify'>('request');
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referral, setReferral] = useState('');
  const [resending, setResending] = useState(false);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  const MAX_RESENDS = Number(process.env.NEXT_PUBLIC_MAX_RESEND_ATTEMPTS ?? 3);
  const RESEND_COOLDOWN = Number(process.env.NEXT_PUBLIC_RESEND_COOLDOWN ?? 30);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (typeof router.query.ref === 'string') {
      setReferral(router.query.ref);
    }
  }, [router.query.ref]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmedPhone = phone.trim();
    if (!isValidE164Phone(trimmedPhone)) {
      setPhoneErr('Enter your phone number in E.164 format, e.g. +923001234567');
      return;
    }
    setPhoneErr(null);
    setLoading(true);

    const data: Record<string, string> = { status: 'pending_verification' };
    if (referral) data.referral_code = referral.trim();

    const { error } = await supabase.auth.signInWithOtp({
      phone: trimmedPhone,
      options: { shouldCreateUser: true, data },
    });

    setLoading(false);
    if (error) return setErr(getAuthErrorMessage(error));
    setResendAttempts(0);
    setCooldown(RESEND_COOLDOWN);
    setStage('verify');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!code) return setErr('Enter the 6-digit code.');

    setLoading(true);
    const trimmedPhone = phone.trim();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: trimmedPhone,
      token: code,
      type: 'sms',
    });
    setLoading(false);

    if (error) return setErr(getAuthErrorMessage(error));

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      try { await supabase.auth.updateUser({ data: { status: 'active' } }); } catch {}
      if (referral) {
        try {
          await fetch('/api/referrals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ code: referral.trim() }),
          });
        } catch {}
      }
      window.location.assign('/welcome');
    }
  }

  async function resendOtp() {
    if (resendAttempts >= MAX_RESENDS || cooldown > 0) return;
    setErr(null);
    setResending(true);
    setLoading(true);
    try {
      const trimmedPhone = phone.trim();
      const data: Record<string, string> = { status: 'pending_verification' };
      if (referral) data.referral_code = referral.trim();
      const { error } = await supabase.auth.signInWithOtp({
        phone: trimmedPhone,
        options: { shouldCreateUser: true, data },
      });
      if (error) return setErr(getAuthErrorMessage(error));
      setResendAttempts((a) => a + 1);
      setCooldown(RESEND_COOLDOWN);
      try {
        await fetch('/api/auth/otp-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: trimmedPhone }),
        });
      } catch {}
    } finally {
      setLoading(false);
      setResending(false);
    }
  }

  return (
    <>
      {err && (
        <Alert variant="error" title="Error" className="mb-4">
          {err}
        </Alert>
      )}

      {stage === 'request' ? (
        <form onSubmit={requestOtp} className="space-y-6 mt-2">
          <Input
            label="Phone number"
            type="tel"
            placeholder="+923001234567"
            value={phone}
            onChange={(e) => {
              const v = e.target.value;
              setPhone(v);
              setPhoneErr(!v || isValidE164Phone(v.trim()) ? null : 'Enter your phone number in E.164 format, e.g. +923001234567');
            }}
            required
            hint="Use E.164 format, e.g. +923001234567"
            error={phoneErr ?? undefined}
          />
          <Input
            label="Referral code (optional)"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />
          <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={loading}>
            {loading ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-6 mt-2">
          <Input
            label="Verification code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="primary"
            className="rounded-ds-xl"
            fullWidth
            disabled={loading && !resending}
          >
            {loading && !resending ? 'Verifying…' : 'Verify & Continue'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-ds-xl"
            fullWidth
            onClick={resendOtp}
            disabled={loading || cooldown > 0 || resendAttempts >= MAX_RESENDS}
          >
            {loading && resending
              ? 'Resending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : resendAttempts >= MAX_RESENDS
                  ? 'Resend limit reached'
                  : `Resend code (${MAX_RESENDS - resendAttempts} left)`}
          </Button>
          <p className="text-xs text-mutedText text-center">
            We never share your number. Standard SMS rates may apply.
          </p>
          <p className="text-small text-mutedText text-center">
            {resendAttempts >= MAX_RESENDS
              ? 'No resend attempts left.'
              : cooldown > 0
                ? `You can resend the code in ${cooldown}s.`
                : `${MAX_RESENDS - resendAttempts} resend attempts remaining.`}
          </p>
        </form>
      )}

      <Button asChild variant="secondary" className="mt-6 rounded-ds-xl" fullWidth>
        <Link href="/signup">Back to Sign-up Options</Link>
      </Button>
    </>
  );
}
