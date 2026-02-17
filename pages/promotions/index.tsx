import * as React from 'react';

import Head from 'next/head';
import Link from 'next/link';
import type { NextPage } from 'next';

import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import PromoCodeBox, { type PromoCodeApplyPayload } from '@/components/payments/PromoCodeBox';
import { PLAN_LABEL } from '@/lib/payments/index';
import { PROMO_CODES, explainPromoRule, type PromoCodeRule } from '@/lib/promotions/codes';
import { fetchActivePromos } from '@/lib/promotions/client';

const PromotionsPage: NextPage = () => {
  const [demoPromo, setDemoPromo] = React.useState<PromoCodeApplyPayload['rule'] | null>(null);
  const [dynamicPromos, setDynamicPromos] = React.useState<PromoCodeRule[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const promos = await fetchActivePromos();
      if (!cancelled) {
        setDynamicPromos(promos);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const promoList = React.useMemo(() => {
    const map = new Map<string, PromoCodeRule>();
    for (const promo of dynamicPromos) {
      map.set(promo.code, promo);
    }
    for (const promo of PROMO_CODES) {
      if (!map.has(promo.code)) {
        map.set(promo.code, promo);
      }
    }
    return Array.from(map.values());
  }, [dynamicPromos]);

  return (
    <>
      <Head>
        <title>Promo codes — GramorX</title>
      </Head>
      <main className="min-h-screen bg-background text-foreground antialiased">
        <div className="py-16">
          <Container>
            <header className="mx-auto mb-12 max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-caption text-muted-foreground">
                <i className="fas fa-gift text-caption" aria-hidden="true"></i>
                Exclusive offers
              </p>
              <h1 className="mt-4 text-balance text-h1">
                <span className="text-gradient-primary">Apply a promo code before checkout</span>
              </h1>
              <p className="mt-3 text-body text-muted-foreground">
                Use one of the active promo codes below and combine it with a referral code for even more savings on your next
                GramorX plan.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-small text-muted-foreground">
                <Link href="/checkout" className="underline-offset-4 hover:underline">
                  Go to checkout
                </Link>
                <span>•</span>
                <Link href="/pricing" className="underline-offset-4 hover:underline">
                  Compare plans
                </Link>
              </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {promoList.length === 0 ? (
                  <Card className="card-surface rounded-ds-2xl p-6 text-muted-foreground">
                    No active promo codes right now. Check back soon or contact support for special offers.
                  </Card>
                ) : (
                  promoList.map((promo) => (
                    <Card key={promo.code} className="card-surface rounded-ds-2xl p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-h3">{promo.label}</h2>
                          <p className="text-small text-muted-foreground">Code: {promo.code}</p>
                        </div>
                        <div className="rounded-full bg-muted px-3 py-1 text-caption text-muted-foreground">
                          {promo.type === 'percent' ? `${promo.value}% off` : `$${promo.value / 100} off`}
                        </div>
                      </div>
                      <p className="mt-4 text-body text-muted-foreground">{explainPromoRule(promo)}</p>
                    </Card>
                  ))
                )}
              </div>

              <aside>
                <Card className="card-surface rounded-ds-2xl p-6 space-y-4">
                  <h2 className="text-h3">Try a code</h2>
                  <p className="text-small text-muted-foreground">
                    Use the box below to test a promo code. Select a plan and billing cycle to preview how much you can save.
                  </p>
                  <PromoCodeBox
                    plan="booster"
                    cycle="monthly"
                    amountCents={1900}
                    onApply={(payload) => setDemoPromo(payload.rule)}
                    onClear={() => setDemoPromo(null)}
                    applied={demoPromo ?? undefined}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Want the exact savings for your plan? Head over to the <Link href="/checkout">checkout page</Link> and apply the
                    code alongside your referral.
                  </p>
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    Current plan highlights:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>{PLAN_LABEL.booster} — best for fast progress</li>
                      <li>{PLAN_LABEL.master} — includes coaching calls</li>
                    </ul>
                  </div>
                </Card>
              </aside>
            </div>
          </Container>
        </div>
      </main>
    </>
  );
};

export default PromotionsPage;
