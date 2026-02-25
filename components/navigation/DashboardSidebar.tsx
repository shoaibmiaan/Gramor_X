// File: components/layout/DashboardSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { navigationSchema } from '@/config/navigation';
import { filterNavSections } from '@/lib/navigation/utils';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { Icon } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';

interface DashboardSidebarProps {
  subscriptionTier: SubscriptionTier;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ subscriptionTier }) => {
  const router = useRouter();
  const ctx = React.useMemo(
    () => ({ isAuthenticated: true, tier: subscriptionTier }),
    [subscriptionTier]
  );
  const sections = React.useMemo(() => filterNavSections(navigationSchema.sidebar, ctx), [ctx]);
  const currentPath = router.asPath ?? router.pathname;

  const isActive = React.useCallback(
    (href: string) => {
      if (!href) return false;
      if (href === '/dashboard') {
        return currentPath === '/dashboard';
      }
      return currentPath.startsWith(href);
    },
    [currentPath]
  );

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/60 dark:border-border-dark/60 bg-card/40 dark:bg-card-dark/40 backdrop-blur lg:block">
      <div className="sticky top-[72px] max-h-[calc(100vh-80px)] overflow-y-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">Navigation</h2>
          <p className="mt-1 text-sm text-muted-foreground/80 dark:text-muted-foreground-dark/80">
            Jump into the tools that accelerate your IELTS prep.
          </p>
        </div>

        {/* Existing navigation sections */}
        <nav aria-label="Dashboard sections" className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">
                {section.icon && <Icon name={section.icon} className="h-4 w-4" />}
                <span>{section.label}</span>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`
                          flex items-center justify-between rounded-xl px-3 py-2 text-sm transition
                          ${
                            active
                              ? 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark font-semibold'
                              : 'text-muted-foreground dark:text-muted-foreground-dark hover:bg-muted dark:hover:bg-muted-dark'
                          }
                        `}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-3 inline-flex items-center rounded-full bg-muted dark:bg-muted-dark px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Innovation section */}
          <div className="border-t border-border/60 dark:border-border-dark/60 my-4" />
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark mb-2">
            Innovation
          </div>
          <ul className="space-y-1.5">
            <li>
              <Link
                href="/ai/coach"
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  isActive('/ai/coach')
                    ? 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark font-semibold'
                    : 'text-muted-foreground dark:text-muted-foreground-dark hover:bg-muted dark:hover:bg-muted-dark'
                }`}
              >
                AI Coach
              </Link>
            </li>
            <li>
              <Link
                href="/study-buddy"
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  isActive('/study-buddy')
                    ? 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark font-semibold'
                    : 'text-muted-foreground dark:text-muted-foreground-dark hover:bg-muted dark:hover:bg-muted-dark'
                }`}
              >
                Study Buddy
              </Link>
            </li>
            <li>
              <Link
                href="/mistakes-book"
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  isActive('/mistakes-book')
                    ? 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark font-semibold'
                    : 'text-muted-foreground dark:text-muted-foreground-dark hover:bg-muted dark:hover:bg-muted-dark'
                }`}
              >
                Mistakes Book
              </Link>
            </li>
            <li>
              <Link
                href="/whatsapp-tasks"
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  isActive('/whatsapp-tasks')
                    ? 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark font-semibold'
                    : 'text-muted-foreground dark:text-muted-foreground-dark hover:bg-muted dark:hover:bg-muted-dark'
                }`}
              >
                WhatsApp Tasks
              </Link>
            </li>
          </ul>

          {/* Subscription Tier Badge */}
          <div className="border-t border-border/60 dark:border-border-dark/60 my-4" />
          <div className="px-3">
            <Badge size="sm">{subscriptionTier}</Badge>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default DashboardSidebar;