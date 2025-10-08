'use client';

import React from 'react';
import Link from 'next/link';
import { navigationSchema } from '@/config/navigation';
import { filterNavItems } from '@/lib/navigation/utils';
import { Icon } from '@/components/design-system/Icon';
import { Button } from '@/components/design-system/Button';
import { useUserContext } from '@/context/UserContext';
import { isFeatureEnabled } from '@/lib/constants/features';
import type { SubscriptionTier } from '@/lib/navigation/types';

export const QuickAccessWidget: React.FC = () => {
  const { user } = useUserContext();
  const [open, setOpen] = React.useState(false);

  const isAuthenticated = Boolean(user?.id);

  // Read tier from user metadata (typed), default to 'free'
  const metadata = (user?.user_metadata ?? {}) as { tier?: SubscriptionTier };
  const subscriptionTier: SubscriptionTier = metadata.tier ?? 'free';

  const items = React.useMemo(
    () =>
      filterNavItems(navigationSchema.floating.quickActions, {
        isAuthenticated,
        tier: subscriptionTier,
      }),
    [isAuthenticated, subscriptionTier]
  );

  if (!isFeatureEnabled('floatingWidget') || items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          id="quick-actions-menu"
          className="w-72 rounded-2xl border border-border bg-card/95 p-4 shadow-xl"
          role="menu"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-slab text-h4">Quick actions</p>
              <p className="text-xs text-muted-foreground">Stay on track with a single tap.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              aria-label="Close quick actions"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-sm transition hover:border-border hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <Icon name={item.icon} className="h-5 w-5 text-primary" />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto inline-flex items-center rounded-full bg-muted px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        variant="secondary"
        className="rounded-full bg-primary text-primary-foreground shadow-xl hover:opacity-90"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="quick-actions-menu"
      >
        {open ? 'Close' : 'Quick Access'}
      </Button>
    </div>
  );
};

export default QuickAccessWidget;
