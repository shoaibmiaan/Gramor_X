'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Input } from '@/components/design-system/Input';
import { PasswordInput } from '@/components/design-system/PasswordInput';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { isValidEmail } from '@/utils/validation';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function SignUpWithEmail() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      setErr('Email and passwords are required.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailErr('Enter a valid email address.');
      return;
    }
    setEmailErr(null);

    if (password !== confirmPassword) {
      setPasswordErr('Passwords do not match.');
      return;
    }
    setPasswordErr(null);

    setLoading(true);
    try {
      const { user, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      setLoading(false);

      if (error) {
        // If email is already used, resend verification email
        if (error.message.includes('User already registered')) {
          const { error: resendError } = await supabase.auth.resendVerificationEmail(trimmedEmail);
          if (resendError) {
            setErr('Unable to resend the verification email. Please try again.');
            return;
          }
          setErr('Verification email has been resent. Check your inbox.');
          return;
        }
        setErr(error.message);
        return;
      }

      // If a referral code is provided, store it or link it to the user
      if (referralCode) {
        await supabase.from('referrals').insert([{ email: trimmedEmail, referral_code: referralCode }]);
      }

      // Successful sign up
      setErr('Check your email for a verification link!');
    } catch (err) {
      setLoading(false);
      setErr('Unable to sign up. Please try again.');
    }
  }

  return (
    <>
      <SectionLabel>Sign Up with Email</SectionLabel>

      {err && (
        <Alert variant="warning" title="Error" className="mb-4" role="status" aria-live="assertive">
          {err}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6 mt-2">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          error={emailErr ?? undefined}
        />
        <PasswordInput
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          error={passwordErr ?? undefined}
        />
        <Input
          label="Referral Code (Optional)"
          type="text"
          placeholder="Enter referral code (if any)"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />
        <Button type="submit" variant="primary" className="rounded-ds-xl" fullWidth disabled={loading}>
          {loading ? 'Signing Up…' : 'Sign Up'}
        </Button>
        <Button asChild variant="link" className="mt-2" fullWidth>
          <Link href="/login">Already have an account? Log in</Link>
        </Button>
        <p className="mt-2 text-caption text-mutedText text-center">
          By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> &amp; <Link href="/legal/privacy" className="underline">Privacy</Link>.
        </p>
      </form>

      {err && err.includes('Verification email has been resent') && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox`, '_blank')}
          >
            Go to Inbox
          </Button>
        </div>
      )}

      {/* Back to Sign Up Methods (Index) Button */}
      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={() => window.location.href = '/'} // Redirect to the index page
        >
          Back to Sign Up Methods
        </Button>
      </div>
    </>
  );
}
