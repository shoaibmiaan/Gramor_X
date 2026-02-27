// components/layouts/AnalyticsLayout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';

interface AnalyticsLayoutProps {
  children: ReactNode;
  userRole?: string;
}

export function AnalyticsLayout({ children, userRole }: AnalyticsLayoutProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const isActive = (path: string) => currentPath.startsWith(path);

  const analyticsLinks = [
    { href: '/analytics', label: 'Overview', icon: '📈' },
    { href: '/analytics/performance', label: 'Performance', icon: '🎯' },
    { href: '/analytics/progress', label: 'Progress', icon: '📊' },
    { href: '/analytics/detailed', label: 'Detailed Analysis', icon: '🔍' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="w-full border-b bg-card p-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your learning journey</p>
        </div>

        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-1 md:overflow-visible md:px-0 md:pb-0">
          {analyticsLinks.map((link) => (
            <Button
              key={link.href}
              variant={isActive(link.href) ? 'secondary' : 'ghost'}
              className="shrink-0 justify-start whitespace-nowrap md:w-full"
              asChild
            >
              <Link href={link.href}>
                <span className="flex items-center gap-3">
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </span>
              </Link>
            </Button>
          ))}
        </nav>

        {/* Time period selector */}
        <div className="mt-6 border-t pt-6">
          <h3 className="mb-2 text-sm font-medium">Time Period</h3>
          <div className="grid grid-cols-2 gap-2 md:block md:space-y-1">
            {['Last 7 days', 'Last 30 days', 'Last 3 months', 'All time'].map((period) => (
              <Button key={period} variant="ghost" size="sm" className="w-full justify-start whitespace-nowrap">
                {period}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}

export default AnalyticsLayout;
