import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft } from 'lucide-react';
import { Progress } from '@/components/design-system/Progress';

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
  title?: string;
  description?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function OnboardingLayout({
  children,
  currentStep = 1,
  totalSteps = 5,
  title,
  description,
  showBack = true,
  onBack
}: OnboardingLayoutProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const stepLabels = [
    'Target Band',
    'Exam Date',
    'Baseline',
    'Vibe',
    'Review',
    'Generate'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <Link href="/" className="text-2xl font-bold text-blue-600">
                GramorX
              </Link>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center space-x-2">
              {stepLabels.slice(0, totalSteps).map((label, index) => (
                <div key={index} className="flex items-center">
                  <div className={`hidden sm:block text-sm ${
                    index + 1 === currentStep
                      ? 'text-blue-600 font-medium'
                      : index + 1 < currentStep
                        ? 'text-green-600'
                        : 'text-gray-400'
                  }`}>
                    {label}
                  </div>
                  {index < totalSteps - 1 && (
                    <ChevronLeft className="w-4 h-4 mx-2 text-gray-300 rotate-180 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Step Progress */}
          <div className="mt-4 sm:hidden">
            <div className="flex justify-between text-sm mb-1">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        {(title || description) && (
          <div className="text-center mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Children */}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>© 2024 GramorX. All rights reserved.</div>
            <div className="flex space-x-4">
              <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">
                Terms
              </Link>
              <Link href="/help" className="hover:text-gray-700 dark:hover:text-gray-300">
                Help
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}