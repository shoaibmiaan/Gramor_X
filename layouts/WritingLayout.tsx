import type { ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import { Badge } from '@/components/design-system/Badge';
import { Container } from '@/components/design-system/Container';
import type { PlanId } from '@/types/pricing';
import { PLANS } from '@/types/pricing';
import { hasPlan } from '@/lib/planAccess';

const NAV_ITEMS: Array<{
  id: 'overview' | 'library' | 'progress';
  label: string;
  description: string;
  href: string;
}> = [
  { id: 'overview', label: 'Overview', description: 'Study window, readiness, and focus', href: '/writing/overview' },
  { id: 'library', label: 'Prompt library', description: 'Filters, curated sets, and AI tools', href: '/writing/library' },
  { id: 'progress', label: 'Progress', description: 'Drafts, submissions, and feedback', href: '/writing/progress' },
];

export interface WritingLayoutProps {
  plan: PlanId;
  current: 'overview' | 'library' | 'progress';
  children: ReactNode;
}

const planBadgeCopy: Record<PlanId, string> = {
  free: 'Explorer access',
  starter: 'Seedling access',
  booster: 'Rocket access',
  master: 'Owl access',
};

export const WritingLayout = ({ plan, current, children }: WritingLayoutProps) => {
  const planInfo = PLANS[plan] ?? PLANS.free;
  const aiUnlocked = hasPlan(plan, 'master');

  return (
    <Container className="relative py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_55%)]" aria-hidden />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-0">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="soft" tone="default" size="sm">
              {planBadgeCopy[plan] ?? 'Explorer access'}
            </Badge>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Writing studio</h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Draft confidently, unlock targeted drills, and review detailed scoring for IELTS Task 1 and Task 2.
              {aiUnlocked ? ' Your Owl plan includes instant AI prompt generation and deeper analytics.' : ' Upgrade to Owl to unlock instant AI prompt generation and deeper analytics.'}
            </p>
          </div>
          <Badge variant="outline" tone="info" size="sm" className="self-start sm:self-auto">
            {planInfo.name}
          </Badge>
        </header>

        <nav aria-label="Writing studio sections" className="overflow-x-auto">
          <ul className="flex min-w-full gap-3 rounded-2xl border border-border/60 bg-card/70 p-2 shadow-inner">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === current;
              return (
                <li key={item.id} className="min-w-[12rem] flex-1">
                  <Link
                    href={item.href}
                    className={clsx(
                      'group flex h-full flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
                      isActive
                        ? 'border-primary/60 bg-primary/10 text-foreground shadow-sm'
                        : 'border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-card/60',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span
                      className={clsx('text-sm font-semibold', isActive ? 'text-foreground' : 'text-foreground/80')}
                    >
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-8 pb-8 sm:space-y-10">{children}</div>
      </div>
    </Container>
  );
};
