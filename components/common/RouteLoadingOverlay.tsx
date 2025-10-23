import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface RouteLoadingOverlayProps {
  active: boolean;
}

const FRIENDLY_MESSAGES = [
  'Setting up your IELTS dashboard…',
  'Warming up your study plan…',
  'Hang tight — almost there 🚀',
];

const PROGRESS_MESSAGES = ['Authenticating…', 'Preparing your workspace…', 'Loading modules…'];

const PROGRESS_STEP_DURATION_MS = 1800;

function pickFriendlyMessage(previous?: string) {
  const options = previous ? FRIENDLY_MESSAGES.filter((message) => message !== previous) : FRIENDLY_MESSAGES;
  return options[Math.floor(Math.random() * options.length)] ?? FRIENDLY_MESSAGES[0];
}

export function RouteLoadingOverlay({ active }: RouteLoadingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();
  const [friendlyMessage, setFriendlyMessage] = useState(() => pickFriendlyMessage());
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (active) {
      setFriendlyMessage((previous) => pickFriendlyMessage(previous));
      setStatusIndex(0);

      if (PROGRESS_MESSAGES.length > 1) {
        intervalId = setInterval(() => {
          setStatusIndex((current) => (current + 1) % PROGRESS_MESSAGES.length);
        }, PROGRESS_STEP_DURATION_MS);
      }
    } else {
      setStatusIndex(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [active]);

  const currentStatus = PROGRESS_MESSAGES[statusIndex] ?? PROGRESS_MESSAGES[0];

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-[#060714]/80 backdrop-blur-[14px] bg-[radial-gradient(circle_at_20%_20%,rgba(76,201,240,0.32),transparent_58%),_radial-gradient(circle_at_80%_25%,rgba(247,37,133,0.22),transparent_55%),_linear-gradient(135deg,rgba(12,20,46,0.82),rgba(18,12,60,0.78),rgba(9,31,64,0.85))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <motion.div
            className="relative isolate flex w-[min(28rem,90vw)] flex-col items-center gap-8 overflow-hidden rounded-[2.25rem] bg-white/10 p-10 text-center shadow-[0_45px_120px_rgba(11,8,45,0.55)] ring-1 ring-white/20 backdrop-blur-[18px] dark:bg-white/10 dark:ring-white/10"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            role="status"
            aria-live="polite"
          >
            <motion.span
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(67,97,238,0.25),transparent_65%)]"
              animate={shouldReduceMotion ? undefined : { opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 2.4, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
              aria-hidden
            />

            <motion.div
              className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-primary/85 via-[rgba(157,78,221,0.85)] to-[rgba(76,201,240,0.92)] shadow-[0_20px_60px_rgba(43,28,110,0.55)]"
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { scale: [1, 1.06, 1], rotate: [0, 4, 0] }
              }
              transition={{ duration: 1.3, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
              aria-hidden
            >
              <span
                className="absolute h-14 w-[0.42rem] rotate-45 rounded-full bg-white/90 drop-shadow-[0_8px_20px_rgba(255,255,255,0.35)]"
                aria-hidden
              />
              <span
                className="absolute h-14 w-[0.42rem] -rotate-45 rounded-full bg-white/90 drop-shadow-[0_8px_20px_rgba(255,255,255,0.35)]"
                aria-hidden
              />
              <motion.span
                className="absolute inset-[-35%] rounded-[2.5rem] bg-[radial-gradient(circle,rgba(255,255,255,0.55),rgba(255,255,255,0)_70%)]"
                animate={shouldReduceMotion ? undefined : { opacity: [0.25, 0.9, 0.25] }}
                transition={{ duration: 2.1, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
                aria-hidden
              />
            </motion.div>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-[0.32em] text-white/60">Gramor X</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={friendlyMessage}
                    className="text-[1.5rem] font-semibold leading-snug text-white drop-shadow-[0_4px_25px_rgba(10,0,40,0.45)]"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {friendlyMessage}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="mx-auto w-full max-w-xs space-y-3 text-sm text-white/80">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    key={statusIndex}
                    className="h-full w-full origin-left rounded-full bg-gradient-to-r from-[#4cc9f0] via-[#4361ee] to-[#f72585]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: PROGRESS_STEP_DURATION_MS / 1000, ease: 'easeInOut' }}
                    aria-hidden
                  />
                </div>

                <div className="relative h-6 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentStatus}
                      className="absolute inset-0 flex items-center justify-center text-center text-[0.95rem] text-white/70"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {currentStatus}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default RouteLoadingOverlay;
