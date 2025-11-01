'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from 'next-themes';

import type { SubscriptionTier } from '@/lib/navigation/types';
import { Button } from '@/components/design-system/Button';

type ThemeMode = 'light' | 'dark';
type VariantId = 'studyBuddy' | 'aiCoach' | 'owl';

interface RouteLoadingOverlayProps {
  active: boolean;
  tier?: SubscriptionTier | null;
}

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

// ----- Mapping tiers to variants -----
const TIER_TO_VARIANT: Record<SubscriptionTier, VariantId> = {
  free: 'studyBuddy',
  seedling: 'studyBuddy',
  rocket: 'aiCoach',
  owl: 'owl',
};

// ----- Messages -----
const STUDY_BUDDY_MESSAGES = Object.freeze([
  'Warming up your study plan…',
  'Loading your daily challenge…',
  'Hang tight — almost there 🚀',
]);
const STUDY_BUDDY_STATUSES = Object.freeze([
  'Authenticating your buddy…',
  'Preparing your workspace…',
  'Loading play modules…',
]);

const AI_COACH_MESSAGES = Object.freeze([
  'Setting up your IELTS dashboard…',
  'Analysing your study DNA…',
  'Calibrating your AI coach…',
]);
const AI_COACH_STATUSES = Object.freeze([
  'Authenticating your profile…',
  'Preparing your workspace…',
  'Loading AI modules…',
]);

const OWL_MESSAGES = Object.freeze([
  'Refining your IELTS mastery…',
  'Polishing elite insight decks…',
  'Your Owl mentor is almost ready…',
]);
const OWL_STATUSES = Object.freeze([
  'Authenticating Owl tier…',
  'Preparing your workspace…',
  'Loading premium modules…',
]);

// ----- Helpers -----
function pickMessage(messages: readonly string[], previous?: string) {
  if (!messages.length) return '';
  if (messages.length === 1) return messages[0];
  const pool = previous ? messages.filter((m) => m !== previous) : [...messages];
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
    setMessage((prev) => pickMessage(messages, prev));
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
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, stepDuration);
    return () => window.clearInterval(id);
  }, [active, messages, stepDuration, variantId]);
  const currentStatus = messages[index] ?? messages[0] ?? '';
  return { currentStatus, statusIndex: index } as const;
}

// ----- Minimal, token-only renders (no hex colors, all DS-friendly) -----
const Card = ({
  children,
  themeMode,
}: {
  children: React.ReactNode;
  themeMode: ThemeMode;
}) => (
  <motion.div
    className={clsx(
      'relative w-full max-w-sm sm:max-w-md isolate rounded-3xl border bg-card/80 text-card-foreground shadow-xl backdrop-blur-xl px-6 py-8 sm:px-8 sm:py-10',
      themeMode === 'dark' ? 'border-white/10' : 'border-foreground/10'
    )}
    initial={{ opacity: 0, scale: 0.96, y: 16 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96, y: 16 }}
    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    role="status"
    aria-live="polite"
  >
    {children}
  </motion.div>
);

function Header({
  label,
  friendlyMessage,
  themeMode,
}: {
  label: string;
  friendlyMessage: string;
  themeMode: ThemeMode;
}) {
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <p
        className={clsx(
          'text-[0.65rem] uppercase tracking-[0.28em] sm:text-xs',
          themeMode === 'dark' ? 'text-foreground/70' : 'text-foreground/70'
        )}
      >
        {label}
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={friendlyMessage}
          className="text-lg sm:text-xl font-semibold leading-tight"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {friendlyMessage}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function Progress({
  statusMessages,
  currentStatus,
  statusIndex,
  stepDuration,
  themeMode,
}: {
  statusMessages: readonly string[];
  currentStatus: string;
  statusIndex: number;
  stepDuration: number;
  themeMode: ThemeMode;
}) {
  return (
    <div className="w-full space-y-3 text-sm">
      <div
        className={clsx(
          'relative h-1.5 overflow-hidden rounded-full',
          themeMode === 'dark' ? 'bg-foreground/10' : 'bg-foreground/10'
        )}
        aria-hidden
      >
        <motion.span
          className="absolute inset-y-0 rounded-full bg-foreground/40"
          key={`progress-${statusIndex}`}
          initial={{ width: '10%' }}
          animate={{ width: `${Math.min(100, ((statusIndex + 1) / statusMessages.length) * 100)}%` }}
          transition={{ duration: Math.min(0.6, stepDuration / 1000), ease: 'easeInOut' }}
        />
      </div>
      <div className="relative h-7 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentStatus}
            className="absolute inset-0 flex items-center justify-center text-center text-xs sm:text-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentStatus}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.28em] text-foreground/60">
        Step {statusIndex + 1} of {statusMessages.length}
      </p>
    </div>
  );
}

// Simple variant renderers (brand-safe, token-only)
const renderStudyBuddy = (p: VariantRendererProps) => (
  <Card themeMode={p.themeMode}>
    <div className="space-y-6">
      <Header label={p.label} friendlyMessage={p.friendlyMessage} themeMode={p.themeMode} />
      <div className="flex flex-col items-center gap-5">
        <motion.span
          className="relative inline-flex h-12 w-12 items-center justify-center"
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: p.shouldReduceMotion ? 0 : 2.8, repeat: Infinity, ease: 'linear' }}
        >
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-foreground/80" />
        </motion.span>
        <Progress
          statusMessages={p.statusMessages}
          currentStatus={p.currentStatus}
          statusIndex={p.statusIndex}
          stepDuration={p.stepDuration}
          themeMode={p.themeMode}
        />
      </div>
    </div>
  </Card>
);
const renderAiCoach = renderStudyBuddy;
const renderOwl = renderStudyBuddy;

// ----- Variant Registry (overlay uses semantic tokens only) -----
const VARIANTS: Record<VariantId, VariantDefinition> = {
  studyBuddy: {
    id: 'studyBuddy',
    label: 'Study Buddy',
    friendlyMessages: STUDY_BUDDY_MESSAGES,
    statusMessages: STUDY_BUDDY_STATUSES,
    stepDuration: 1900,
    overlayBackground: {
      light: 'bg-background/90 text-foreground',
      dark: 'bg-background/90 text-foreground',
    },
    render: renderStudyBuddy,
  },
  aiCoach: {
    id: 'aiCoach',
    label: 'AI Coach',
    friendlyMessages: AI_COACH_MESSAGES,
    statusMessages: AI_COACH_STATUSES,
    stepDuration: 1800,
    overlayBackground: {
      light: 'bg-background/90 text-foreground',
      dark: 'bg-background/90 text-foreground',
    },
    render: renderAiCoach,
  },
  owl: {
    id: 'owl',
    label: 'Owl Premium',
    friendlyMessages: OWL_MESSAGES,
    statusMessages: OWL_STATUSES,
    stepDuration: 2100,
    overlayBackground: {
      light: 'bg-background/90 text-foreground',
      dark: 'bg-background/90 text-foreground',
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
    variant.id
  );

  const [render, setRender] = useState(active);
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [showRecoveryAction, setShowRecoveryAction] = useState(false);
  useEffect(() => {
    if (active) {
      setRender(true);
      setShowSlowNotice(false);
      setShowRecoveryAction(false);
      return;
    }
    const t = window.setTimeout(() => setRender(false), shouldReduceMotion ? 0 : 180);
    return () => window.clearTimeout(t);
  }, [active, shouldReduceMotion]);

  useEffect(() => {
    if (!active) return;
    const slowTimer = window.setTimeout(() => setShowSlowNotice(true), 2600);
    const recoveryTimer = window.setTimeout(() => setShowRecoveryAction(true), 7000);
    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(recoveryTimer);
    };
  }, [active, variant.id]);

  const handleRecovery = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.location.reload();
  }, []);

  return (
    <AnimatePresence>
      {render ? (
        <motion.div
          className={clsx(
            'fixed inset-0 z-[1000] flex items-center justify-center px-6 py-10 sm:px-10',
            'backdrop-blur-2xl transition-opacity before:absolute before:inset-0 before:-z-[1] before:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]',
            variant.overlayBackground[themeMode]
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="flex w-full max-w-2xl flex-col items-center gap-6">
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

            <AnimatePresence>
              {showSlowNotice ? (
                <motion.div
                  key="slow-notice"
                  className="text-center text-xs text-foreground/70 sm:text-sm"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  Taking a little longer than usual. Sit tight — your dashboard is still loading.
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showRecoveryAction ? (
                <motion.div
                  key="recovery"
                  className="flex items-center justify-center"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <Button variant="outline" size="sm" onClick={handleRecovery}>
                    Refresh page
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default RouteLoadingOverlay;
