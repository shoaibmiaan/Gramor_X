// components/onboarding/StepShell.tsx
import { ReactNode } from 'react';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Progress } from '@/components/design-system/Progress';
import { cn } from '@/lib/utils';

interface StepShellProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  hint?: string;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
  isLoading?: boolean;
}

export function StepShell({
  step,
  total,
  title,
  subtitle,
  hint,
  children,
  onNext,
  onBack,
  nextDisabled = false,
  nextLabel = 'Continue',
  backLabel = 'Back',
  isLoading = false,
}: StepShellProps) {
  const progress = (step / total) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header with progress */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <Container className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="Go back"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold">Onboarding</h1>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Step {step} of {total}
            </div>
          </div>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
          </div>
        </Container>
      </header>

      {/* Main content */}
      <main className="py-8">
        <Container className="max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {subtitle}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            {children}
          </div>

          {hint && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">💡 Hint:</span> {hint}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isLoading}
              >
                {backLabel}
              </Button>
            )}
            {onNext && (
              <Button
                onClick={onNext}
                disabled={nextDisabled || isLoading}
                isLoading={isLoading}
                className="ml-auto"
              >
                {nextLabel}
              </Button>
            )}
          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-auto">
        <Container className="py-4">
          <p className="text-center text-sm text-gray-500">
            © 2024 GramorX. All rights reserved.
          </p>
        </Container>
      </footer>
    </div>
  );
}

export default StepShell;