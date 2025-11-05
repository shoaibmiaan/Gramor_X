'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { navigationSchema } from '@/config/navigation';
import { filterNavSections } from '@/lib/navigation/utils';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { Icon } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge'; // ✅ Added for subscription tier badge

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
    <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-card/40 backdrop-blur lg:block">
      <div className="sticky top-[72px] max-h-[calc(100vh-80px)] overflow-y-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navigation</h2>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Jump into the tools that accelerate your IELTS prep.
          </p>
        </div>

        {/* Existing navigation sections */}
        <nav aria-label="Dashboard sections" className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted'
                          }
                        `}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-3 inline-flex items-center rounded-full bg-muted px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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

          {/* ✅ Added: Innovation section */}
          <div className="border-t my-4" />
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Innovation
          </div>
          <ul className="space-y-1.5">
            <li>
              <Link
                href="/ai/coach"
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  isActive('/ai/coach')
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted'
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
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted'
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
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted'
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
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                WhatsApp Tasks
              </Link>
            </li>
          </ul>

          {/* ✅ Subscription Tier Badge */}
          <div className="border-t my-4" />
          <div className="px-3">
            <Badge size="sm">{subscriptionTier}</Badge>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
