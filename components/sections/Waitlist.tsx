// components/sections/Waitlist.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type FormState = {
  name: string;
  email: string;
  phone: string;
  country: string;
  target_band: string;
  planned_test: string; // YYYY-MM or e.g., "Dec 2025"
  experience: string;
  referrer_code: string; // from ?ref=
};

const normalizeMonth = (s: string) => {
  if (!s) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const short = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const m = s.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (m) {
    const i = short.findIndex((x) => x === m[1].slice(0, 3).toLowerCase());
    if (i >= 0) return `${m[2]}-${String(i + 1).padStart(2, '0')}`;
  }
  return s;
};

const perks = [
  {
    icon: 'Gift',
    title: 'Founding member perks',
    description: 'First 500 learners get 30% off the first 3 months plus priority onboarding.',
  },
  {
    icon: 'ClipboardList',
    title: 'Tailored launch plan',
    description: 'Share your goals and receive a 4-week action sprint before launch.',
  },
  {
    icon: 'MessageCircle',
    title: 'Direct line to product team',
    description: 'Drop feedback in a private channel and shape what ships next.',
  },
] as const;

const timeline = [
  {
    title: 'Reserve your spot',
    detail: 'Submit the form with your target band and exam month.',
    time: '2 minutes',
  },
  {
    title: 'Get onboarding kit',
    detail: 'Receive diagnostics, a planner, and bonus speaking prompts.',
    time: 'Within 24 hours',
  },
  {
    title: 'Access beta rooms',
    detail: 'Unlock modules in waves and join live mentor walkthroughs.',
    time: 'Staggered invites',
  },
] as const;

const totalSlots = 500;
const claimedSlots = 327;
const claimedPercent = Math.min(100, Math.round((claimedSlots / totalSlots) * 100));

export function Waitlist() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    country: '',
    target_band: '',
    planned_test: '',
    experience: '',
    referrer_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const alertWrapRef = useRef<HTMLDivElement | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const qref = (router.query.ref as string) || '';
    if (qref) setForm((s) => ({ ...s, referrer_code: qref }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.ref]);

  const emailError = useMemo(() => {
    if (!form.email) return undefined;
    return isEmail(form.email) ? undefined : 'Please enter a valid email';
  }, [form.email]);

  const canSubmit = !!form.name && isEmail(form.email) && !loading;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const showAlert = (kind: 'success' | 'error', msg: string, autoDismiss = true) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setSuccessMsg(null);
    setErrorMsg(null);
    if (kind === 'success') setSuccessMsg(msg);
    else setErrorMsg(msg);

    requestAnimationFrame(() => {
      alertWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => alertWrapRef.current?.focus({ preventScroll: true }), 250);
    });

    if (autoDismiss) {
      dismissTimer.current = setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 7000);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!canSubmit) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      setLoading(true);
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planned_test: normalizeMonth(form.planned_test), source: 'site:waitlist' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || json?.ok !== true) {
        const issues: { field: string; message: string }[] = json?.issues || [];
        const msg = issues.length
          ? issues.map((i) => `• ${i.message}`).join('  ')
          : json?.error || 'Something went wrong. Please try again.';
        showAlert('error', msg, false);
        return;
      }

      if (json.duplicate) {
        showAlert('success', 'You are already on the waitlist. 🎉');
        return;
      }

      showAlert('success', "You're on the list! We’ll email you updates and early access.");
      setForm({ name: '', email: '', phone: '', country: '', target_band: '', planned_test: '', experience: '', referrer_code: '' });
    } catch (err: any) {
      clearTimeout(timeout);
      showAlert(
        'error',
        err?.name === 'AbortError' ? 'Network timeout. Please try again.' : err?.message || 'Unable to submit.',
        false
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section id="waitlist">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-electricBlue/30 bg-electricBlue/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">
                <Icon name="Sparkles" size={14} /> Early access program
              </span>
              <h2 className="mt-4 font-slab text-4xl font-semibold text-gradient-primary sm:text-5xl">
                Join the mission control waitlist
              </h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Secure a beta invite for personalised launch plans, exclusive discounts, and fast feedback loops.
              </p>
            </div>

            <Card className="border border-electricBlue/30 bg-background/80 p-6 shadow-lg shadow-electricBlue/10">
              <div className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>Spots claimed</span>
                <span>
                  {claimedSlots}/{totalSlots}
                </span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border/60">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-electricBlue via-purpleVibe to-neonGreen"
                  style={{ width: `${claimedPercent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Founding members lock pricing for 12 months and help pick releases.
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {perks.map((perk) => (
                <Card key={perk.title} className="h-full border border-border/50 bg-card/80 p-5 text-left shadow-sm">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-electricBlue/10 text-electricBlue">
                    <Icon name={perk.icon} size={18} />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{perk.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{perk.description}</p>
                </Card>
              ))}
            </div>

            <Card className="border border-border/60 bg-background/80 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">How it works</h3>
              <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
                {timeline.map((step, idx) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-electricBlue/15 font-semibold text-electricBlue">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{step.title}</p>
                      <p className="leading-relaxed">{step.detail}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground/80">{step.time}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <Card className="card-glass rounded-ds-xl p-6 md:p-8">
            <div ref={alertWrapRef} tabIndex={-1} aria-live="polite" aria-atomic="true" className="outline-none">
              {successMsg ? <Alert variant="success" title="Success" className="mb-6">{successMsg}</Alert> : null}
              {errorMsg ? <Alert variant="warning" title="Hmm…" className="mb-6">{errorMsg}</Alert> : null}
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Full name</span>
                <Input name="name" placeholder="Enter your full name" value={form.name} onChange={onChange} required />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Email address</span>
                <Input name="email" type="email" placeholder="Enter your email" value={form.email} onChange={onChange} required />
                {emailError ? <span className="mt-1 block text-xs text-sunsetOrange">{emailError}</span> : null}
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Target IELTS band</span>
                <Input name="target_band" type="number" min="0" max="9" step="0.5" placeholder="e.g., 7.5" value={form.target_band} onChange={onChange} />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Planned test date</span>
                <Input name="planned_test" type="month" placeholder="Month/Year" value={form.planned_test} onChange={onChange} />
              </div>

              <div className="md:col-span-2">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current IELTS experience</span>
                <Input name="experience" placeholder="First-time taker, Retaker, etc." value={form.experience} onChange={onChange} />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Phone (optional)</span>
                <Input name="phone" type="tel" placeholder="e.g., +92 300 1234567" value={form.phone} onChange={onChange} />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Country (optional)</span>
                <Input name="country" placeholder="Pakistan" value={form.country} onChange={onChange} list="country-list" />
                <datalist id="country-list">
                  <option value="Pakistan" />
                  <option value="United Kingdom" />
                  <option value="United States" />
                  <option value="Canada" />
                  <option value="Australia" />
                  <option value="United Arab Emirates" />
                </datalist>
              </div>

              <input type="hidden" name="referrer_code" value={form.referrer_code} />

              <div className="md:col-span-2 pt-1">
                <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full rounded-full py-4 text-base font-semibold">
                  <Icon name="Lock" /> {loading ? 'Securing…' : 'Claim invite'}
                </Button>
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  We’ll send early-access updates. Unsubscribe anytime.
                </div>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </Section>
  );
}

export default Waitlist;
export { Waitlist as WaitlistSection };
