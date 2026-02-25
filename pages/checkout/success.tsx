// pages/checkout/success.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { NextPage, GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

import { track } from '@/lib/analytics/track';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { getServerClient } from '@/lib/supabaseServer';

// -------- Types --------
type Receipt = {
  reference: string;
  plan: 'starter' | 'booster' | 'master' | string;
  cycle: 'monthly' | 'annual' | string;
  currency: string;            // e.g., 'PKR' | 'USD'
  amountMinor: number;         // stored in minor units (e.g., paisa/cents)
  status: 'pending' | 'succeeded' | 'failed' | string;
  paidAt: string | null;
  provider: 'safepay' | 'stripe' | string;
  providerReceiptUrl: string | null;
};

type PageProps = {
  ok: true;
  receipt: Receipt;
} | {
  ok: false;
  error: string;
  // pass through for client tracking fallback (optional)
  sessionId?: string;
  plan?: string;
};

// -------- SSR: fetch receipt by reference/session_id --------
export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const q = ctx.query || {};
  const reference = (q.reference as string) || '';   // Safepay recommended
  const sessionId = (q.session_id as string) || '';  // keep for Stripe/legacy
  const lookup = reference || sessionId;

  if (!lookup) {
    return { props: { ok: false, error: 'Missing payment reference/session.' } };
  }

  const supabase = getServerClient(ctx.req, ctx.res);

  // Try by reference first, then fallback to provider_session_id if you store it
  const { data, error } = await supabase
    .from('payment_intents')
    .select(`
      reference,
      plan,
      cycle,
      currency,
      amount_minor,
      status,
      paid_at,
      provider,
      provider_receipt_url,
      provider_session_id
    `)
    .or(`reference.eq.${lookup},provider_session_id.eq.${lookup}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      props: {
        ok: false,
        error: 'Payment record not found.',
        sessionId,
        plan: (q.plan as string) || undefined,
      },
    };
  }

  return {
    props: {
      ok: true,
      receipt: {
        reference: data.reference,
        plan: data.plan,
        cycle: data.cycle,
        currency: data.currency,
        amountMinor: data.amount_minor,
        status: data.status,
        paidAt: data.paid_at,
        provider: data.provider,
        providerReceiptUrl: data.provider_receipt_url,
      },
    },
  };
};

// -------- Page --------
const SuccessPage: NextPage<PageProps> = (props) => {
  const router = useRouter();

  // fire analytics once (client) using whatever we can
  const firedRef = React.useRef(false);
  React.useEffect(() => {
    if (firedRef.current) return;

    if (props.ok) {
      const { receipt } = props;
      track('plan_purchased', {
        provider: receipt.provider,
        providerSessionId: router.query.session_id ?? null,
        reference: receipt.reference,
        plan: receipt.plan,
        cycle: receipt.cycle,
        currency: receipt.currency,
        amountMinor: receipt.amountMinor,
        status: receipt.status,
      });
      firedRef.current = true;
    } else {
      // fallback legacy tracking
      const sessionId = String(props.sessionId ?? router.query.session_id ?? '');
      const plan = String(props.plan ?? router.query.plan ?? 'booster');
      if (sessionId) {
        track('plan_purchased', { providerSessionId: sessionId, plan });
        firedRef.current = true;
      }
    }
  }, [props, router.query]);

  if (!props.ok) {
    return (
      <>
        <Head><title>Payment Issue</title></Head>
        <main className="min-h-screen bg-background text-foreground">
          <Section>
            <Container className="max-w-3xl text-center">
              <h1 className="mb-2 text-h1 font-semibold">We couldn’t verify your payment</h1>
              <p className="text-muted-foreground">{props.error}</p>
              <div className="mt-8">
                <Link href="/account/billing" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                  Try again
                </Link>
              </div>
            </Container>
          </Section>
        </main>
      </>
    );
  }

  const { receipt } = props;
  const amountMajor = (receipt.amountMinor / 100).toFixed(2);
  const displayAmount =
    receipt.currency.toUpperCase() === 'PKR'
      ? `Rs.${amountMajor} PKR`
      : `${receipt.currency.toUpperCase()} ${amountMajor}`;

  return (
    <>
      <Head><title>Payment Successful</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <Section>
          <Container className="max-w-3xl text-center">
            <h1 className="mb-2 text-h1 font-semibold">You’re upgraded! 🎉</h1>
            <p className="text-muted-foreground">
              Your subscription is active. You can now access full IELTS modules, AI feedback, and analytics.
            </p>

            {/* Receipt Card */}
            <div className="mx-auto mt-8 w-full max-w-xl rounded-xl border border-border bg-card p-6 text-left shadow-sm">
              <h2 className="mb-4 text-h4 font-semibold">Order receipt</h2>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-medium">{receipt.reference}</span>

                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium uppercase">{receipt.plan} • {receipt.cycle}</span>

                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{displayAmount}</span>

                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{receipt.status}</span>

                <span className="text-muted-foreground">Paid at</span>
                <span className="font-medium">{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : '—'}</span>

                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium">{receipt.provider === 'safepay' ? 'Safepay' : receipt.provider}</span>

                {receipt.providerReceiptUrl && (
                  <>
                    <span className="text-muted-foreground">Provider receipt</span>
                    <span className="font-medium">
                      <a
                        className="underline hover:opacity-90"
                        href={receipt.providerReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in new tab
                      </a>
                    </span>
                  </>
                )}
              </div>
              <p className="mt-3 text-small text-muted-foreground">
                Tip: screenshot this card and upload it to Safepay’s “Order receipt upload”.
              </p>
            </div>

            {/* CTAs */}
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-center text-primary-foreground hover:opacity-90"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/account/billing"
                className="rounded-lg border border-border px-4 py-2 text-center hover:bg-muted"
              >
                View invoices
              </Link>
              <Link
                href="/account/referrals"
                className="rounded-lg border border-border px-4 py-2 text-center hover:bg-muted"
              >
                Invite a friend (get rewards)
              </Link>
            </div>

            <p className="mt-6 text-small text-muted-foreground">
              If you closed the window accidentally, your receipt will also be emailed.
            </p>
          </Container>
        </Section>
      </main>
    </>
  );
};

export default SuccessPage;
