import type { ReactNode } from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { ProfileLayout } from '@/components/layouts/ProfileLayout';

type SettingsLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const settingsLinks = [
  { href: '/settings', label: 'Overview' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/language', label: 'Language' },
  { href: '/settings/accessibility', label: 'Accessibility' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/security', label: 'Security' },
];

export function SettingsLayout({ title, description, children }: SettingsLayoutProps) {
  return (
    <ProfileLayout title={title} description={description}>
      <Card className="border border-border/60 bg-muted/20 p-3">
        <nav className="flex flex-wrap gap-2">
          {settingsLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-background hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Card>
      {children}
    </ProfileLayout>
  );
}

export default SettingsLayout;
