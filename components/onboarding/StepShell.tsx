import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

export type StepMeta = { label: string; href?: string; done?: boolean };

export type StepShellProps = {
  step: number;        // 1-based
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;

  // Navigation
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;

  // Labels
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;

  // UI states
  nextDisabled?: boolean;
  className?: string;

  // Optional fancy bits
  steps?: StepMeta[];  // step pills at top (labels + optional links)
  hint?: string;       // small tip ribbon below header
  hideProgress?: boolean; // hide the progress bar (default false)
  compact?: boolean;   // smaller padding on mobile
};

const StepShell: React.FC<StepShellProps> = ({
  step,
  total,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = 'Continue',
  backLabel = 'Back',
  skipLabel = 'Skip',
  nextDisabled,
  className,
  steps,
  hint,
  hideProgress = false,
  compact = false,
}) => {
  const router = useRouter();
  const pct = Math.max(0, Math.min(100, Math.round((step / Math.max(1, total)) * 100)));
  const isLast = step >= total;
  const isFirst = step <= 1;

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        onNext?.();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onBack?.();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onBack, onSkip]);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Container className={cn('py-4 sm:py-8', compact ? 'max-w-2xl' : 'max-w-3xl', className)}>
        {/* Header with progress and step pills */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
              )}
            </div>
            <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Step {step}/{total}
            </div>
          </div>

          {/* Optional step pills */}
          {Array.isArray(steps) && steps.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {steps.map((s, i) => {
                const idx = i + 1;
                const active = idx === step;
                const done = s.done ?? idx < step;
                return s.href ? (
                  <Link
                    key={s.label + i}
                    href={s.href}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : done
                        ? 'border-success/30 bg-success/10 text-success-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    <span className="opacity-70">Step {idx} ·</span>
                    <span className="ml-1">{s.label}</span>
                    {done && !active && <Icon name="check" className="ml-1 h-3 w-3" />}
                  </Link>
                ) : (
                  <span
                    key={s.label + i}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : done
                        ? 'border-success/30 bg-success/10 text-success-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    )}
                  >
                    <span className="opacity-70">Step {idx} ·</span>
                    <span className="ml-1">{s.label}</span>
                    {done && !active && <Icon name="check" className="ml-1 h-3 w-3" />}
                  </span>
                );
              })}
            </div>
          )}

          {/* Hint ribbon */}
          {hint && (
            <div className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{hint}</span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {!hideProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Your progress</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main content card with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${step}`}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className={cn('border-border p-4 shadow-lg sm:p-6', compact ? 'rounded-xl' : 'rounded-2xl')}>
              {children}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Footer with navigation */}
        <div className="sticky bottom-0 mt-4 border-t border-border bg-background/80 py-3 backdrop-blur-sm">
          <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            {/* Keyboard hints */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">←</kbd>
              <span>Back</span>
              <span className="opacity-50">·</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">→</kbd>
              <span>Next</span>
              <span className="opacity-50">·</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Enter</kbd>
              <span>Continue</span>
              {onSkip && (
                <>
                  <span className="opacity-50">·</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Esc</kbd>
                  <span>Skip</span>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isFirst || !onBack}
                className="flex-1 sm:flex-initial"
              >
                <Icon name="arrow-left" className="mr-1 h-4 w-4" />
                {backLabel}
              </Button>

              {onSkip && (
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  className="flex-1 sm:flex-initial"
                >
                  {skipLabel}
                </Button>
              )}

              <Button
                onClick={onNext}
                disabled={nextDisabled}
                className={cn('flex-1 sm:flex-initial', isLast && 'animate-pulse')}
              >
                {isLast ? (
                  <>
                    <Icon name="check" className="mr-1 h-4 w-4" />
                    Finish
                  </>
                ) : (
                  <>
                    {nextLabel}
                    <Icon name="arrow-right" className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default StepShell;