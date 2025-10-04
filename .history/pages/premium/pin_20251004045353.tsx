// pages/premium/pin.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLocale } from '@/lib/locale';
import { ThemeSwitcherPremium } from '@/premium-ui/theme/ThemeSwitcher';
import { PrButton } from '@/premium-ui/components/PrButton';
import { PrCard } from '@/premium-ui/components/PrCard';

function isInternalRoute(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
}

type VerifyPinError = { error?: string };

type PinInputProps = {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  invalid?: boolean;
};

const PinInput = React.forwardRef<HTMLDivElement, PinInputProps>(
  ({ length = 6, value, onChange, disabled, invalid }, ref) => {
    const inputs = React.useRef<Array<HTMLInputElement | null>>([]);
    const [reveal, setReveal] = React.useState(false);

    React.useEffect(() => {
      inputs.current = inputs.current.slice(0, length);
    }, [length]);

    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    const setChar = (idx: number, char: string) => {
      const clean = char.replace(/\D/g, '').slice(0, 1);
      if (!clean) return;
      const next = value.split('');
      next[idx] = clean;
      onChange(next.join('').slice(0, length));
      const nextIdx = Math.min(idx + 1, length - 1);
      inputs.current[nextIdx]?.focus();
      inputs.current[nextIdx]?.select?.();
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const next = value.split('');
        if (next[idx]) {
          next[idx] = '';
          onChange(next.join(''));
        } else {
          const prevIdx = Math.max(idx - 1, 0);
          inputs.current[prevIdx]?.focus();
          const n2 = value.split('');
          n2[prevIdx] = '';
          onChange(n2.join(''));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        inputs.current[Math.max(idx - 1, 0)]?.focus();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        inputs.current[Math.min(idx + 1, length - 1)]?.focus();
      }
    };

    const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const clip = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!clip) return;
      const next = value.split('');
      for (let i = 0; i < clip.length && idx + i < length; i++) {
        next[idx + i] = clip[i];
      }
      onChange(next.join(''));
      inputs.current[Math.min(idx + clip.length, length - 1)]?.focus();
    };

    return (
      <div ref={ref} className="pr-space-y-2">
        {/* Force a single row with fixed-size boxes (inline width/height beats global input {width:100%}) */}
        <div className={['pr-flex pr-gap-2 sm:pr-gap-3 pr-justify-between', disabled ? 'pr-opacity-70 pr-pointer-events-none' : ''].join(' ')}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              inputMode="numeric"
              pattern="\d*"
              name="one-time-code"
              autoComplete="one-time-code"
              aria-label={`PIN digit ${i + 1}`}
              aria-invalid={invalid ? 'true' : 'false'}
              type={reveal ? 'text' : 'password'}
              value={d}
              onFocus={(e) => e.currentTarget.select?.()}
              onChange={(e) => setChar(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(i, e)}
              // Fixed size so they line up horizontally even if global CSS sets input { width: 100% }
              style={{ width: 48, height: 56 }}
              className={[
                'pr-rounded-xl pr-text-center pr-text-h4 pr-font-semibold pr-leading-none',
                'pr-border pr-border-[var(--pr-border)] pr-bg-[color-mix(in oklab,var(--pr-card),transparent 0%)]',
                'focus:pr-outline-none focus:pr-ring-2 focus:pr-ring-[var(--pr-primary)] focus:pr-border-[var(--pr-primary)]',
                invalid ? 'pr-border-[var(--pr-danger)] focus:pr-ring-[var(--pr-danger)]' : '',
                'pr-transition pr-duration-200 pr-shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--pr-fg),transparent_92%)]',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="pr-flex pr-items-center pr-justify-between pr-text-small pr-muted">
          <span>Tip: Paste your 6-digit PIN</span>
          <label className="pr-inline-flex pr-items-center pr-gap-2 pr-cursor-pointer">
            <input
              type="checkbox"
              className="pr-accent-[var(--pr-primary)]"
              checked={reveal}
              onChange={() => setReveal((v) => !v)}
            />
            <span>{reveal ? 'Hide' : 'Show'}</span>
          </label>
        </div>
      </div>
    );
  }
);
PinInput.displayName = 'PinInput';

export default function PremiumPinPage() {
  const router = useRouter();
  const { t } = useLocale();

  const rawNext =
    typeof router.query.next === 'string' && router.query.next ? router.query.next : '/premium';
  const nextUrl = isInternalRoute(rawNext) ? rawNext : '/premium';

  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const first = formRef.current?.querySelector<HTMLInputElement>('input[aria-label="PIN digit 1"]');
    first?.focus();
    first?.select?.();
  }, []);

  async function submitPin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pin || loading) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch('/api/premium/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        await router.replace(nextUrl);
        return;
      }

      const data: VerifyPinError = await res.json().catch(() => ({} as VerifyPinError));
      setErr(data.error ?? 'Incorrect PIN. Try again.');
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const pinComplete = pin.replace(/\D/g, '').length === 6;

  return (
    <>
      <Head>
        <title>Enter Premium PIN</title>
      </Head>

      <main className="pr-grid pr-place-items-center pr-min-h-[100dvh] pr-p-4">
        <div className="pr-absolute pr-top-4 pr-right-4">
          <ThemeSwitcherPremium />
        </div>

        <section className="pr-w-full pr-max-w-md pr-mx-auto pr-p-2">
          <PrCard className="pr-p-6 md:pr-p-8">
            <h1 className="pr-font-semibold pr-text-h2 pr-mb-2">Enter Premium PIN</h1>
            <p className="pr-muted pr-mb-6">Access the distraction-free Premium Exam Room.</p>

            <form ref={formRef} onSubmit={submitPin} className="pr-space-y-4" noValidate>
              <label className="pr-block">
                <span className="pr-mb-1.5 pr-inline-block pr-text-small pr-muted">PIN</span>
                <PinInput value={pin} onChange={setPin} disabled={loading} invalid={Boolean(err)} length={6} />
              </label>

              {err && (
                <div
                  role="alert"
                  className="pr-rounded-xl pr-border pr-border-[var(--pr-danger)] pr-bg-[color-mix(in oklab,var(--pr-danger),var(--pr-bg) 90%)] pr-text-[var(--pr-danger)] pr-p-3 pr-text-small"
                >
                  {err}
                </div>
              )}

              <PrButton type="submit" disabled={loading || !pinComplete} className="pr-w-full pr-justify-center">
                {loading ? 'Verifying…' : 'Unlock Premium'}
              </PrButton>

              <p className="pr-text-small pr-muted pr-text-center">
                You’ll be redirected to <span className="pr-font-medium">{nextUrl}</span>.
              </p>
            </form>

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
  );
}
