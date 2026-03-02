import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';

type SettingsTab = {
  key: 'profile' | 'account' | 'billing' | 'security';
  label: string;
  href: string;
};

const SETTINGS_TABS: SettingsTab[] = [
  { key: 'profile', label: 'Profile', href: '/settings/profile' },
  { key: 'account', label: 'Account', href: '/settings/account' },
  { key: 'billing', label: 'Billing', href: '/settings/billing' },
  { key: 'security', label: 'Security', href: '/settings/security' },
];

type SettingsLayoutProps = {
  title: string;
  description?: string;
  activeTab: SettingsTab['key'];
  children: React.ReactNode;
};

export default function SettingsLayout({
  title,
  description,
  activeTab,
  children,
}: SettingsLayoutProps) {
  const router = useRouter();

  return (
    <main className="bg-background py-8 text-foreground">
      <Container className="max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-h2 font-bold">Settings</h1>
          <p className="text-small text-muted-foreground">
            Manage your personal preferences, account controls, billing, and security in one place.
          </p>
        </header>

        <nav aria-label="Settings sections" className="-mx-1 overflow-x-auto pb-1">
          <ul className="flex min-w-max gap-2 px-1">
            {SETTINGS_TABS.map((tab) => {
              const isActive =
                tab.key === activeTab ||
                router.pathname === tab.href ||
                router.asPath.split('?')[0] === tab.href;

              return (
                <li key={tab.key}>
                  <Link
                    href={tab.href}
                    className={[
                      'inline-flex rounded-ds-xl border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="space-y-2">
          <h2 className="text-h3 font-semibold">{title}</h2>
          {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
        </section>

        {children}
      </Container>
    </main>
  );
}
