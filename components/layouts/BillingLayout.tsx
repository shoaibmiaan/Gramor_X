import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';

interface BillingLayoutProps {
  children: ReactNode;
  userRole?: string;
}

const billingLinks = [
  { href: '/settings/billing', label: 'Billing Settings', icon: '💳' },
  { href: '/dashboard/billing', label: 'Invoices & Usage', icon: '🧾' },
  { href: '/profile/subscription', label: 'Subscription', icon: '⭐' },
  { href: '/profile/account/billing', label: 'Payment Methods', icon: '🏦' },
];

export function BillingLayout({ children }: BillingLayoutProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl">
        <div className="border-b p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Billing & Subscription</h1>
              <p className="text-muted-foreground">Manage plans, payment methods, invoices, and renewals.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>

          <nav className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Billing sections">
            {billingLinks.map((link) => (
              <Button key={link.href} variant={isActive(link.href) ? 'secondary' : 'ghost'} size="sm" asChild>
                <Link href={link.href}>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span>{link.icon}</span>
                    {link.label}
                  </span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export default BillingLayout;
