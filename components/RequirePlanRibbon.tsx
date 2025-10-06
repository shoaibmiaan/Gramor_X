// components/RequirePlanRibbon.tsx
import Link from 'next/link';
import type { PlanId } from '@/types/pricing';
import { PLAN_ORDER } from '@/lib/planAccess';
import { useEffect } from 'react';

type Props = {
  min: PlanId;
  userPlan: PlanId | undefined; // pass __plan from SSR via props
  exitHref?: string;             // where "Exit to Portal" goes (default '/')
  className?: string;
};

export default function RequirePlanRibbon({
  min,
  userPlan,
  exitHref = '/',
  className = '',
}: Props) {
  const allowed = !!userPlan && PLAN_ORDER[userPlan] >= PLAN_ORDER[min];

  useEffect(() => {
    if (!allowed && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'premium_ribbon_shown', { min, userPlan: userPlan ?? 'unknown' });
    }
  }, [allowed, min, userPlan]);

  if (allowed) return null;

  return (
    <div
      className={[
        'w-full border-b',
        'bg-amber-50 text-amber-900 border-amber-200',
        'px-3 py-2 text-sm',
        'flex items-center justify-between gap-3',
        className,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block rounded-full border border-amber-300 px-2 py-0.5 text-[11px] uppercase tracking-wide">
          Premium
        </span>
        <span>
          This page requires <strong className="font-semibold">{min}</strong> (your plan: <strong className="font-semibold">{userPlan ?? 'free'}</strong>).
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm hover:bg-amber-100 focus:outline-none focus:ring"
        >
          Upgrade
        </Link>
        <Link
          href={exitHref}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus:ring"
        >
          Exit to Portal
        </Link>
      </div>
    </div>
  );
}
