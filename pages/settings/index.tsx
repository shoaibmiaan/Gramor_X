'use client';

import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

type SettingsSection = {
  href: string;
  label: string;
  description: string;
  badge?: string;
  group: 'account' | 'experience' | 'security';
};

const sections: SettingsSection[] = [
  // Account group – always route via /account
  {
    href: '/account',
    label: 'Account overview',
    description:
      'See your plan, activity, and access all account tools from one place.',
    badge: 'Hub',
    group: 'account',
  },
  {
    href: '/account/billing',
    label: 'Billing & plan',
    description:
      'View your current plan, renewal date, invoices, and local dues.',
    badge: 'Plan',
    group: 'account',
  },
  {
    href: '/account/activity',
    label: 'Activity log',
    description:
      'Timeline of mocks, practices, streak updates, and other account events.',
    group: 'account',
  },

  // Experience group – classic “settings”
  {
    href: '/settings/notifications',
    label: 'Notifications',
    description: 'Email / WhatsApp reminders, quiet hours, and timezone.',
    group: 'experience',
  },
  {
    href: '/settings/language',
    label: 'Language',
    description: 'Switch the interface between English and Urdu.',
    group: 'experience',
  },
  {
    href: '/settings/accessibility',
    label: 'Accessibility',
    description: 'High contrast, focus styles, and readability options.',
    group: 'experience',
  },

  // Security group
  {
    href: '/settings/security',
    label: 'Security',
    description: 'MFA, active sessions, and login history.',
    group: 'security',
  },
];

const groups: { id: SettingsSection['group']; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'experience', label: 'Experience' },
  { id: 'security', label: 'Security' },
];

export default function SettingsHomePage() {
  return (
    <>
      <Head>
        <title>Settings · GramorX</title>
        <meta
          name="description"
          content="Configure how GramorX behaves for your account: billing, notifications, language, accessibility, and security."
        />
      </Head>

      <main className="bg-background py-8 text-foreground">
        <Container className="space-y-8 max-w-5xl">
          {/* Header */}
          <header className="space-y-2">
            <h1 className="text-h2 font-bold">Settings</h1>
            <p className="max-w-2xl text-small text-muted-foreground">
              Use the account hub for the full picture, or jump straight into a
              specific settings area from here.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" variant="soft">
                <Link href="/account">Open account hub</Link>
              </Button>
            </div>
          </header>

          {/* Groups */}
          <div className="space-y-8">
            {groups.map((group) => {
              const items = sections.filter((s) => s.group === group.id);
              if (items.length === 0) return null;

              return (
                <section key={group.id} className="space-y-3">
                  <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((section) => (
                      <Link
                        key={section.href}
                        href={section.href}
                        className="group block"
                      >
                        <Card
                          as="article"
                          className="h-full cursor-pointer rounded-ds-2xl border border-border bg-card p-5 text-card-foreground transition-colors group-hover:border-primary/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-body font-semibold">
                              {section.label}
                            </h3>
                            {section.badge ? (
                              <Badge size="sm" variant="info">
                                {section.badge}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-small text-muted-foreground">
                            {section.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-4 px-0 text-xs text-primary group-hover:underline"
                          >
                            Open
                          </Button>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </Container>
      </main>
    </>
  );
}
