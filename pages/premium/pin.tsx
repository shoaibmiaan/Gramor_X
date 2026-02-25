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

const CELLS = 6;

export default function PremiumPinPage() {
  const router = useRouter();
  const { t } = useLocale();

  const rawNext =
    typeof router.query.next === 'string' && router.query.next ? router.query.next : '/premium';
  const nextUrl = isInternalRoute(rawNext) ? rawNext : '/premium';

  const [pinArr, setPinArr] = React.useState<string[]>(Array(CELLS).fill(''));
  const [hidden, setHidden] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function setCharAt(index: number, val: string) {
    setPinArr((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D+/g, '').slice(0, 1);
    setCharAt(index, v);
    if (v && index < CELLS - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pinArr[index] && index > 0) {
      setCharAt(index - 1, '');
      inputsRef.current[index - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && index < CELLS - 1) {
      inputsRef.current[index + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D+/g, '').slice(0, CELLS);
    if (!text) return;
    e.preventDefault();
    const next = Array(CELLS).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i]!;
    setPinArr(next);
    const last = Math.min(text.length, CELLS) - 1;
    inputsRef.current[Math.max(last, 0)]?.focus();
  }

  async function submitPin(e?: React.FormEvent) {
    e?.preventDefault();
    const pin = pinArr.join('');
    if (pin.length !== CELLS || loading) return;

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

  // Cell styles (theme-safe)
  const cellStyle: React.CSSProperties = {
    width: 48,
    height: 56,
    borderRadius: 14,
    border: '1px solid var(--pr-border)',
    background: 'transparent',
    color: 'currentColor',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: '0.02em',
    caretColor: 'var(--pr-primary)',
    boxShadow: 'inset 0 -1px 0 color-mix(in oklab, var(--pr-foreground), transparent 92%)',
    outline: 'none',
    transition: 'border-color .15s ease, box-shadow .15s ease, transform .08s ease',
  };
  const cellFocusStyle: React.CSSProperties = {
    border: '1px solid color-mix(in oklab, var(--pr-primary), white 10%)',
    boxShadow:
      '0 0 0 3px color-mix(in oklab, var(--pr-primary), transparent 80%), inset 0 -1px 0 color-mix(in oklab, var(--pr-primary), transparent 85%)',
    transform: 'translateY(-1px)',
  };

  return (
    <>
      <Head>
        <title>Enter Premium PIN</title>
      </Head>

      {/* Moving background layer */}
      <div className="pr-fixed pr-inset-0 pr-z-[-1]" aria-hidden="true">
        <div className="lux-outer">
          <div className="lux-inner" />
        </div>
      </div>

      <main className="pr-grid pr-place-items-center pr-min-h-[100dvh] pr-p-4">
        <div className="pr-absolute pr-top-4 pr-right-4">
          <ThemeSwitcherPremium />
        </div>

        <section className="pr-w-full pr-max-w-md pr-mx-auto pr-p-2" style={{ color: 'var(--pr-foreground)' }}>
          <PrCard className="pr-p-6 md:pr-p-8 pr-rounded-2xl pr-shadow-[0_8px_40px_-20px_color-mix(in_oklab,var(--pr-foreground),transparent_92%)]">
            <h1 className="pr-font-semibold pr-text-h2 pr-mb-2">Enter Premium PIN</h1>
            <p className="pr-muted pr-mb-6">Access the distraction-free Premium Exam Room.</p>

            <form onSubmit={submitPin} className="pr-space-y-3" noValidate>
              <label className="pr-block">
                <span className="pr-mb-1.5 pr-inline-block pr-text-small pr-muted">PIN</span>

                <div className="pr-flex pr-gap-3 pr-select-none" onPaste={handlePaste}>
                  {pinArr.map((ch, i) => (
                    <input
                      key={i}
                      type={hidden ? 'password' : 'text'}
                      inputMode="numeric"
                      pattern="\d*"
                      aria-label={`PIN digit ${i + 1}`}
                      value={ch}
                      onChange={(e) => handleChange(i, e)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      ref={(el) => (inputsRef.current[i] = el)}
                      className="pr-[inherit]"
                      style={cellStyle}
                      onFocus={(e) => Object.assign(e.currentTarget.style, cellFocusStyle)}
                      onBlur={(e) => {
                        Object.assign(e.currentTarget.style, cellStyle);
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'currentColor';
                      }}
                    />
                  ))}
                </div>
              </label>

              <div className="pr-flex pr-items-center pr-justify-between pr-pt-1">
                <span className="pr-text-small pr-muted">Tip: Paste your 6-digit PIN</span>
                <label className="pr-flex pr-items-center pr-gap-2 pr-text-small pr-muted">
                  <input
                    type="checkbox"
                    checked={hidden}
                    onChange={(e) => setHidden(e.target.checked)}
                    className="pr-size-4 pr-rounded-[4px] pr-border pr-border-[var(--pr-border)]"
                    aria-label={hidden ? 'Hide digits' : 'Show digits'}
                  />
                  <span>{hidden ? 'Hide' : 'Show'}</span>
                </label>
              </div>

              {err && (
                <div
                  role="alert"
                  className="pr-rounded-xl pr-border pr-border-[var(--pr-danger)] pr-bg-[color-mix(in_oklab,var(--pr-danger),var(--pr-bg)_88%)] pr-text-[var(--pr-danger)] pr-p-3 pr-text-small"
                >
                  {err}
                </div>
              )}

              <PrButton
                type="submit"
                disabled={loading || pinArr.some((x) => !x)}
                className="pr-w-full pr-justify-center pr-h-11 pr-rounded-xl"
              >
                {loading ? 'Verifying…' : 'Unlock Premium'}
              </PrButton>

              <p className="pr-text-small pr-muted pr-text-center">You’ll be redirected to {nextUrl}.</p>
            </form>

            <p className="pr-text-small pr-muted pr-text-center pr-mt-4">
              PINs are sent via email invitations. If you don’t have one,{' '}
              <a href="mailto:support@gramorx.com" className="pr-link">
                contact support
              </a>{' '}
              or <Link href="/pricing" className="pr-link">view pricing</Link>.
            </p>
          </PrCard>
        </section>
      </main>

      {/* Scoped styles for the animated background */}
      <style jsx>{`
        .lux-outer {
          position: absolute;
          inset: -20%;
          animation: lux-rotate 60s linear infinite;
          will-change: transform;
          pointer-events: none;
        }
        .lux-inner {
          position: absolute;
          inset: 0;
          opacity: 0.25; /* overall intensity */
          filter: blur(70px) saturate(115%);
          animation: lux-pan 18s ease-in-out infinite alternate;
          will-change: transform;
          background:
            radial-gradient(50% 35% at 25% 25%, color-mix(in oklab, var(--pr-primary), transparent 80%) 0%, transparent 70%),
            radial-gradient(40% 30% at 75% 75%, color-mix(in oklab, var(--pr-foreground), transparent 92%) 0%, transparent 70%),
            radial-gradient(45% 35% at 80% 20%, color-mix(in oklab, var(--pr-primary), white 12%) 0%, transparent 70%),
            radial-gradient(35% 35% at 20% 80%, color-mix(in oklab, var(--pr-primary), transparent 85%) 0%, transparent 70%);
        }
        @keyframes lux-rotate {
          to { transform: rotate(360deg); }
        }
        @keyframes lux-pan {
          0%   { transform: translate3d(-2%, -1%, 0) scale(1.02); }
          100% { transform: translate3d(2%, 1%, 0)  scale(1.02); }
        }
        /* Respect user motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .lux-outer, .lux-inner {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}
