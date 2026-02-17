// pages/auth/confirm.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const run = async () => {
      const { token_hash, type } = router.query;

      const tokenHash =
        typeof token_hash === 'string' && token_hash.length > 0 ? token_hash : null;

      if (!tokenHash) {
        // No token → nothing to verify, send them to login
        router.replace('/login?error=missing_token');
        return;
      }

      const verificationType =
        typeof type === 'string' && type.length > 0
          ? (type as 'signup' | 'magiclink' | 'recovery' | 'email_change')
          : 'signup';

      try {
        const supabase = supabaseBrowser();

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: verificationType,
        });

        if (error) {
          // Verification failed → go back to login
          console.error('Email verification failed:', error);
          router.replace('/login?error=verification_failed');
          return;
        }

        // ✅ At this point:
        // - supabaseBrowser has a valid session
        // - _app.tsx onAuthStateChange will POST to /api/auth/set-session
        // - cookies get synced on the server
        // -> We can safely send them into onboarding.
        router.replace('/onboarding');
      } catch (err) {
        console.error('Unexpected error during email verification:', err);
        router.replace('/login?error=verification_failed');
      }
    };

    void run();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border px-6 py-8 text-center shadow-sm">
        <p className="text-base font-medium">Verifying your email…</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This usually takes just a moment. Please don’t close this tab.
        </p>
      </div>
    </div>
  );
}
