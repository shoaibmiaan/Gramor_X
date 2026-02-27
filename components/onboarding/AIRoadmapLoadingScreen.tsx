import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type AIRoadmapLoadingScreenProps = {
  headline?: string;
  messages?: string[];
  rotateMs?: number;
  error?: string | null;
  onRetry?: () => void;
};

const DEFAULT_MESSAGES = [
  'Analyzing band gap...',
  'Structuring vocabulary roadmap...',
  'Designing writing correction cycle...',
  'Optimizing study intensity...',
];

export function AIRoadmapLoadingScreen({
  headline = 'Your AI Mentor is building your roadmap...',
  messages = DEFAULT_MESSAGES,
  rotateMs = 2000,
  error = null,
  onRetry,
}: AIRoadmapLoadingScreenProps) {
  const [index, setIndex] = useState(0);

  const safeMessages = useMemo(() => {
    if (!messages.length) {
      return DEFAULT_MESSAGES;
    }

    return messages;
  }, [messages]);

  useEffect(() => {
    if (error) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeMessages.length);
    }, rotateMs);

    return () => window.clearInterval(interval);
  }, [error, rotateMs, safeMessages.length]);

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <motion.div
        className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/15 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10">
          <motion.div
            className="h-10 w-10 rounded-full border-4 border-blue-300/30 border-t-blue-300"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <h1 className="text-balance text-2xl font-semibold md:text-3xl">{headline}</h1>

        {!error ? (
          <AnimatePresence mode="wait">
            <motion.p
              key={`${safeMessages[index]}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mt-6 text-lg text-blue-100"
            >
              {safeMessages[index]}
            </motion.p>
          </AnimatePresence>
        ) : (
          <div className="mt-6 rounded-xl border border-red-300/30 bg-red-500/10 p-4">
            <p className="text-red-100">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-400"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
