import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { Container } from '@/components/design-system/Container';
import { Icon } from '@/components/design-system/Icon';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_MESSAGES = [
  'Analyzing your baseline scores...',
  'Identifying your strengths and weaknesses...',
  'Structuring your personalized study schedule...',
  'Selecting the best practice materials...',
  'Calibrating task difficulty...',
  'Almost there...',
];

const ThinkingPage: NextPage = () => {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  // Rotate messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll for plan generation status
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/study-plan/status');
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();

        if (data.status === 'ready') {
          if (isMounted) {
            router.push('/study-plan');
          }
        } else if (data.status === 'error') {
          if (isMounted) {
            setError(data.error || 'Plan generation failed. Please try again.');
            setPolling(false);
          }
        } else {
          // Still generating, poll again after delay
          if (isMounted && polling) {
            timeoutId = setTimeout(checkStatus, 2000);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Something went wrong. Please try again.');
          setPolling(false);
        }
      }
    };

    if (polling) {
      timeoutId = setTimeout(checkStatus, 1000); // start after 1 sec
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [router, polling]);

  const handleRetry = () => {
    setError(null);
    setPolling(true);
  };

  const handleBack = () => router.back();

  return (
    <Container className="flex min-h-screen flex-col items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl backdrop-blur-md">
        {error ? (
          <>
            <div className="mb-4 text-destructive">
              <Icon name="alert-circle" className="mx-auto h-12 w-12" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Oops!</h2>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleBack}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Go back
              </button>
              <button
                onClick={handleRetry}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex justify-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/30" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-medium"
              >
                {LOADING_MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>

            <p className="mt-4 text-xs text-muted-foreground">
              This usually takes about 10–20 seconds.
            </p>
          </>
        )}
      </div>
    </Container>
  );
};

export default ThinkingPage;