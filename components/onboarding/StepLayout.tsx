import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { cn } from '@/lib/utils';

export function StepLayout({
  title,
  subtitle,
  step,
  total,
  onBack,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  step: number;
  total: number;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <main className="min-h-screen bg-background">
      <Container className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center py-6 sm:py-10">
        <div className="mb-4 sm:mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of {total}</span>
            <span>{pct}% complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
          <header className="mb-5 sm:mb-6">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
          </header>

          <div>{children}</div>

          <footer className={cn('mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4')}>
            <div>{onBack ? <Button variant="ghost" onClick={onBack}>Back</Button> : <span />}</div>
            <div>{footer}</div>
          </footer>
        </section>
      </Container>
    </main>
  );
}
