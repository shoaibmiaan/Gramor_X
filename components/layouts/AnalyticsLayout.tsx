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
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your learning journey</p>
        </div>

        <nav className="space-y-1">
          {analyticsLinks.map((link) => (
            <Button
              key={link.href}
              variant={isActive(link.href) ? 'secondary' : 'ghost'}
              className="w-full justify-start"
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
          <div className="space-y-1">
            {['Last 7 days', 'Last 30 days', 'Last 3 months', 'All time'].map((period) => (
              <Button key={period} variant="ghost" size="sm" className="w-full justify-start">
                {period}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export default AnalyticsLayout;
