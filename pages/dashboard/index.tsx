import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon, { type IconName } from '@/components/design-system/Icon';
import { Alert } from '@/components/design-system/Alert';
import { StreakIndicator } from '@/components/design-system/StreakIndicator';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useStreak } from '@/hooks/useStreak';
import { getDayKeyInTZ } from '@/lib/streak';
import { useSignedAvatar } from '@/hooks/useSignedAvatar';
import { useChallengeEnrollments } from '@/hooks/useChallengeEnrollments';
import { useNextTask } from '@/hooks/useNextTask';

import { badges } from '@/data/badges';
import { ReadingStatsCard } from '@/components/reading/ReadingStatsCard';
import QuickDrillButton from '@/components/quick/QuickDrillButton';
import { VocabularySpotlightFeature } from '@/components/feature/VocabularySpotlight';
import { StreakCounter } from '@/components/streak/StreakCounter';
import { NextTaskCard } from '@/components/reco/NextTaskCard';

import SavedItems from '@/components/dashboard/SavedItems';
import ShareLinkCard from '@/components/dashboard/ShareLinkCard';
import WhatsAppOptIn from '@/components/dashboard/WhatsAppOptIn';
import JoinWeeklyChallengeCard from '@/components/dashboard/JoinWeeklyChallengeCard';
import ChallengeSpotlightCard from '@/components/dashboard/ChallengeSpotlightCard';
import DailyWeeklyChallenges from '@/components/dashboard/DailyWeeklyChallenges';
import GapToGoal from '@/components/visa/GapToGoal';
import GoalRoadmap from '@/components/feature/GoalRoadmap';

import type { Profile, AIPlan } from '@/types/profile';
import type { SubscriptionTier } from '@/lib/navigation/types';

const StudyCalendar = dynamic(() => import('@/components/feature/StudyCalendar'), {
  ssr: false,
});

// Innovation panels (lazy)
const AICoachPanel = dynamic(() => import('@/components/innovation/AICoachPanel'), {
  ssr: false,
});
const StudyBuddyPanel = dynamic(() => import('@/components/innovation/StudyBuddyPanel'), {
  ssr: false,
});
const MistakesBookPanel = dynamic(() => import('@/components/innovation/MistakesBookPanel'), {
  ssr: false,
});
const WhatsAppTasksPanel = dynamic(() => import('@/components/innovation/WhatsAppTasksPanel'), {
  ssr: false,
});

const loadingSkeleton = (
  <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
    <Container>
      <div className="grid gap-6 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="rounded-ds-2xl p-6">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="mt-4 h-24 animate-pulse rounded bg-muted dark:bg-white/10" />
          </Card>
        ))}
      </div>
    </Container>
  </section>
);

type TileAction =
  | { label: string; href: string; action?: never }
  | { label: string; action: () => void; href?: never };

type InnovationTile = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent?: 'primary' | 'secondary' | 'success' | 'info';
  badge?: string;
  meta?: string;
  primary: TileAction;
  secondary?: TileAction;
};

type ActionItem = {
  id: string;
  title: string;
  caption: string;
  icon: IconName;
  accent: NonNullable<InnovationTile['accent']>;
  primary: TileAction;
  secondary?: TileAction;
  chip?: string | null;
  done?: boolean;
};

const Dashboard: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const {
    current: streak,
    longest,
    lastDayKey,
    loading: streakLoading,
    completeToday,
    nextRestart,
    shields,
    claimShield,
    useShield,
  } = useStreak();

  const { latestEnrollment: challengeEnrollment, loading: challengeLoading } =
    useChallengeEnrollments(sessionUserId);

  const {
    recommendationId: nextRecommendationId,
    task: nextTask,
    reason: nextTaskReason,
    evidence: nextTaskEvidence,
    score: nextTaskScore,
    loading: nextTaskLoading,
    error: nextTaskError,
    refresh: refreshNextTask,
  } = useNextTask();

  // Innovation UI toggles
  const [showAICoach, setShowAICoach] = useState(false);
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [showMistakesBook, setShowMistakesBook] = useState(false);
  const [showWhatsAppTasks, setShowWhatsAppTasks] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Handle OAuth callback (if any)
        if (typeof window !== 'undefined') {
          const url = window.location.href;
          if (url.includes('code=') || url.includes('access_token=')) {
            const { error } = await supabaseBrowser.auth.exchangeCodeForSession(url);
            if (!error) {
              await window.history.replaceState({}, '', '/dashboard');
            }
          }
        }

        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        const authUser = session?.user ?? null;
        setSessionUserId(authUser?.id ?? null);

        if (!authUser) {
          // redirect to login preserving next
          window.location.href = `/login?next=/dashboard`;
          return;
        }

        // Load or create minimal profile
        const { data, error } = await supabaseBrowser
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // eslint-disable-next-line no-console
          console.error('[dashboard] profile load error:', error);
          setLoading(false);
          return;
        }

        let p = data as Profile | null;

        if (!p) {
          const minimal: Partial<Profile> = {
            user_id: authUser.id,
            email: authUser.email ?? undefined,
            preferred_language: 'en',
            onboarding_complete: false,
          };

          const { data: created, error: insertErr } = await supabaseBrowser
            .from('profiles')
            .insert(minimal)
            .select('*')
            .single();

          if (insertErr) {
            // eslint-disable-next-line no-console
            console.error('[dashboard] profile insert error:', insertErr);
          } else {
            p = created as Profile;
          }
        }

        const draftFlag = (p as any)?.draft === true;
        const explicitIncomplete = (p as any)?.onboarding_complete === false;
        const heuristicIncomplete =
          (p as any)?.onboarding_complete == null &&
          (!p?.full_name || !p?.preferred_language);

        setNeedsSetup(!!(draftFlag || explicitIncomplete || heuristicIncomplete));
        setProfile(p ?? null);
        setLoading(false);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[dashboard] fatal load error', e);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('dashboardTipsDismissed');
      if (!dismissed) setShowTips(true);
    }
  }, []);

  const dismissTips = () => {
    setShowTips(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardTipsDismissed', '1');
    }
  };

  useEffect(() => {
    if (streakLoading) return;
    const today = getDayKeyInTZ();
    if (lastDayKey !== today) {
      void completeToday().catch(() => {});
    }
  }, [streakLoading, lastDayKey, completeToday]);

  const { signedUrl: profileAvatarUrl } = useSignedAvatar(profile?.avatar_url ?? null);

  // AI plan & view-model
  const ai: AIPlan = (profile?.ai_recommendation ?? {}) as AIPlan;
  const subscriptionTier: SubscriptionTier =
    (profile?.tier as SubscriptionTier | undefined) ?? 'free';
  const earnedBadges = [...badges.streaks, ...badges.milestones, ...badges.community];
  const topBadges = earnedBadges.slice(0, 3);

  const goalBand =
    typeof profile?.goal_band === 'number' ? profile.goal_band : ai.suggestedGoal ?? null;
  const targetStudyTime = profile?.time_commitment || '1–2h/day';

  const examDate = useMemo(() => {
    if (!profile?.exam_date) return null;
    const parsed = new Date(profile.exam_date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [profile?.exam_date]);

  const daysUntilExam = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const diffMs = examDate.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }, [examDate]);

  // 🔹 Speaking vocab topic + slug for today
  const speakingVocabTopic = useMemo(() => {
    const aiAny = ai as any;

    const fromAI =
      aiAny?.speakingFocusTopic ||
      (ai.sessionMix ?? []).find(
        (entry: any) => entry?.skill?.toLowerCase() === 'speaking',
      )?.topic;

    if (typeof fromAI === 'string' && fromAI.trim().length > 0) {
      return fromAI;
    }

    // Fallback if no AI signal yet
    return 'Family & relationships';
  }, [ai]);

  const speakingVocabSlug = useMemo(() => {
    const label = speakingVocabTopic.toLowerCase();

    if (label.includes('family')) return 'family';
    if (label.includes('hometown') || label.includes('city') || label.includes('place'))
      return 'hometown';
    if (label.includes('work') || label.includes('job') || label.includes('study'))
      return 'work';
    if (label.includes('free time') || label.includes('hobby') || label.includes('leisure'))
      return 'free-time';
    if (label.includes('travel') || label.includes('holiday')) return 'travel';
    if (label.includes('technology') || label.includes('tech')) return 'technology';
    if (label.includes('health')) return 'health';
    if (label.includes('environment')) return 'environment';

    // Safe default
    return 'family';
  }, [speakingVocabTopic]);

  const todayKey = useMemo(() => getDayKeyInTZ(), []);
  const streakProtected = lastDayKey === todayKey;

  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        id: 'streak',
        title: streakProtected ? 'Streak protected' : 'Protect your streak today',
        caption: streakProtected
          ? `You’ve locked in your ${streak} day streak. Keep the rhythm going tomorrow.`
          : `Log a focused session to keep your ${streak} day streak alive.`,
        icon: 'Flame',
        accent: 'primary',
        primary: {
          label: streakProtected ? 'View streak history' : 'Log a session',
          href: '#streak-panel',
        },
        secondary: streakProtected
          ? { label: 'Plan tomorrow', href: '#study-calendar' }
          : undefined,
        done: streakProtected,
      },
      {
        id: 'weekly-plan',
        title: 'Shape this week’s plan',
        caption:
          'Drop study blocks into your calendar so AI drills land where you can complete them.',
        icon: 'CalendarCheck',
        accent: 'secondary',
        primary: { label: 'Open calendar', href: '#study-calendar' },
        secondary: { label: 'Adjust availability', href: '/study-plan' },
      },
    ];

    if (examDate) {
      const readableExamDate = examDate.toLocaleDateString();
      const caption =
        daysUntilExam !== null && daysUntilExam > 0
          ? `Lock in mocks and speaking practice so the next ${daysUntilExam} day${
              daysUntilExam === 1 ? '' : 's'
            } ladder up to exam day.`
          : 'Exam day is here. Complete a confidence run-through and review your checklist.';

      items.push({
        id: 'exam-timeline',
        title: 'Exam timeline',
        caption,
        icon: 'CalendarClock',
        accent: 'info',
        primary: { label: 'View checklist', href: '/mock' },
        secondary: { label: 'Manage calendar', href: '#study-calendar' },
        chip: `Exam: ${readableExamDate}`,
      });
    }

    // 🔹 Speaking vocab tile
    items.push({
      id: 'speaking-vocab',
      title: 'Speaking vocab for today',
      caption: `Warm up with phrases for ${speakingVocabTopic} before you practise or record.`,
      icon: 'Mic',
      accent: 'secondary',
      primary: {
        label: 'Open speaking pack',
        href: `/vocabulary/speaking/${speakingVocabSlug}`,
      },
      secondary: {
        label: 'See all speaking packs',
        href: '/vocabulary/speaking',
      },
    });

    return items;
  }, [daysUntilExam, examDate, streak, streakProtected, speakingVocabTopic, speakingVocabSlug]);

  const trackFeatureOpen = useCallback((feature: string) => {
    // window.analytics?.track('feature_open', { feature, userId: sessionUserId });
    // eslint-disable-next-line no-console
    console.log('[feature] open', feature);
  }, []);

  const openAICoach = useCallback(() => {
    setShowAICoach(true);
    trackFeatureOpen('ai_coach');
  }, [trackFeatureOpen]);

  const openStudyBuddy = useCallback(() => {
    setShowStudyBuddy(true);
    trackFeatureOpen('study_buddy');
  }, [trackFeatureOpen]);

  const openMistakesBook = useCallback(() => {
    setShowMistakesBook(true);
    trackFeatureOpen('mistakes_book');
  }, [trackFeatureOpen]);

  const openWhatsAppTasks = useCallback(() => {
    setShowWhatsAppTasks(true);
    trackFeatureOpen('whatsapp_tasks');
  }, [trackFeatureOpen]);

  const shareDashboard = useCallback(() => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    if (typeof navigator !== 'undefined') {
      if ('share' in navigator) {
        void (navigator as any)
          .share({ title: 'Gramor_X Dashboard', url: shareUrl })
          .catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
    }
    trackFeatureOpen('share_dashboard');
  }, [trackFeatureOpen]);

  const innovationTiles = useMemo<InnovationTile[]>(() => {
    const isFreeTier = subscriptionTier === 'free';

    return [
      {
        id: 'ai-coach',
        title: 'AI Coach',
        description:
          'Personalised feedback, micro-actions, and next-step prompts tailored to your current goal band.',
        icon: 'Sparkles',
        accent: 'primary',
        badge: isFreeTier ? 'Rocket' : undefined,
        meta: isFreeTier
          ? 'Upgrade to Rocket for unlimited deep feedback.'
          : 'Included in your plan.',
        primary: { label: 'Open AI Coach', action: openAICoach },
        secondary: { label: 'Full workspace', href: '/ai/coach' },
      },
      {
        id: 'study-buddy',
        title: 'Study Buddy',
        description:
          'Build a perfect session with smart prompts, question sequencing, and instant drill generation.',
        icon: 'Users',
        accent: 'secondary',
        badge: 'Adaptive',
        meta: 'Draft a study plan in minutes and sync it with your calendar.',
        primary: { label: 'Launch Study Buddy', action: openStudyBuddy },
        secondary: { label: 'Explore workspace', href: '/ai/study-buddy' },
      },
      {
        id: 'mistakes-book',
        title: 'Mistakes Book',
        description:
          'Capture errors automatically, tag weak spots, and generate targeted remediation drills.',
        icon: 'NotebookPen',
        accent: 'success',
        badge: 'New',
        meta: 'Turn every mistake into a coached action item.',
        primary: { label: 'Review Mistakes', action: openMistakesBook },
        secondary: { label: 'See all notes', href: '/ai/mistakes-book' },
      },
      {
        id: 'whatsapp-tasks',
        title: 'WhatsApp Tasks',
        description:
          'Stay accountable with daily nudges, micro-tasks, and quick replies direct to your phone.',
        icon: 'MessageCircle',
        accent: 'info',
        meta: 'Customise reminders and track completions from one place.',
        primary: { label: 'Open tasks', action: openWhatsAppTasks },
        secondary: { label: 'Manage channel', href: '/whatsapp-tasks' },
      },
    ];
  }, [openAICoach, openMistakesBook, openStudyBuddy, openWhatsAppTasks, subscriptionTier]);

  if (loading) return loadingSkeleton;

  const accentClass: Record<NonNullable<InnovationTile['accent']>, string> = {
    primary: 'bg-primary/15 text-primary',
    secondary: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    info: 'bg-electricBlue/15 text-electricBlue',
  };

  const renderTileAction = (
    key: string,
    action: TileAction,
    variant: 'primary' | 'ghost',
  ) =>
    'href' in action ? (
      <Button key={key} size="sm" variant={variant} className="rounded-ds-xl" asChild>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    ) : (
      <Button
        key={key}
        size="sm"
        variant={variant}
        className="rounded-ds-xl"
        onClick={action.action}
      >
        {action.label}
      </Button>
    );

  return (
    <>
      <Head>
        <title>Dashboard — Gramor_X</title>
      </Head>

      <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="space-y-8">
            {needsSetup && (
              <Alert variant="warning" className="mb-2">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      Complete your profile to unlock a personalized plan.
                    </div>
                    <div className="text-small opacity-80">
                      It only takes a minute—target band, exam date and study prefs.
                    </div>
                  </div>
                  <Link href="/profile/setup" className="shrink-0">
                    <Button variant="secondary" className="rounded-ds-xl">
                      Continue setup
                    </Button>
                  </Link>
                </div>
              </Alert>
            )}

            {/* HERO */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                {profileAvatarUrl ? (
                  <Image
                    src={profileAvatarUrl}
                    alt={
                      profile?.full_name ? `${profile.full_name} avatar` : 'Profile avatar'
                    }
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-h3 font-semibold text-primary">
                    {(profile?.full_name || 'Learner')
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p.charAt(0).toUpperCase())
                      .join('') || 'L'}
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <h1 className="font-slab text-display text-gradient-primary">
                      Welcome back, {profile?.full_name || 'Learner'}
                    </h1>
                    <p className="text-grayish">
                      Every module below is wired into your IELTS goal—choose where to dive
                      in next.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
                    <span>
                      Preferred language: {(profile?.preferred_language ?? 'en').toUpperCase()}
                    </span>
                    {typeof goalBand === 'number' ? (
                      <span>• Target band {goalBand.toFixed(1)}</span>
                    ) : (
                      <span>• Set your goal to unlock tailored guidance</span>
                    )}
                    {targetStudyTime ? (
                      <span>• Study rhythm: {targetStudyTime}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="flex flex-wrap items-center gap-3">
                  <StreakIndicator value={streak} />
                  {streak >= 7 && (
                    <Badge variant="success" size="sm">
                      🔥 {streak}-day streak!
                    </Badge>
                  )}
                  <Badge size="sm">🛡 {shields}</Badge>
                  <Button
                    onClick={claimShield}
                    variant="secondary"
                    className="rounded-ds-xl"
                  >
                    Claim Shield
                  </Button>
                  {shields > 0 && (
                    <Button
                      onClick={useShield}
                      variant="secondary"
                      className="rounded-ds-xl"
                    >
                      Use Shield
                    </Button>
                  )}
                </div>

                {topBadges.length ? (
                  <div className="flex flex-wrap items-center gap-2 text-2xl">
                    {topBadges.map((meta) => (
                      <span key={meta.id} aria-label={meta.name} title={meta.name}>
                        {meta.icon}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={openAICoach}
                    variant="soft"
                    tone="primary"
                    size="sm"
                    className="rounded-ds-xl"
                    leadingIcon={
                      <Icon name="Sparkles" size={16} className="text-primary" />
                    }
                  >
                    AI Coach
                  </Button>
                  <Button
                    onClick={openStudyBuddy}
                    variant="soft"
                    tone="secondary"
                    size="sm"
                    className="rounded-ds-xl"
                    leadingIcon={<Icon name="Users" size={16} className="text-secondary" />}
                  >
                    Study Buddy
                  </Button>
                  <Button
                    onClick={openMistakesBook}
                    variant="soft"
                    tone="success"
                    size="sm"
                    className="rounded-ds-xl"
                    leadingIcon={
                      <Icon name="NotebookPen" size={16} className="text-success" />
                    }
                  >
                    Mistakes Book
                  </Button>
                  <Button
                    onClick={openWhatsAppTasks}
                    variant="soft"
                    tone="info"
                    size="sm"
                    className="rounded-ds-xl"
                    leadingIcon={
                      <Icon
                        name="MessageCircle"
                        size={16}
                        className="text-electricBlue"
                      />
                    }
                  >
                    WhatsApp Tasks
                  </Button>
                  <Button
                    onClick={shareDashboard}
                    variant="ghost"
                    size="sm"
                    className="rounded-ds-xl"
                    leadingIcon={<Icon name="Share2" size={16} />}
                  >
                    Share progress
                  </Button>
                </div>
              </div>
            </div>

            {/* NEXT TASK */}
            <NextTaskCard
              loading={nextTaskLoading}
              task={nextTask}
              reason={nextTaskReason}
              evidence={nextTaskEvidence}
              recommendationId={nextRecommendationId}
              score={nextTaskScore}
              error={nextTaskError}
              onRefresh={() => refreshNextTask()}
            />

            {/* AI WORKSPACE */}
            <section className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-slab text-h2">AI workspace</h2>
                  <p className="text-grayish">
                    Keep your adaptive tools in one consistent hub—jump in wherever you
                    need support.
                  </p>
                </div>
                <Badge variant="neutral" size="sm">
                  Always improving
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {innovationTiles.map((tile) => {
                  const iconBg = tile.accent
                    ? accentClass[tile.accent]
                    : accentClass.primary;
                  const badgeVariant: 'accent' | 'success' | 'neutral' =
                    tile.badge === 'Rocket'
                      ? 'accent'
                      : tile.badge === 'New'
                      ? 'success'
                      : 'neutral';

                  return (
                    <Card
                      key={tile.id}
                      className="group flex h-full flex-col justify-between gap-6 rounded-ds-2xl border border-border/60 bg-card/60 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                          >
                            <Icon name={tile.icon} size={20} />
                          </span>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg text-foreground">
                                {tile.title}
                              </h3>
                              {tile.badge ? (
                                <Badge variant={badgeVariant} size="xs">
                                  {tile.badge}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {tile.description}
                            </p>
                          </div>
                        </div>
                        {tile.meta ? (
                          <p className="text-xs text-muted-foreground">{tile.meta}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {renderTileAction(`${tile.id}-primary`, tile.primary, 'primary')}
                        {tile.secondary
                          ? renderTileAction(`${tile.id}-secondary`, tile.secondary, 'ghost')
                          : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* STREAK PANEL */}
            <div id="streak-panel">
              <StreakCounter
                current={streak}
                longest={longest}
                loading={streakLoading}
                shields={shields}
              />
              {nextRestart && (
                <Alert variant="info" className="mt-4">
                  Streak will restart on {nextRestart}.
                </Alert>
              )}
            </div>

            {showTips && (
              <Alert variant="info" className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <span>Explore practice modules and track your progress from here.</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={dismissTips}
                    className="rounded-ds-xl"
                  >
                    Got it
                  </Button>
                </div>
              </Alert>
            )}

            {/* VOCABULARY */}
            <div className="mt-10 space-y-4" id="vocabulary-spotlight">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-slab text-h2">Vocabulary of the day</h2>
                  <p className="text-grayish">
                    Boost your lexical score with today’s curated pick and quick quiz.
                  </p>
                </div>
                <Link href="/vocabulary" className="shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-ds-xl">
                    Open vocabulary lab
                  </Button>
                </Link>
              </div>
              <VocabularySpotlightFeature />
            </div>

            {/* WEEKLY CHALLENGE */}
            <div className="mt-10" id="weekly-challenge">
              {challengeLoading ? (
                <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-6">
                  <div className="h-6 w-40 animate-pulse rounded bg-border" />
                  <div className="mt-4 h-24 w-full animate-pulse rounded bg-border" />
                </Card>
              ) : challengeEnrollment ? (
                <ChallengeSpotlightCard
                  cohortId={challengeEnrollment.cohort}
                  progress={challengeEnrollment.progress ?? null}
                />
              ) : (
                <JoinWeeklyChallengeCard />
              )}
            </div>

            <div className="mt-6">
              <DailyWeeklyChallenges />
            </div>

            {/* TODAY’S PRIORITIES */}
            <section className="mt-10 space-y-4" id="goal-summary">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-slab text-h2">Today’s priorities</h2>
                  <p className="text-grayish">
                    Move the needle with the highest leverage actions first.
                  </p>
                </div>
                <Badge variant="neutral" size="sm">
                  Action-first view
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {actionItems.map((item) => (
                  <Card
                    key={item.id}
                    className="flex h-full flex-col justify-between gap-5 rounded-ds-2xl border border-border/60 bg-card/60 p-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accentClass[item.accent]}`}
                        >
                          <Icon name={item.icon} size={20} />
                        </span>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-lg text-foreground">
                              {item.title}
                            </h3>
                            {item.done ? (
                              <Badge variant="success" size="xs">
                                Done
                              </Badge>
                            ) : null}
                            {item.chip ? (
                              <Badge variant="neutral" size="xs">
                                {item.chip}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.caption}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {renderTileAction(
                        `${item.id}-primary`,
                        item.primary,
                        'primary',
                      )}
                      {item.secondary
                        ? renderTileAction(
                            `${item.id}-secondary`,
                            item.secondary,
                            'ghost',
                          )
                        : null}
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* NEXT LESSONS */}
            {((ai.sessionMix ?? ai.sequence) ?? []).length > 0 && (
              <div className="mt-10" id="next-sessions">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Next lessons</h2>
                    <p className="text-small text-grayish">
                      Work through these in order to stay aligned with your goal.
                    </p>
                  </div>
                  <Link
                    href="#goal-summary"
                    className="text-small font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Revisit your plan
                  </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {(ai.sessionMix && ai.sessionMix.length
                    ? ai.sessionMix
                    : (ai.sequence ?? []).map((skill) => ({ skill, topic: '' })))
                    .slice(0, 3)
                    .map((entry, index) => {
                      const hrefSkill = entry.skill.toLowerCase();
                      const title = entry.topic
                        ? `${entry.skill}: ${entry.topic}`
                        : entry.skill;
                      return (
                        <Card
                          key={`${entry.skill}-${entry.topic || index}`}
                          className="flex flex-col rounded-ds-2xl p-6"
                        >
                          <h3 className="mb-2 font-slab text-h3 capitalize">{title}</h3>
                          <div className="mt-auto">
                            <Link
                              href={`/learning/skills/${hrefSkill}`}
                              className="inline-block w-full"
                            >
                              <Button variant="primary" className="w-full rounded-ds-xl">
                                Start
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}

            {/* VISA TARGET */}
            <div className="mt-10 space-y-4" id="visa-target">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-slab text-h2">Visa & admissions target</h2>
                  <p className="text-grayish">Track how close you are to the band requirement.</p>
                </div>
                <Link href="/visa" className="shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-ds-xl">
                    Update target
                  </Button>
                </Link>
              </div>
              <GapToGoal />
            </div>

            {/* STUDY CALENDAR */}
            <div className="mt-10 space-y-4" id="study-calendar">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-slab text-h2">Weekly momentum</h2>
                  <p className="text-grayish">
                    Protect your streak by finishing the scheduled sessions.
                  </p>
                </div>
                <Link href="/study-plan" className="shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-ds-xl">
                    Adjust schedule
                  </Button>
                </Link>
              </div>
              <StudyCalendar />
            </div>

            {/* ROADMAP */}
            <div className="mt-10">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-slab text-h2">Roadmap to exam day</h2>
                  <p className="text-grayish">
                    See which stage you are in and what to do next.
                  </p>
                </div>
                <Link href="/exam-day" className="shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-ds-xl">
                    Plan exam day
                  </Button>
                </Link>
              </div>
              <GoalRoadmap examDate={profile?.exam_date ?? null} />
            </div>

            {/* QUICK ACTIONS + READING */}
            <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_.9fr]">
              <Card className="rounded-ds-2xl p-6">
                <h2 className="font-slab text-h2">Quick actions</h2>
                <p className="mt-1 text-grayish">Jump back in with one click.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <QuickDrillButton />
                  <Link href="/learning">
                    <Button variant="primary" className="rounded-ds-xl">
                      Start today’s lesson
                    </Button>
                  </Link>
                  <Link href="/mock">
                    <Button variant="secondary" className="rounded-ds-xl">
                      Take a mock test
                    </Button>
                  </Link>
                  <Link href="/writing">
                    <Button variant="accent" className="rounded-ds-xl">
                      Practice writing
                    </Button>
                  </Link>
                  <Link href="/reading">
                    <Button variant="secondary" className="rounded-ds-xl">
                      Practice reading
                    </Button>
                  </Link>
                  {/* 🔹 Speaking vocab quick access */}
                  <Link href={`/vocabulary/speaking/${speakingVocabSlug}`}>
                    <Button variant="secondary" className="rounded-ds-xl">
                      Speaking vocab today
                    </Button>
                  </Link>
                  <Link href="/progress">
                    <Button variant="ghost" className="rounded-ds-xl">
                      Review progress report
                    </Button>
                  </Link>
                  <Link href="#visa-target">
                    <Button variant="ghost" className="rounded-ds-xl">
                      Check visa target
                    </Button>
                  </Link>
                  <Button
                    onClick={shareDashboard}
                    variant="secondary"
                    className="rounded-ds-xl"
                  >
                    Share progress
                  </Button>
                </div>
              </Card>

              <ReadingStatsCard />
            </div>

            {/* SAVED / WHATSAPP / SHARE */}
            <div className="mt-10 grid gap-6 md:grid-cols-2" id="saved-items">
              <Card className="rounded-ds-2xl p-6 space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Saved for later</h2>
                    <p className="text-grayish">Jump back to lessons and drills you flagged.</p>
                  </div>
                  <Link href="/saved" className="shrink-0">
                    <Button variant="ghost" size="sm" className="rounded-ds-xl">
                      Manage saved items
                    </Button>
                  </Link>
                </div>
                <SavedItems />
              </Card>

              <div className="space-y-4">
                <ShareLinkCard />
                <Card className="flex flex-col gap-4 rounded-ds-2xl border border-border/60 bg-card/60 p-5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                      <Icon name="MessageCircle" size={18} />
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground">WhatsApp Tasks</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive daily micro-tasks and reminders via WhatsApp.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Also available in the AI workspace section above.
                      </p>
                    </div>
                  </div>
                  <WhatsAppOptIn />
                </Card>
              </div>
            </div>

            {/* UPGRADE & COACH NOTES */}
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <Card className="rounded-ds-2xl p-6">
                <h3 className="mb-2 font-slab text-h3">Upgrade to Rocket 🚀</h3>
                <p className="text-body opacity-90">
                  Unlock AI deep feedback, speaking evaluator, and full analytics.
                </p>
                <div className="mt-4">
                  <Link href="/pricing">
                    <Button variant="primary" className="rounded-ds-xl">
                      See Plans
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="rounded-ds-2xl p-6">
                <h3 className="font-slab text-h3">Coach Notes</h3>
                {Array.isArray(ai?.notes) && ai.notes.length ? (
                  <ul className="mt-3 list-disc pl-6 text-body">
                    {ai.notes.map((n: string, i: number) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : (
                  <Alert variant="info" className="mt-3">
                    Add more details in <b>Profile</b> to refine your AI plan.
                  </Alert>
                )}
                <div className="mt-4">
                  <Link href="/profile/setup">
                    <Button variant="secondary" className="rounded-ds-xl">
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Innovation modals */}
      {showAICoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAICoach(false)}
          />
          <div className="relative w-full max-w-4xl rounded-ds-2xl p-6">
            <AICoachPanel
              onClose={() => setShowAICoach(false)}
              profile={
                profile
                  ? { user_id: profile.user_id, full_name: profile.full_name }
                  : null
              }
              onOpenStudyBuddy={() => {
                setShowAICoach(false);
                setShowStudyBuddy(true);
              }}
            />
          </div>
        </div>
      )}

      {showStudyBuddy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowStudyBuddy(false)}
          />
          <div className="relative w-full max-w-3xl rounded-ds-2xl p-6">
            <StudyBuddyPanel
              onClose={() => setShowStudyBuddy(false)}
              profile={profile ?? null}
            />
          </div>
        </div>
      )}

      {showMistakesBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMistakesBook(false)}
          />
          <div className="relative w-full max-w-3xl rounded-ds-2xl p-6">
            <MistakesBookPanel
              onClose={() => setShowMistakesBook(false)}
              userId={sessionUserId}
            />
          </div>
        </div>
      )}

      {showWhatsAppTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowWhatsAppTasks(false)}
          />
          <div className="relative w-full max-w-2xl rounded-ds-2xl p-6">
            <WhatsAppTasksPanel
              onClose={() => setShowWhatsAppTasks(false)}
              userId={sessionUserId}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
