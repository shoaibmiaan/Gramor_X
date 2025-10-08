// components/GlobalPlanGuard.tsx
import { useEffect, useMemo, useState } from 'react';
import Router, { useRouter } from 'next/router';
import type { PlanId } from '@/types/pricing';
import { ROUTE_GATES } from '@/lib/routePlanMap';
import { PLAN_ORDER } from '@/lib/planAccess';
import RequirePlanRibbon from '@/components/RequirePlanRibbon';

function pathOf(url: string) {
  try { return new URL(url, window.location.origin).pathname; }
  catch { return url.split('?')[0]; }
}

function needForPath(pathname: string): PlanId | null {
  for (const g of ROUTE_GATES) if (g.pattern.test(pathname)) return g.min;
  return null;
}

export default function GlobalPlanGuard() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [currentNeed, setCurrentNeed] = useState<PlanId | null>(null);

  // Fetch plan once (or on auth change if you wire that later)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch('/api/me/plan', { credentials: 'include' });
        const j = await r.json();
        if (!mounted) return;
        setPlan((j?.plan ?? 'free') as PlanId);
      } catch {
        if (!mounted) return;
        setPlan('free');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Check current path on mount & on route change complete
  useEffect(() => {
    if (!plan) return;
    const check = (url: string) => {
      const p = pathOf(url);
      const need = needForPath(p);
      setCurrentNeed(need);
      if (!need) return;

      const allowed = PLAN_ORDER[plan] >= PLAN_ORDER[need];
      if (!allowed) {
        const from = encodeURIComponent(p);
        const dest = `/pricing?from=${from}&need=${encodeURIComponent(need)}`;
        // Stop the in-flight navigation (if any) and redirect
        Router.replace(dest);
      }
    };

    // initial page
    check(router.asPath);

    const onStart = (url: string) => {
      if (!plan) return;
      const p = pathOf(url);
      const need = needForPath(p);
      if (!need) return;

      const allowed = PLAN_ORDER[plan] >= PLAN_ORDER[need];
      if (!allowed) {
        const from = encodeURIComponent(p);
        const dest = `/pricing?from=${from}&need=${encodeURIComponent(need)}`;
        Router.replace(dest);
        // Cancel the route (prevent flicker)
        Router.events.emit('routeChangeError');
        // eslint-disable-next-line no-throw-literal
        throw 'routeChange aborted by GlobalPlanGuard';
      }
    };

    Router.events.on('routeChangeStart', onStart);
    return () => {
      Router.events.off('routeChangeStart', onStart);
    };
  }, [plan, router.asPath]);

  useEffect(() => {
    const onPlanChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ planId?: PlanId }>).detail;
      if (detail?.planId) setPlan(detail.planId);
    };

    window.addEventListener('subscription:tier-updated', onPlanChanged as EventListener);
    return () => window.removeEventListener('subscription:tier-updated', onPlanChanged as EventListener);
  }, []);

  // Show ribbon when on a gated route and not allowed
  const showRibbon = useMemo(() => {
    if (!plan) return false;
    if (!currentNeed) return false;
    return PLAN_ORDER[plan] < PLAN_ORDER[currentNeed];
  }, [plan, currentNeed]);

  if (!showRibbon) return null;
  return <RequirePlanRibbon min={currentNeed!} userPlan={plan!} exitHref="/" />;
}
