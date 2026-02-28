import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';

type ProfileLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const profileNav = [
  { href: '/profile', label: 'Dashboard' },
  { href: '/profile/account', label: 'Account' },
  { href: '/profile/subscription', label: 'Subscription' },
  { href: '/profile/streak', label: 'Streak' },
  { href: '/notifications', label: 'Notifications' },
];

export function ProfileLayout({ title, description, children }: ProfileLayoutProps) {
  return (
    <>
      <Head>
        <title>{title} · GramorX</title>
      </Head>
      <main className="bg-background py-8 text-foreground">
        <Container className="max-w-6xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-h2 font-bold">{title}</h1>
            {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
          </header>
          <Card className="border border-border/60 bg-card/60 p-3">
            <nav className="flex flex-wrap gap-2">
              {profileNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </Card>
          {children}
        </Container>
      </main>
    </>
  );
}

export default ProfileLayout;
