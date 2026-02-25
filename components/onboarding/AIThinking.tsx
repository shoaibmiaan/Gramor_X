import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/design-system/Icon';
import { Button } from '@/components/design-system/Button';

export interface AIThinkingProps {
  isOpen: boolean;
  onClose?: () => void;
  onRetry?: () => void;
  messages?: string[];
  error?: string | null;
  polling?: boolean;
  className?: string;
  fullScreen?: boolean;
}

const DEFAULT_MESSAGES = [
  'Analyzing your baseline scores...',
  'Identifying your strengths and weaknesses...',
  'Structuring your personalized study schedule...',
  'Selecting the best practice materials...',
  'Calibrating task difficulty...',
  'Almost there...',
];

export const AIThinking: React.FC<AIThinkingProps> = ({
  isOpen,
  onClose,
  onRetry,
  messages = DEFAULT_MESSAGES,
  error = null,
  polling = true,
  className = '',
  fullScreen = true,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (!polling || error) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, error, messages.length]);

  if (!isOpen) return null;

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        fullScreen ? 'min-h-screen w-full' : 'p-8',
        className
      )}
    >
      <div
        className={cn(
          'rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl backdrop-blur-md',
          fullScreen ? 'w-full max-w-md' : 'w-auto'
        )}
      >
        {error ? (
          <>
            <div className="mb-4 text-destructive">
              <Icon name="alert-circle" className="mx-auto h-12 w-12" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Oops!</h2>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <div className="flex justify-center gap-4">
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              )}
              {onRetry && (
                <Button onClick={onRetry}>
                  Retry
                </Button>
              )}
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
                {messages[messageIndex]}
              </motion.p>
            </AnimatePresence>

            <p className="mt-4 text-xs text-muted-foreground">
              This usually takes about 10–20 seconds.
            </p>
          </>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};