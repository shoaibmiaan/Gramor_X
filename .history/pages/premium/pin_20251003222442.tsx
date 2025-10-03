// pages/premium/pin.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLocale } from '@/lib/locale';
import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import { ThemeSwitcherPremium } from '@/premium-ui/theme/ThemeSwitcher';
import { PrButton } from '@/premium-ui/components/PrButton';
import { PrCard } from '@/premium-ui/components/PrCard';

function isInternalRoute(url: string): boolean {
  // Only allow same-origin paths
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
}

type VerifyPinError = { error?: string };
type VerifyPinOk = { ok: true };

export default function PremiumPinPage() {
  const router = useRouter();
  const { t } = useLocale();

  const rawNext = (typeof router.query.next === 'string' && router.query.next) || '/premium';
  const nextUrl = isInternalRoute(rawNext) ? rawNext : '/premium';

  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Autofocus + fast-path if cookie already present (API sets pr_pin_ok=1)
  React.useEffect(() => {
    inputRef.current?.focus();
    // quick client-side check; cookie is non-HttpOnly in this flow
    if (typeof document !== 'undefined' && document.cookie.includes('pr_pin_ok=1')) {
      router.replace(nextUrl);
    }
  }, [router, nextUrl]);

  // Keep only digits; cap to 6
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D+/g, '').slice(0, 6);
    setPin(digitsOnly);
  }

  // Paste support (e.g., OTP SMS/Email)
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text') ?? '';
    const digitsOnly = text.replace(/\D+/g, '').slice(0, 6);
    if (digitsOnly) {
      e.preventDefault();
      setPin(digitsOnly);
      // Small UX boost: submit automatically if 6 digits
      if (digitsOnly.length === 6) {
        // Defer so state applies before submit
        setTimeout(() => {
          void submitPin();
        }, 0);
      }
    }
  }

  async function submitPin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pin || loading) return;

    setLoading(true);
    setErr(null);
    setInfo(t?.('premiumPin.verifying') ?? 'Verifying…');

    // Abort any in-flight verify
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/premium/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }), // NOTE: typed payload
        signal: abortRef.current.signal,
      });

      if (res.ok) {
        // Expect cookie pr_pin_ok=1 from API; navigate immediately
        const _ok: VerifyPinOk | undefined = await res.json().catch(() => undefined);
        setInfo(t?.('premiumPin.success') ?? 'Unlocked. Redirecting…');
        await router.replace(nextUrl);
        return;
      }

      const data: VerifyPinError = await res.json().catch(() => ({} as VerifyPinError));
      setErr(data.error ?? (t?.('premiumPin.incorrect') ?? 'Incorrect PIN. Try again.'));
      setInfo(null);
    } catch {
      setErr(t?.('premiumPin.networkError') ?? 'Network error. Please try again.');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumThemeProvider>
      <>
        <Head>
          <title>Enter Premium PIN</title>
          <meta name="robots" content="noindex" />
        </Head>

        <main className="pr-grid pr-place-items-center pr-min-h-[100dvh] pr-p-4">
          <div className="pr-absolute pr-top-4 pr-right-4">
            <ThemeSwitcherPremium />
          </div>

          <section className="pr-w-full pr-max-w-md pr-mx-auto pr-p-2">
            <PrCard className="pr-p-6 md:pr-p-8">
              <h1 className="pr-font-semibold pr-text-h2 pr-mb-2">Enter Premium PIN</h1>
              <p className="pr-muted pr-mb-6">
                Access the distraction-free Premium Exam Room.
              </p>

              <form
                onSubmit={submitPin}
                className="pr-space-y-4"
                noValidate
                aria-busy={loading ? 'true' : 'false'}
              >
                <label className="pr-block">
                  <span className="pr-mb-1.5 pr-inline-block pr-text-small pr-muted">PIN</span>
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="one-time-code"
                    aria-label="Premium PIN"
                    aria-invalid={!!err}
                    aria-describedby={err ? 'pin-error' : undefined}
                    value={pin}
                    onChange={handleChange}
                    onPaste={handlePaste}
                    maxLength={6}
                    disabled={loading}
                    className="pr-w-full pr-rounded-xl pr-border pr-bg-transparent pr-px-4 pr-py-3 focus:pr-outline-none focus:pr-ring-2 focus:pr-ring-[var(--pr-primary)] focus:pr-border-[var(--pr-primary)]"
                    placeholder="••••••"
                  />
                </label>

                {/* Live region for status/errors (a11y) */}
                <div aria-live="polite" className="pr-sr-only">
                  {loading ? (t?.('premiumPin.verifying') ?? 'Verifying…') : err || info || ''}
                </div>

                {err && (
                  <div
                    id="pin-error"
                    role="alert"
                    className="pr-rounded-xl pr-border pr-border-[var(--pr-danger)] pr-bg-[var(--pr-danger-weak,rgba(239,68,68,.1))] pr-text-[var(--pr-danger)] pr-p-3 pr-text-small"
                  >
                    {err}
                  </div>
                )}

                <PrButton
                  type="submit"
                  disabled={loading || pin.length < 4} // allow 4–6 digit pins; adjust if you enforce 6
                  className="pr-w-full pr-justify-center"
                >
                  {loading ? (t?.('premiumPin.verifying') ?? 'Verifying…') : 'Unlock Premium'}
                </PrButton>

                <p className="pr-text-small pr-muted pr-text-center">
                  You’ll be redirected to <span className="pr-font-medium">{nextUrl}</span>.
                </p>
              </form>

              <div className="pr-mt-4 pr-flex pr-justify-center pr-gap-3">
                <Link href="/premium" className="pr-link pr-text-small">
                  ← Back to Premium
                </Link>
                <Link href="/pricing" className="pr-link pr-text-small">
                  View Pricing
                </Link>
              </div>

              <p className="pr-text-small pr-muted pr-text-center pr-mt-4">
                {t('premiumPin.info')}{' '}
                {t('premiumPin.noPinPrefix')}{' '}
                <a href="mailto:support@gramorx.com" className="pr-link">
                  {t('premiumPin.contactSupport')}
                </a>{' '}
                {t('premiumPin.or')}{' '}
                <Link href="/pricing" className="pr-link">
                  {t('premiumPin.viewPricing')}
                </Link>
                .
              </p>
            </PrCard>
          </section>
        </main>
      </>
    </PremiumThemeProvider>
  );
}
