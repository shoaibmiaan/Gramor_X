// components/exam/ExamShell.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

type Pill = { id: string; label: string; tone?: 'ok' | 'warn' | 'info' };
type RailItem = { id: string; label: string; meta?: string; active?: boolean; onClick?: () => void };

type ExamShellProps = {
  breadcrumb: { href: string; label: string }[];
  title: string;
  planLabel?: string;
  headerPills?: Pill[]; // e.g., Autosave: On, Focus Guard: Active, Remaining: 56:12
  leftRail?: RailItem[];
  rightRail?: React.ReactNode;
  onExit?: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
  footerNote?: string;
  children: React.ReactNode;
};

const toneClass = (tone?: Pill['tone']) =>
  tone === 'ok'
    ? 'bg-success/10 text-success ring-1 ring-success/20'
    : tone === 'warn'
    ? 'bg-warning/10 text-warning ring-1 ring-warning/20'
    : 'bg-accent/10 text-accent ring-1 ring-accent/20';

export default function ExamShell({
  breadcrumb,
  title,
  planLabel,
  headerPills = [],
  leftRail = [],
  rightRail,
  onExit,
  onSave,
  onSubmit,
  footerNote,
  children,
}: ExamShellProps) {
  return (
    <div className="min-h-screen bg-app/solid text-app-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-elevated/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo-mark.png" alt="Gramor X" width={24} height={24} className="rounded" />
              <span className="sr-only">Dashboard</span>
            </Link>

            <nav className="flex items-center gap-2 text-muted-foreground">
              {breadcrumb.map((b, i) => (
                <React.Fragment key={b.href}>
                  <Link href={b.href} className="hover:text-foreground">
                    {b.label}
                  </Link>
                  {i < breadcrumb.length - 1 && <span>›</span>}
                </React.Fragment>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {planLabel && <Badge tone="purple">{planLabel}</Badge>}
              {headerPills.map((p) => (
                <span key={p.id} className={`rounded-full px-2.5 py-1 text-xs ${toneClass(p.tone)}`}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4 py-4">
        {/* Left rail */}
        <aside className="col-span-12 h-full rounded-2xl border border-border/40 bg-elevated p-3 md:sticky md:top-16 md:col-span-3 md:self-start">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Tasks</div>
          <div className="space-y-1">
            {leftRail.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full rounded-lg px-3 py-2 text-left transition ${
                  item.active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Complete both tasks in 60 minutes. Your timer pauses if you leave the tab.
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-6">{children}</main>

        {/* Right rail */}
        <aside className="col-span-12 md:sticky md:top-16 md:col-span-3 md:self-start">
          {rightRail}
        </aside>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-40 border-t border-border/40 bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          <div className="hidden text-sm text-muted-foreground md:block">{footerNote}</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={onExit}>Exit</Button>
            <Button variant="secondary" onClick={onSave}>Save draft</Button>
            <Button variant="primary" onClick={onSubmit}>Submit</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
