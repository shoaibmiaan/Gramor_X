import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from 'next-themes';

import type { SubscriptionTier } from '@/lib/navigation/types';

interface RouteLoadingOverlayProps {
  active: boolean;
  tier?: SubscriptionTier | null;
}

type ThemeMode = 'light' | 'dark';

type VariantId = 'studyBuddy' | 'aiCoach' | 'owl';

type VariantDefinition = {
  id: VariantId;
  label: string;
  friendlyMessages: readonly string[];
  statusMessages: readonly string[];
  stepDuration: number;
  overlayBackground: Record<ThemeMode, string>;
  render: (props: VariantRendererProps) => JSX.Element;
};

type VariantRendererProps = {
  friendlyMessage: string;
  statusMessages: readonly string[];
  currentStatus: string;
  statusIndex: number;
  label: string;
  themeMode: ThemeMode;
  shouldReduceMotion: boolean;
  stepDuration: number;
};

type HeroProps = {
  themeMode: ThemeMode;
  shouldReduceMotion: boolean;
};

const TIER_TO_VARIANT: Record<SubscriptionTier, VariantId> = {
  free: 'studyBuddy',
  seedling: 'studyBuddy',
  rocket: 'aiCoach',
  owl: 'owl',
};

const STUDY_BUDDY_MESSAGES = Object.freeze([
  'Loading your daily challenge…',
  'Your buddy is lining up practice quests…',
  'Gamifying today’s study plan…',
]);

const STUDY_BUDDY_STATUSES = Object.freeze([
  'Gathering flashcards…',
  'Powering up chat hints…',
  'Queuing practice quests…',
]);

const AI_COACH_MESSAGES = Object.freeze([
  'Setting up your AI coaching bay…',
  'Calibrating your IELTS playbook…',
  'Plotting the next skill sprint…',
]);

const AI_COACH_STATUSES = Object.freeze([
  'Synchronizing your goals…',
  'Priming the coach engine…',
  'Assembling targeted drills…',
]);

const OWL_MESSAGES = Object.freeze([
  'Refining your IELTS mastery…',
  'Polishing elite insight decks…',
  'Your Owl mentor is almost ready…',
]);

const OWL_STATUSES = Object.freeze([
  'Authenticating Owl tier…',
  'Curating premium analytics…',
  'Finalizing elite workspace…',
]);

function pickMessage(messages: readonly string[], previous?: string) {
  if (!messages.length) return '';
  if (messages.length === 1) return messages[0];

  const pool = previous ? messages.filter((message) => message !== previous) : [...messages];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? messages[0];
}

function useFriendlyMessage(messages: readonly string[], active: boolean, variantId: VariantId) {
  const [message, setMessage] = useState(() => pickMessage(messages));

  useEffect(() => {
    setMessage(pickMessage(messages));
  }, [messages, variantId]);

  useEffect(() => {
    if (!active) return;
    setMessage((previous) => pickMessage(messages, previous));
  }, [active, messages, variantId]);

  return message;
}

function useProgressCycle(messages: readonly string[], active: boolean, stepDuration: number, variantId: VariantId) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [variantId, messages, active]);

  useEffect(() => {
    if (!active || messages.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, stepDuration);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active, messages, stepDuration, variantId]);

  const currentStatus = messages[index] ?? messages[0] ?? '';
  return { currentStatus, statusIndex: index } as const;
}

const StudyBuddyHero = ({ themeMode, shouldReduceMotion }: HeroProps) => {
  const icons = ['📘', '💬', '🎯', '💡'];

  return (
    <div className="relative flex h-24 w-full items-center justify-center">
      <motion.span
        className={clsx(
          'pointer-events-none absolute inset-0 -z-10 rounded-[3rem] blur-2xl',
          themeMode === 'dark' ? 'bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.35),rgba(37,99,235,0)_75%)]' : 'bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.2),rgba(59,130,246,0)_75%)]',
        )}
        animate={
          shouldReduceMotion
            ? { opacity: 0.4 }
            : { opacity: [0.35, 0.7, 0.35], scale: [1, 1.05, 1] }
        }
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
        aria-hidden
      />

      <motion.div
        className="flex space-x-3 text-4xl sm:text-5xl"
        animate={shouldReduceMotion ? { y: 0 } : { y: [0, -10, 0] }}
        transition={{ duration: 1.8, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        {icons.map((icon, index) => (
          <motion.span
            key={icon}
            className="drop-shadow-[0_16px_35px_rgba(48,27,110,0.35)]"
            animate={
              shouldReduceMotion
                ? { rotate: 0 }
                : { rotate: [0, 8, -6, 0] }
            }
            transition={{
              duration: 2.3,
              ease: 'easeInOut',
              repeat: shouldReduceMotion ? 0 : Infinity,
              delay: index * 0.08,
            }}
          >
            {icon}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

const AiCoachHero = ({ themeMode, shouldReduceMotion }: HeroProps) => (
  <div className="relative flex h-24 w-24 items-center justify-center">
    <motion.span
      className={clsx(
        'pointer-events-none absolute inset-[-22%] -z-10 rounded-[3rem]',
        themeMode === 'dark'
          ? 'bg-[radial-gradient(circle,rgba(76,201,240,0.24),rgba(76,201,240,0)_70%)]'
          : 'bg-[radial-gradient(circle,rgba(59,130,246,0.25),rgba(59,130,246,0)_70%)]',
      )}
      animate={
        shouldReduceMotion
          ? { opacity: 0.5 }
          : { opacity: [0.25, 0.8, 0.25], scale: [1, 1.08, 1] }
      }
      transition={{ duration: 2, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
      aria-hidden
    />
    <motion.span
      className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/20"
      animate={
        shouldReduceMotion
          ? { opacity: 0.4 }
          : { opacity: [0.2, 0.6, 0.2] }
      }
      transition={{ duration: 2.6, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
      aria-hidden
    />
    <motion.div
      className={clsx(
        'relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] shadow-[0_25px_70px_rgba(67,97,238,0.45)]',
        themeMode === 'dark'
          ? 'bg-gradient-to-br from-[#4361ee] via-[#5b8def] to-[#4cc9f0]'
          : 'bg-gradient-to-br from-[#38bdf8] via-[#6366f1] to-[#a855f7]',
      )}
      animate={
        shouldReduceMotion
          ? { scale: 1 }
          : { scale: [1, 1.06, 1], rotate: [0, 3, 0] }
      }
      transition={{ duration: 1.6, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
      aria-hidden
    >
      <span
        className={clsx(
          'absolute h-16 w-[0.45rem] rotate-45 rounded-full',
          themeMode === 'dark'
            ? 'bg-white/90 drop-shadow-[0_10px_25px_rgba(255,255,255,0.45)]'
            : 'bg-slate-900/90 drop-shadow-[0_10px_25px_rgba(15,23,42,0.25)]',
        )}
        aria-hidden
      />
      <span
        className={clsx(
          'absolute h-16 w-[0.45rem] -rotate-45 rounded-full',
          themeMode === 'dark'
            ? 'bg-white/90 drop-shadow-[0_10px_25px_rgba(255,255,255,0.45)]'
            : 'bg-slate-900/90 drop-shadow-[0_10px_25px_rgba(15,23,42,0.25)]',
        )}
        aria-hidden
      />
      <motion.span
        className="pointer-events-none absolute inset-[-28%] rounded-[2.3rem] bg-[radial-gradient(circle,rgba(255,255,255,0.55),rgba(255,255,255,0)_70%)]"
        animate={
          shouldReduceMotion
            ? { opacity: 0.3 }
            : { opacity: [0.2, 0.9, 0.2] }
        }
        transition={{ duration: 2.1, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
        aria-hidden
      />
    </motion.div>
  </div>
);

const OwlHero = ({ themeMode, shouldReduceMotion }: HeroProps) => (
  <div className="relative flex h-24 w-24 items-center justify-center">
    <motion.span
      className={clsx(
        'pointer-events-none absolute inset-[-20%] -z-10 rounded-full',
        themeMode === 'dark'
          ? 'bg-[radial-gradient(circle,rgba(250,204,21,0.2),rgba(250,204,21,0)_70%)]'
          : 'bg-[radial-gradient(circle,rgba(217,119,6,0.22),rgba(217,119,6,0)_70%)]',
      )}
      animate={
        shouldReduceMotion
          ? { opacity: 0.5 }
          : { opacity: [0.3, 0.85, 0.3], scale: [1, 1.1, 1] }
      }
      transition={{ duration: 2.8, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
      aria-hidden
    />
    <motion.div
      className={clsx(
        'relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.5rem] border border-white/20 p-2 shadow-[0_28px_80px_rgba(173,139,91,0.45)]',
        themeMode === 'dark'
          ? 'bg-gradient-to-br from-[#0f172a]/90 via-[#1e293b]/85 to-[#111827]/90'
          : 'bg-gradient-to-br from-[#fef3c7]/90 via-[#f5f3ff]/85 to-[#ede9fe]/90',
      )}
      animate={
        shouldReduceMotion
          ? { rotate: 0 }
          : { rotate: [0, 360] }
      }
      transition={{ duration: 8, ease: 'linear', repeat: shouldReduceMotion ? 0 : Infinity }}
      aria-hidden
    >
      <div
        className={clsx(
          'relative flex h-full w-full items-center justify-center rounded-[1.2rem] bg-gradient-to-br shadow-inner',
          themeMode === 'dark'
            ? 'from-[#facc15]/80 via-[#fbbf24]/70 to-[#f59e0b]/80'
            : 'from-[#fde68a]/90 via-[#fcd34d]/80 to-[#fbbf24]/85',
        )}
      >
        <span
          className={clsx(
            'absolute h-14 w-[0.4rem] rotate-45 rounded-full',
            themeMode === 'dark' ? 'bg-slate-900/90' : 'bg-white/90',
          )}
          aria-hidden
        />
        <span
          className={clsx(
            'absolute h-14 w-[0.4rem] -rotate-45 rounded-full',
            themeMode === 'dark' ? 'bg-slate-900/90' : 'bg-white/90',
          )}
          aria-hidden
        />
        <motion.span
          className="pointer-events-none absolute inset-[-35%] rounded-[2rem] bg-[radial-gradient(circle,rgba(255,255,255,0.65),rgba(255,255,255,0)_70%)]"
          animate={
            shouldReduceMotion
              ? { opacity: 0.4 }
              : { opacity: [0.3, 0.75, 0.3] }
          }
          transition={{ duration: 3, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
          aria-hidden
        />
      </div>
    </motion.div>
  </div>
);

const renderStudyBuddy = ({
  friendlyMessage,
  statusMessages,
  currentStatus,
  statusIndex,
  label,
  themeMode,
  shouldReduceMotion,
  stepDuration,
}: VariantRendererProps) => {
  const cardClassName = clsx(
    'pointer-events-auto relative isolate flex w-[min(30rem,92vw)] flex-col items-center gap-7 overflow-hidden rounded-[2.75rem] border px-9 py-10 text-center shadow-[0_35px_90px_rgba(56,25,109,0.35)] backdrop-blur-xl',
    themeMode === 'dark'
      ? 'border-violet-200/15 bg-gradient-to-br from-[#1e1b4b]/92 via-[#2e1065]/88 to-[#1f1b4d]/92 text-indigo-50'
      : 'border-indigo-400/20 bg-gradient-to-br from-[#eef2ff]/95 via-[#ede9fe]/90 to-[#cffafe]/92 text-slate-900',
  );

  return (
    <motion.div
      className={cardClassName}
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 18 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <motion.span
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.25),transparent_65%)]"
        animate={
          shouldReduceMotion
            ? { opacity: 0.4 }
            : { opacity: [0.3, 0.75, 0.3], scale: [1, 1.05, 1] }
        }
        transition={{ duration: 3, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
        aria-hidden
      />

      <StudyBuddyHero themeMode={themeMode} shouldReduceMotion={shouldReduceMotion} />

      <div className="space-y-3">
        <p
          className={clsx(
            'text-[0.72rem] uppercase tracking-[0.3em]',
            themeMode === 'dark' ? 'text-indigo-200/70' : 'text-indigo-500/70',
          )}
        >
          {label}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={friendlyMessage}
            className={clsx(
              'text-[1.45rem] font-semibold leading-snug',
              themeMode === 'dark'
                ? 'text-white drop-shadow-[0_18px_45px_rgba(33,17,92,0.55)]'
                : 'text-slate-900',
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {friendlyMessage}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full space-y-4 text-sm">
        <div
          className={clsx(
            'h-1.5 overflow-hidden rounded-full',
            themeMode === 'dark' ? 'bg-white/15' : 'bg-indigo-100',
          )}
        >
          <motion.div
            key={`study-buddy-progress-${statusIndex}`}
            className={clsx(
              'h-full w-full origin-left rounded-full',
              themeMode === 'dark'
                ? 'bg-gradient-to-r from-[#c084fc] via-[#818cf8] to-[#38bdf8]'
                : 'bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#06b6d4]',
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: stepDuration / 1000, ease: 'easeInOut' }}
            aria-hidden
          />
        </div>

        <div className="relative h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStatus}
              className={clsx(
                'absolute inset-0 flex items-center justify-center text-center',
                themeMode === 'dark' ? 'text-indigo-100/90' : 'text-slate-700',
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {currentStatus}
            </motion.span>
          </AnimatePresence>
        </div>

        <p
          className={clsx(
            'text-xs font-semibold uppercase tracking-[0.32em]',
            themeMode === 'dark' ? 'text-indigo-200/60' : 'text-indigo-500/60',
          )}
        >
          Quest {statusIndex + 1} of {statusMessages.length}
        </p>
      </div>
    </motion.div>
  );
};

const renderAiCoach = ({
  friendlyMessage,
  statusMessages,
  currentStatus,
  statusIndex,
  label,
  themeMode,
  shouldReduceMotion,
  stepDuration,
}: VariantRendererProps) => {
  const cardClassName = clsx(
    'pointer-events-auto relative isolate flex w-[min(32rem,94vw)] flex-col items-center gap-8 overflow-hidden rounded-[2.5rem] border px-10 py-12 text-center shadow-[0_45px_120px_rgba(30,37,99,0.5)] backdrop-blur-[18px]',
    themeMode === 'dark'
      ? 'border-white/12 bg-gradient-to-br from-[#0f172a]/92 via-[#111c33]/88 to-[#1e1b4b]/90 text-white'
      : 'border-slate-900/10 bg-gradient-to-br from-white/95 via-[#e0f2fe]/90 to-[#eef2ff]/92 text-slate-900',
  );

  return (
    <motion.div
      className={cardClassName}
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 20 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <motion.span
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,rgba(76,201,240,0.25),transparent_70%)]"
        animate={
          shouldReduceMotion
            ? { opacity: 0.35 }
            : { opacity: [0.3, 0.75, 0.3], scale: [1, 1.07, 1] }
        }
        transition={{ duration: 3.2, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
        aria-hidden
      />

      <AiCoachHero themeMode={themeMode} shouldReduceMotion={shouldReduceMotion} />

      <div className="space-y-3">
        <p
          className={clsx(
            'text-[0.72rem] uppercase tracking-[0.32em]',
            themeMode === 'dark' ? 'text-white/60' : 'text-slate-600/80',
          )}
        >
          {label}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={friendlyMessage}
            className={clsx(
              'text-[1.55rem] font-semibold leading-snug',
              themeMode === 'dark'
                ? 'text-white drop-shadow-[0_20px_55px_rgba(34,50,120,0.55)]'
                : 'text-slate-900',
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {friendlyMessage}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full space-y-4 text-sm">
        <div
          className={clsx(
            'h-1.5 overflow-hidden rounded-full',
            themeMode === 'dark' ? 'bg-white/15' : 'bg-slate-200',
          )}
        >
          <motion.div
            key={`ai-coach-progress-${statusIndex}`}
            className={clsx(
              'h-full w-full origin-left rounded-full',
              themeMode === 'dark'
                ? 'bg-gradient-to-r from-[#4cc9f0] via-[#4361ee] to-[#f72585]'
                : 'bg-gradient-to-r from-[#0ea5e9] via-[#2563eb] to-[#9333ea]',
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: stepDuration / 1000, ease: 'easeInOut' }}
            aria-hidden
          />
        </div>

        <div className="relative h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStatus}
              className={clsx(
                'absolute inset-0 flex items-center justify-center text-center',
                themeMode === 'dark' ? 'text-white/80' : 'text-slate-700',
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {currentStatus}
            </motion.span>
          </AnimatePresence>
        </div>

        <p
          className={clsx(
            'text-xs font-semibold uppercase tracking-[0.3em]',
            themeMode === 'dark' ? 'text-white/60' : 'text-slate-600/80',
          )}
        >
          Module {statusIndex + 1} of {statusMessages.length}
        </p>
      </div>
    </motion.div>
  );
};

const renderOwl = ({
  friendlyMessage,
  statusMessages,
  currentStatus,
  statusIndex,
  label,
  themeMode,
  shouldReduceMotion,
  stepDuration,
}: VariantRendererProps) => {
  const cardClassName = clsx(
    'pointer-events-auto relative isolate flex w-[min(31rem,94vw)] flex-col items-center gap-7 overflow-hidden rounded-[2.75rem] border px-10 py-12 text-center shadow-[0_40px_130px_rgba(26,16,62,0.55)] backdrop-blur-[20px]',
    themeMode === 'dark'
      ? 'border-amber-200/15 bg-gradient-to-br from-[#0b1120]/94 via-[#111827]/90 to-[#1f2937]/92 text-amber-100'
      : 'border-amber-500/25 bg-gradient-to-br from-[#fef9e7]/95 via-[#f5f3ff]/90 to-[#ede9fe]/92 text-slate-900',
  );

  return (
    <motion.div
      className={cardClassName}
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <motion.span
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(244,208,63,0.18),transparent_65%)]"
        animate={
          shouldReduceMotion
            ? { opacity: 0.4 }
            : { opacity: [0.25, 0.7, 0.25], scale: [1, 1.06, 1] }
        }
        transition={{ duration: 3.4, ease: 'easeInOut', repeat: shouldReduceMotion ? 0 : Infinity }}
        aria-hidden
      />

      <OwlHero themeMode={themeMode} shouldReduceMotion={shouldReduceMotion} />

      <div className="space-y-3">
        <p
          className={clsx(
            'text-[0.72rem] uppercase tracking-[0.32em]',
            themeMode === 'dark' ? 'text-amber-200/70' : 'text-amber-600/70',
          )}
        >
          {label}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={friendlyMessage}
            className={clsx(
              'text-[1.55rem] font-semibold leading-snug',
              themeMode === 'dark'
                ? 'text-amber-50 drop-shadow-[0_24px_60px_rgba(240,185,80,0.55)]'
                : 'text-slate-900',
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {friendlyMessage}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full space-y-4 text-sm">
        <div
          className={clsx(
            'h-1.5 overflow-hidden rounded-full',
            themeMode === 'dark' ? 'bg-white/15' : 'bg-amber-100/80',
          )}
        >
          <motion.div
            key={`owl-progress-${statusIndex}`}
            className={clsx(
              'h-full w-full origin-left rounded-full',
              themeMode === 'dark'
                ? 'bg-gradient-to-r from-[#facc15] via-[#f59e0b] to-[#f97316]'
                : 'bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: stepDuration / 1000, ease: 'easeInOut' }}
            aria-hidden
          />
        </div>

        <div className="relative h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStatus}
              className={clsx(
                'absolute inset-0 flex items-center justify-center text-center',
                themeMode === 'dark' ? 'text-amber-100/90' : 'text-slate-700',
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {currentStatus}
            </motion.span>
          </AnimatePresence>
        </div>

        <p
          className={clsx(
            'text-xs font-semibold uppercase tracking-[0.32em]',
            themeMode === 'dark' ? 'text-amber-200/60' : 'text-amber-500/70',
          )}
        >
          Sequence {statusIndex + 1} of {statusMessages.length}
        </p>
      </div>
    </motion.div>
  );
};

const VARIANTS: Record<VariantId, VariantDefinition> = {
  studyBuddy: {
    id: 'studyBuddy',
    label: 'Study Buddy Mode',
    friendlyMessages: STUDY_BUDDY_MESSAGES,
    statusMessages: STUDY_BUDDY_STATUSES,
    stepDuration: 1900,
    overlayBackground: {
      light: 'bg-gradient-to-br from-[#eef2ff]/90 via-[#ede9fe]/85 to-[#dbeafe]/88 text-slate-900',
      dark: 'bg-gradient-to-br from-[#0b0a1f]/90 via-[#1c1740]/85 to-[#1f1b4d]/88 text-white',
    },
    render: renderStudyBuddy,
  },
  aiCoach: {
    id: 'aiCoach',
    label: 'AI Coach Launch',
    friendlyMessages: AI_COACH_MESSAGES,
    statusMessages: AI_COACH_STATUSES,
    stepDuration: 1800,
    overlayBackground: {
      light: 'bg-gradient-to-br from-white/92 via-[#e0f2fe]/85 to-[#eef2ff]/88 text-slate-900',
      dark: 'bg-gradient-to-br from-[#050816]/92 via-[#0b1027]/88 to-[#111c33]/90 text-white',
    },
    render: renderAiCoach,
  },
  owl: {
    id: 'owl',
    label: 'Owl Premium Suite',
    friendlyMessages: OWL_MESSAGES,
    statusMessages: OWL_STATUSES,
    stepDuration: 2100,
    overlayBackground: {
      light: 'bg-gradient-to-br from-[#fef9e7]/92 via-[#faf5ff]/86 to-[#f1f5f9]/90 text-slate-900',
      dark: 'bg-gradient-to-br from-[#05040d]/92 via-[#0b0f1d]/88 to-[#111827]/90 text-white',
    },
    render: renderOwl,
  },
};

function resolveVariant(tier?: SubscriptionTier | null): VariantDefinition {
  if (!tier) return VARIANTS.studyBuddy;
  const key = TIER_TO_VARIANT[tier];
  return key ? VARIANTS[key] : VARIANTS.studyBuddy;
}

export function RouteLoadingOverlay({ active, tier }: RouteLoadingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const themeMode: ThemeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  const variant = resolveVariant(tier);

  const friendlyMessage = useFriendlyMessage(variant.friendlyMessages, active, variant.id);
  const { currentStatus, statusIndex } = useProgressCycle(
    variant.statusMessages,
    active,
    variant.stepDuration,
    variant.id,
  );

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className={clsx(
            'pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center px-6 py-10 sm:px-8',
            'transition-opacity',
            variant.overlayBackground[themeMode],
            'backdrop-blur-2xl',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {variant.render({
            friendlyMessage,
            statusMessages: variant.statusMessages,
            currentStatus,
            statusIndex,
            label: variant.label,
            themeMode,
            shouldReduceMotion,
            stepDuration: variant.stepDuration,
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default RouteLoadingOverlay;
