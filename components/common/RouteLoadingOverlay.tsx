'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from 'next-themes';

import type { SubscriptionTier } from '@/lib/navigation/types';

type ThemeMode = 'light' | 'dark';
type VariantId = 'studyBuddy' | 'aiCoach' | 'owl';

type VariantDefinition = {
  id: VariantId;
  label: string;
  friendlyMessages: readonly string[];
  statusMessages: readonly string[];
  stepDuration: number;
  overlayBackground: Record<ThemeMode, string>;
  cardBackground: Record<ThemeMode, string>;
  accentText: Record<ThemeMode, string>;
  Hero: (props: HeroProps) => JSX.Element;
};

type HeroProps = {
  themeMode: ThemeMode;
  shouldReduceMotion: boolean;
};

interface RouteLoadingOverlayProps {
  active: boolean;
  tier?: SubscriptionTier | null;
}

const TIER_TO_VARIANT: Record<SubscriptionTier, VariantId> = {
  free: 'studyBuddy',
  seedling: 'studyBuddy',
  rocket: 'aiCoach',
  owl: 'owl',
};

const friendlyStudyBuddy = Object.freeze([
  'Warming up your study plan…',
  'Loading your daily challenge…',
  'Hang tight — almost there 🚀',
]);

const statusStudyBuddy = Object.freeze([
  'Authenticating your buddy…',
  'Preparing your workspace…',
  'Loading play modules…',
]);

const friendlyAiCoach = Object.freeze([
  'Setting up your IELTS dashboard…',
  'Analysing your study DNA…',
  'Calibrating your AI coach…',
]);

const statusAiCoach = Object.freeze([
  'Authenticating your profile…',
  'Preparing your workspace…',
  'Loading AI modules…',
]);

const friendlyOwl = Object.freeze([
  'Refining your IELTS mastery…',
  'Polishing elite insight decks…',
  'Your Owl mentor is almost ready…',
]);

const statusOwl = Object.freeze([
  'Authenticating Owl tier…',
  'Preparing your workspace…',
  'Loading premium modules…',
]);

const StudyBuddyHero = ({ themeMode, shouldReduceMotion }: HeroProps) => (
  <motion.div
    className="relative flex h-16 w-16 items-center justify-center rounded-3xl sm:h-20 sm:w-20"
    animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.05, 1], rotate: [0, 4, -2, 0] }}
    transition={{ repeat: shouldReduceMotion ? 0 : Infinity, duration: 2.6, ease: 'easeInOut' }}
    aria-hidden
  >
    <span
      className={clsx(
        'absolute inset-[-18%] rounded-[2.75rem] blur-xl',
        themeMode === 'dark'
          ? 'bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.5),rgba(59,130,246,0))]'
          : 'bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.35),rgba(59,130,246,0))]'
      )}
    />
    <div
      className={clsx(
        'absolute inset-0 rounded-[2.2rem] border backdrop-blur-sm',
        themeMode === 'dark'
          ? 'border-indigo-400/20 bg-indigo-900/50'
          : 'border-indigo-200/30 bg-white/60'
      )}
    />
    <div className="relative flex space-x-2 text-2xl sm:text-3xl">
      {['📘', '💬', '🎯', '💡'].map((icon) => (
        <motion.span
          key={icon}
          animate={shouldReduceMotion ? { y: 0 } : { y: [0, -6, 0] }}
          transition={{ repeat: shouldReduceMotion ? 0 : Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="drop-shadow-[0_18px_30px_rgba(49,46,129,0.35)]"
        >
          {icon}
        </motion.span>
      ))}
    </div>
  </motion.div>
);

const AiCoachHero = ({ themeMode, shouldReduceMotion }: HeroProps) => (
  <motion.div
    className="relative flex h-16 w-16 items-center justify-center rounded-[1.75rem] sm:h-20 sm:w-20"
    animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.08, 1] }}
    transition={{ repeat: shouldReduceMotion ? 0 : Infinity, duration: 2.2, ease: 'easeInOut' }}
    aria-hidden
  >
    <span
      className={clsx(
        'absolute inset-[-22%] rounded-[2.4rem] blur-xl',
        themeMode === 'dark'
          ? 'bg-[radial-gradient(circle,rgba(56,189,248,0.45),rgba(14,165,233,0))]'
          : 'bg-[radial-gradient(circle,rgba(59,130,246,0.35),rgba(59,130,246,0))]'
      )}
    />
    <div
      className={clsx(
        'absolute inset-0 rounded-[1.75rem] border backdrop-blur-sm',
        themeMode === 'dark'
          ? 'border-sky-300/25 bg-sky-950/50'
          : 'border-sky-200/40 bg-white/60'
      )}
    />
    <motion.span
      className={clsx(
        'relative flex h-10 w-10 items-center justify-center rounded-[1.25rem] bg-gradient-to-br text-2xl font-semibold text-white',
        themeMode === 'dark'
          ? 'from-sky-400 to-cyan-400'
          : 'from-sky-500 to-indigo-400'
      )}
      animate={shouldReduceMotion ? { rotate: 0 } : { rotate: [0, 3, -3, 0] }}
      transition={{ repeat: shouldReduceMotion ? 0 : Infinity, duration: 3, ease: 'easeInOut' }}
    >
      GX
    </motion.span>
  </motion.div>
);

const OwlHero = ({ themeMode, shouldReduceMotion }: HeroProps) => (
  <motion.div
    className="relative flex h-16 w-16 items-center justify-center rounded-[1.75rem] sm:h-20 sm:w-20"
    animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.06, 1] }}
    transition={{ repeat: shouldReduceMotion ? 0 : Infinity, duration: 2.8, ease: 'easeInOut' }}
    aria-hidden
  >
    <span
      className={clsx(
        'absolute inset-[-18%] rounded-[2.2rem] blur-xl',
        themeMode === 'dark'
          ? 'bg-[radial-gradient(circle,rgba(250,204,21,0.4),rgba(250,204,21,0))]'
          : 'bg-[radial-gradient(circle,rgba(217,119,6,0.35),rgba(217,119,6,0))]'
      )}
    />
    <div
      className={clsx(
        'absolute inset-0 rounded-[1.75rem] border backdrop-blur-sm',
        themeMode === 'dark'
          ? 'border-yellow-200/20 bg-slate-900/70'
          : 'border-yellow-500/20 bg-white/70'
      )}
    />
    <motion.span
      className={clsx(
        'relative flex h-10 w-10 items-center justify-center rounded-[1.25rem] bg-gradient-to-br text-xl font-semibold',
        themeMode === 'dark'
          ? 'from-amber-300 via-amber-400 to-amber-500 text-slate-900'
          : 'from-amber-200 via-amber-300 to-amber-400 text-slate-800'
      )}
      animate={shouldReduceMotion ? { rotate: 0 } : { rotate: 360 }}
      transition={{ repeat: shouldReduceMotion ? 0 : Infinity, duration: 8, ease: 'linear' }}
    >
      ✶
    </motion.span>
  </motion.div>
);

const VARIANTS: Record<VariantId, VariantDefinition> = {
  studyBuddy: {
    id: 'studyBuddy',
    label: 'Study buddy is on it',
    friendlyMessages: friendlyStudyBuddy,
    statusMessages: statusStudyBuddy,
    stepDuration: 2600,
    overlayBackground: {
      dark: 'bg-gradient-to-br from-[#0f172a]/95 via-[#1f1b4d]/92 to-[#1e3a8a]/94',
      light: 'bg-gradient-to-br from-[#eef2ff]/95 via-[#e0f2fe]/92 to-[#ede9fe]/95',
    },
    cardBackground: {
      dark: 'bg-slate-950/55 border-indigo-400/20',
      light: 'bg-white/70 border-indigo-200/40',
    },
    accentText: {
      dark: 'text-indigo-200/80',
      light: 'text-indigo-500/70',
    },
    Hero: StudyBuddyHero,
  },
  aiCoach: {
    id: 'aiCoach',
    label: 'AI coach is prepping',
    friendlyMessages: friendlyAiCoach,
    statusMessages: statusAiCoach,
    stepDuration: 2400,
    overlayBackground: {
      dark: 'bg-gradient-to-br from-[#020617]/96 via-[#0f172a]/92 to-[#082f49]/94',
      light: 'bg-gradient-to-br from-[#f1f5f9]/95 via-[#e0f2fe]/92 to-[#e2e8f0]/95',
    },
    cardBackground: {
      dark: 'bg-slate-950/60 border-sky-300/25',
      light: 'bg-white/70 border-sky-200/35',
    },
    accentText: {
      dark: 'text-sky-200/80',
      light: 'text-sky-600/80',
    },
    Hero: AiCoachHero,
  },
  owl: {
    id: 'owl',
    label: 'Owl concierge engaged',
    friendlyMessages: friendlyOwl,
    statusMessages: statusOwl,
    stepDuration: 2800,
    overlayBackground: {
      dark: 'bg-gradient-to-br from-[#020617]/96 via-[#0f172a]/92 to-[#111827]/95',
      light: 'bg-gradient-to-br from-[#fefce8]/92 via-[#fef3c7]/88 to-[#ede9fe]/92',
    },
    cardBackground: {
      dark: 'bg-slate-950/60 border-amber-200/20',
      light: 'bg-white/70 border-amber-300/30',
    },
    accentText: {
      dark: 'text-amber-200/75',
      light: 'text-amber-600/70',
    },
    Hero: OwlHero,
  },
};

function pickNext(messages: readonly string[], previous?: string) {
  if (!messages.length) return '';
  if (messages.length === 1) return messages[0];
  const pool = previous ? messages.filter((message) => message !== previous) : [...messages];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? messages[0];
}

function useFriendlyMessage(messages: readonly string[], active: boolean, variantId: VariantId) {
  const [message, setMessage] = useState(() => pickNext(messages));

  useEffect(() => {
    setMessage(pickNext(messages));
  }, [messages, variantId]);

  useEffect(() => {
    if (!active) return;
    setMessage((previous) => pickNext(messages, previous));
  }, [active, messages, variantId]);

  return message;
}

function useStatus(messages: readonly string[], active: boolean, stepDuration: number, variantId: VariantId) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [variantId, messages]);

  useEffect(() => {
    if (!active || messages.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, stepDuration);
    return () => window.clearInterval(intervalId);
  }, [active, messages, stepDuration, variantId]);

  const current = messages[index] ?? messages[0] ?? '';
  return { current, index, total: messages.length || 1 } as const;
}

export function RouteLoadingOverlay({ active, tier }: RouteLoadingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const themeMode: ThemeMode = resolvedTheme === 'light' ? 'light' : 'dark';

  const variantId: VariantId = useMemo(() => {
    if (tier && tier in TIER_TO_VARIANT) return TIER_TO_VARIANT[tier];
    return 'studyBuddy';
  }, [tier]);

  const variant = VARIANTS[variantId];
  const friendlyMessage = useFriendlyMessage(variant.friendlyMessages, active, variantId);
  const { current: statusMessage, index: statusIndex, total: statusTotal } = useStatus(
    variant.statusMessages,
    active,
    variant.stepDuration,
    variantId
  );
  const hasStatusMessage = statusMessage.trim().length > 0;

  const [shouldRender, setShouldRender] = useState(active);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
      return;
    }

    const timeout = window.setTimeout(() => setShouldRender(false), 220);
    return () => window.clearTimeout(timeout);
  }, [active]);

  if (!shouldRender && !active) {
    return null;
  }

  return (
    <AnimatePresence>
      {(active || shouldRender) && (
        <motion.div
          className={clsx(
            'fixed inset-0 z-[1000] flex items-center justify-center px-6 py-10 sm:px-10',
            'backdrop-blur-xl transition-colors duration-300',
            variant.overlayBackground[themeMode]
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            className={clsx(
              'relative flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border px-6 py-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.35)] sm:max-w-lg sm:gap-6 sm:px-10 sm:py-10',
              variant.cardBackground[themeMode]
            )}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            role="status"
            aria-live="polite"
          >
            <variant.Hero themeMode={themeMode} shouldReduceMotion={shouldReduceMotion} />

            <div className="space-y-3 sm:space-y-4">
              <p className={clsx('text-[0.65rem] uppercase tracking-[0.28em] sm:text-xs', variant.accentText[themeMode])}>
                {variant.label}
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={friendlyMessage}
                  className={clsx(
                    'text-lg font-semibold leading-tight sm:text-xl',
                    themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                  )}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                  {friendlyMessage}
                </motion.p>
              </AnimatePresence>
            </div>

            {hasStatusMessage && (
              <div className="w-full space-y-3 text-sm sm:text-[0.95rem]">
                <div
                  className={clsx(
                    'relative h-1.5 overflow-hidden rounded-full',
                    themeMode === 'dark' ? 'bg-white/10' : 'bg-slate-200/70'
                  )}
                  aria-hidden
                >
                  <motion.span
                    className={clsx(
                      'absolute inset-y-0 rounded-full bg-gradient-to-r',
                      themeMode === 'dark' ? 'from-white/70 to-white/40' : 'from-slate-900/70 to-slate-900/30'
                    )}
                    initial={{ width: '15%' }}
                    animate={{ width: `${Math.min(100, ((statusIndex + 1) / statusTotal) * 100)}%` }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                </div>
                <p className={themeMode === 'dark' ? 'text-slate-200/80' : 'text-slate-600'}>{statusMessage}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RouteLoadingOverlay;
