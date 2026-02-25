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
            timeout = setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          } else if (data.status === 'failed') {
            setError('Failed to generate study plan. Please try again.');
          }
        }
      } catch (err) {
        // Silent
      }
    };

    checkStatus();
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
            <div className="text-5xl mb-4">✅</div>
          )}
          {status === 'failed' && (
            <div className="text-5xl mb-4">❌</div>
          )}

          <h2 className="text-xl font-bold mb-2">{message}</h2>
          <Progress value={progress} className="mt-4" />

          <div className="mt-6 space-y-4">
            <StepIndicator
              label="Gathering your info"
              completed={progress >= 25}
              active={progress < 25}
            />
            <StepIndicator
              label="Analyzing skills"
              completed={progress >= 50}
              active={progress >= 25 && progress < 50}
            />
            <StepIndicator
              label="Building plan"
              completed={progress >= 75}
              active={progress >= 50 && progress < 75}
            />
            <StepIndicator
              label="Finalizing your plan"
              completed={progress >= 100}
              active={progress >= 75 && progress < 100}
            />
          </div>

          {status === 'failed' && error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

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

        {status === 'generating' && (
          <div className="mt-6 text-sm text-gray-600 animate-pulse">
            <FunFact />
          </div>
        )}
      </div>
    </StepShell>
  );
}

// Helper Components (completed from truncated)
function StepIndicator({ label, completed, active }: { label: string; completed: boolean; active: boolean }) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.onboarding_step < 5) {
    return {
      redirect: {
        destination: '/onboarding/review',
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