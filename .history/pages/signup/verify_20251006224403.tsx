// pages/signup/verify.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';

export default function VerifyEmail() {
  const router = useRouter();
  const email = (router.query.email as string) || '';
  const role = (router.query.role as string) || '';
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    try {
      setBusy(true);
      setMsg(null);
      await supabaseBrowser.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            `/onboarding/goal${role ? `?role=${encodeURIComponent(role)}` : ''}`
          )}`,
        },
      });
      setMsg('We sent a new verification link. Please check your inbox (and spam).');
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to resend. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-h3 mb-2">Check your email</h1>
      <p className="text-mutedText mb-6">
        We sent a verification link to <strong>{email || 'your email'}</strong>. Click it to continue.
      </p>

      {msg && <Alert variant="info" title="Info" className="mb-4">{msg}</Alert>}

      <div className="flex gap-3">
        <Button onClick={resend} loading={busy} loadingText="Resending…">
          Resend link
        </Button>
        <Link href={`/signup/email${role ? `?role=${encodeURIComponent(role)}` : ''}`} className="btn">
          Use a different email
        </Link>
        <Link href="/login" className="btn btn-ghost">Back to login</Link>
      </div>
    </main>
  );
}
