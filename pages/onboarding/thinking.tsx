import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { getServerClient } from '@/lib/supabaseServer';
import { StepShell } from '@/components/onboarding/StepShell';
import { Card } from '@/components/design-system/Card';
import { Progress } from '@/components/design-system/Progress';
import { Button } from '@/components/design-system/Button';

interface ThinkingPageProps {
  userId: string;
}

export default function ThinkingPage({ userId }: ThinkingPageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'generating' | 'completed' | 'failed'>('generating');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Analyzing your profile...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch('/api/onboarding/thinking-status');
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status);
          setProgress(data.progress);
          setMessage(data.message);

          if (data.status === 'completed') {
            // Redirect to dashboard after a short delay
            timeout = setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          } else if (data.status === 'failed') {
            setError('Failed to generate study plan. Please try again.');
          }
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    // Check immediately
    checkStatus();

    // Then poll every 3 seconds
    interval = setInterval(checkStatus, 3000);

    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  const handleRetry = async () => {
    setError(null);
    setStatus('generating');
    setProgress(0);
    setMessage('Restarting generation...');

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restart generation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart');
      setStatus('failed');
    }
  };

  return (
    <StepShell
      title="Creating Your Study Plan"
      description="Our AI is analyzing your profile and creating a personalized study plan"
      currentStep={5}
      totalSteps={5}
    >
      <div className="max-w-md mx-auto text-center">
        <Card className="p-8">
          {/* Animated Icon */}
          <div className="mb-6">
            {status === 'generating' && (
              <div className="relative">
                <div className="w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                  <div
                    className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                    style={{ animationDuration: '1.5s' }}
                  ></div>
                </div>
                <div className="mt-4 text-5xl">🤔</div>
              </div>
            )}
            {status === 'completed' && (
              <div className="text-6xl text-green-500">🎉</div>
            )}
            {status === 'failed' && (
              <div className="text-6xl text-red-500">😕</div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status Message */}
          <p className="text-lg mb-2">{message}</p>

          {/* Progress Percentage */}
          <p className="text-sm text-gray-600 mb-6">
            {progress}% complete
          </p>

          {/* Generation Steps */}
          {status === 'generating' && (
            <div className="space-y-2 text-left">
              <StepIndicator
                label="Analyzing your profile"
                completed={progress >= 30}
                active={progress >= 20 && progress < 30}
              />
              <StepIndicator
                label="Calculating skill gaps"
                completed={progress >= 60}
                active={progress >= 40 && progress < 60}
              />
              <StepIndicator
                label="Creating weekly schedule"
                completed={progress >= 90}
                active={progress >= 70 && progress < 90}
              />
              <StepIndicator
                label="Finalizing your plan"
                completed={progress >= 100}
                active={progress >= 95 && progress < 100}
              />
            </div>
          )}

          {/* Error State */}
          {status === 'failed' && error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-x-3">
            {status === 'failed' && (
              <Button onClick={handleRetry}>
                Try Again
              </Button>
            )}
            {status === 'completed' && (
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            )}
            {status === 'generating' && (
              <Button variant="outline" disabled>
                Generating...
              </Button>
            )}
          </div>
        </Card>

        {/* Fun Facts */}
        {status === 'generating' && (
          <div className="mt-6 text-sm text-gray-600 animate-pulse">
            <FunFact />
          </div>
        )}
      </div>
    </StepShell>
  );
}

// Helper Components
function StepIndicator({ label, completed, active }: any) {
  return (
    <div className="flex items-center">
      <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
        completed ? 'bg-green-500' :
        active ? 'bg-blue-500 animate-pulse' :
        'bg-gray-200'
      }`}>
        {completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={active ? 'font-medium' : ''}>{label}</span>
    </div>
  );
}

function FunFact() {
  const facts = [
    "Did you know? Consistent daily practice improves retention by 50%!",
    "Students who follow a structured plan improve 2x faster.",
    "The best time to study is when you're most alert - morning or evening?",
    "Regular breaks actually help your brain consolidate learning.",
    "You're joining 10,000+ students who improved their scores!",
  ];

  const [fact, setFact] = useState(facts[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFact(facts[Math.floor(Math.random() * facts.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return <p>💡 {fact}</p>;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = getServerClient(context);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step')
    .eq('user_id', user.id)
    .single();

  // Redirect if not at correct step
  if (!profile || profile.onboarding_step < 5) {
    return {
      redirect: {
        destination: '/onboarding',
        permanent: false,
      },
    };
  }

  return {
    props: {
      userId: user.id,
    },
  };
};