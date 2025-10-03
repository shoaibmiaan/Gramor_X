'use client';

import * as React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Icon } from '@/components/design-system/Icon';
import { supabase } from '@/lib/supabaseClient';
import { supabase } from '@/lib/supabaseClient';


export default function PremiumPinPage() {
  const router = useRouter();
  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Ensure the user is premium before accessing the PIN
  React.useEffect(() => {
    // Checking if the user is logged in and has the correct subscription plan
    const checkSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect if the user is not logged in
        router.push(`/login?next=${router.asPath}`);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();

        // If the user does not have a premium plan, redirect to pricing page
        if (profile?.plan !== 'premium') {
          router.push(`/pricing?reason=premium_required&next=${encodeURIComponent(router.asPath)}`);
        }
      }
    };

    checkSubscription();
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = pin.trim();
    if (!trimmed) {
      setError('Please enter your premium PIN.');
      return;
    }
    try {
      setLoading(true);
      // Call your existing API (adjust endpoint if different)
      const res = await fetch('/api/premium/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: trimmed }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Invalid PIN. Please try again.');
      }

      // On success, navigate to Premium Earth dashboard/home (update path as needed)
      router.replace('/premium');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="mx-auto grid min-h-[100dvh] max-w-lg place-items-center bg-background px-4 py-12 text-foreground">
        <section className="w-full rounded-2xl border border-[rgb(var(--color-foreground)_/_0.12)] bg-[rgb(var(--color-background)_/_0.6)] p-6 shadow-md backdrop-blur-md">
          <header className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
              <Icon name="key" aria-hidden className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-h3 font-semibold leading-tight">Premium Access</h1>
              <p className="text-small text-muted-foreground">Enter your PIN to unlock premium features.</p>
            </div>
          </header>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <label htmlFor="pin" className="block text-small font-medium">
              Access PIN
            </label>
            <Input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              value={pin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'pin-error' : undefined}
              className="w-full"
            />

            {error ? (
              <p id="pin-error" role="alert" className="text-small text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
              aria-busy={loading ? 'true' : 'false'}
            >
              {loading ? 'Verifying…' : 'Continue'}
            </Button>

            <p className="text-center text-caption text-muted-foreground">
              Having trouble? <a href="/support" className="underline underline-offset-2">Contact support</a>
            </p>
          </form>
        </section>
      </main>
    </>
  );
}
