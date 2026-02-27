import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import type { User } from '@supabase/supabase-js';

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
import FreeView from '@/pages/dashboard/components/tiers/FreeView';
import SeedlingView from '@/pages/dashboard/components/tiers/SeedlingView';
import RocketView from '@/pages/dashboard/components/tiers/RocketView';
import OwlView from '@/pages/dashboard/components/tiers/OwlView';
import { getDashboardAggregate, type DashboardAggregate } from '@/lib/services/dashboardService';
import { normalizeTier } from '@/lib/config/featureFlags';
import useEntitlement from '@/hooks/useEntitlement';
import TierGuard from '@/components/entitlements/TierGuard';

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

type BaselineScores = {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
};


const TIER_VIEW_MAP: Record<Exclude<SubscriptionTier, 'free'>, React.ComponentType<{ userId: string | null; targetBand: number }>> = {
  seedling: SeedlingView,
  rocket: RocketView,
  owl: OwlView,
};

type StudyPlanSnapshot = {
  targetBand: number | null;
  examDate: string | null;
  generatedAt: string | null;
  totalWeeks: number | null;
  firstWeekFocus: string | null;
  recommendations: string[];
  firstWeekTaskCount: number;
};

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

const parseBaselineScores = (value: unknown): BaselineScores | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const reading = Number(raw.reading);
  const writing = Number(raw.writing);
  const listening = Number(raw.listening);
  const speaking = Number(raw.speaking);

  const allFinite = [reading, writing, listening, speaking].every((n) => Number.isFinite(n));
  if (!allFinite) return null;

  return { reading, writing, listening, speaking };
};

const buildStudyPlanSnapshot = (row: Record<string, unknown> | null): StudyPlanSnapshot | null => {
  if (!row) return null;

  const planData =
    (row.plan_data as Record<string, unknown> | null) ??
    (row.plan_json as Record<string, unknown> | null) ??
    null;
  const weeksRaw = (planData?.weeks as unknown[]) ?? (row.weeks as unknown[]) ?? [];
  const firstWeek = weeksRaw[0] as Record<string, unknown> | undefined;
  const firstWeekDays = (firstWeek?.days as unknown[]) ?? [];
  const firstWeekTaskCount = firstWeekDays.reduce((acc, day) => {
    const tasks = ((day as Record<string, unknown>)?.tasks as unknown[]) ?? [];
    return acc + tasks.length;
  }, 0);

  const weeksCountFromPlan = Number(planData?.totalWeeks);
  const totalWeeks = Number.isFinite(weeksCountFromPlan)
    ? weeksCountFromPlan
    : weeksRaw.length || null;

  const recommendations = Array.isArray(planData?.recommendations)
    ? (planData?.recommendations as unknown[])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const targetBandRaw = Number(row.target_band ?? row.goal_band ?? planData?.target_band ?? null);

  return {
    targetBand: Number.isFinite(targetBandRaw) ? targetBandRaw : null,
    examDate: (row.exam_date as string | null) ?? (planData?.exam_date as string | null) ?? null,
    generatedAt: (row.updated_at as string | null) ?? (row.created_at as string | null) ?? null,
    totalWeeks,
    firstWeekFocus: (firstWeek?.focus as string | null) ?? null,
    recommendations,
    firstWeekTaskCount,
  };
};

const isSubscriptionTier = (value: unknown): value is SubscriptionTier =>
  value === 'free' || value === 'seedling' || value === 'rocket' || value === 'owl';

const getTierFromAuthContext = (user: User | null): SubscriptionTier | null => {
  const userMetadataTier = user?.user_metadata?.tier;
  if (isSubscriptionTier(userMetadataTier)) {
    return userMetadataTier;
  }

  const appMetadataTier = user?.app_metadata?.tier;
  if (isSubscriptionTier(appMetadataTier)) {
    return appMetadataTier;
  }

  return null;
};

const Dashboard: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studyPlanSnapshot, setStudyPlanSnapshot] = useState<StudyPlanSnapshot | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [authTier, setAuthTier] = useState<SubscriptionTier | null>(null);
  const [dashboardAggregate, setDashboardAggregate] = useState<DashboardAggregate | null>(null);

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
        const authContextTier = getTierFromAuthContext(authUser);
        setAuthTier(authContextTier);

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
          (p as any)?.onboarding_complete == null && (!p?.full_name || !p?.preferred_language);

        setNeedsSetup(!!(draftFlag || explicitIncomplete || heuristicIncomplete));
        setProfile(p ?? null);

        const [planRes, aggregate] = await Promise.all([
          supabaseBrowser
            .from('study_plans')
            .select('target_band,goal_band,exam_date,plan_data,plan_json,weeks,updated_at,created_at')
            .eq('user_id', authUser.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          getDashboardAggregate(supabaseBrowser as any, authUser.id),
        ]);

        if (planRes.error) {
          // eslint-disable-next-line no-console
          console.error('[dashboard] study plan load error:', planRes.error);
        } else {
          setStudyPlanSnapshot(
            buildStudyPlanSnapshot((planRes.data as Record<string, unknown> | null) ?? null),
          );
        }

        setDashboardAggregate(aggregate);
        if (!authContextTier) {
          setAuthTier(normalizeTier(aggregate.subscription.planId));
        }

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
  const aggregateAi = (dashboardAggregate?.recommendations?.[0]?.content ?? null) as AIPlan | null;
  const ai: AIPlan = (aggregateAi ?? profile?.ai_recommendation ?? {}) as AIPlan;
  const subscriptionTier: SubscriptionTier =
    authTier ?? (profile?.tier as SubscriptionTier | undefined) ?? 'free';
  const entitlement = useEntitlement(subscriptionTier);
  const earnedBadges = [...badges.streaks, ...badges.milestones, ...badges.community];
  const topBadges = earnedBadges.slice(0, 3);

  const goalBand =
    typeof profile?.goal_band === 'number' ? profile.goal_band : (ai.suggestedGoal ?? null);
  const targetStudyTime = profile?.time_commitment || '1–2h/day';
  const baselineScores = useMemo(
    () => parseBaselineScores(profile?.baseline_scores ?? null),
    [profile?.baseline_scores],
  );

  const examDate = useMemo(() => {
    if (!profile?.exam_date) return null;
    const parsed = new Date(profile.exam_date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [profile?.exam_date]);

  const daysUntilExam = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = examDate.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }, [examDate]);

  // 🔹 Speaking vocab topic + slug for today
  const speakingVocabTopic = useMemo(() => {
    const aiAny = ai as any;

    const fromAI =
      aiAny?.speakingFocusTopic ||
      (ai.sessionMix ?? []).find((entry: any) => entry?.skill?.toLowerCase() === 'speaking')?.topic;

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
    if (label.includes('work') || label.includes('job') || label.includes('study')) return 'work';
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

  const trackFeatureOpen = useCallback(
    (feature: string) => {
      if (typeof window === 'undefined') return;
      const analytics = (
        window as Window & {
          analytics?: { track?: (event: string, payload: Record<string, unknown>) => void };
        }
      ).analytics;
      analytics?.track?.('feature_open', { feature, userId: sessionUserId });
    },
    [sessionUserId],
  );

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
    const isFreeTier = !entitlement.canAccessFeature('aiCoach');

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

  const TierView = subscriptionTier === 'free' ? null : TIER_VIEW_MAP[subscriptionTier];
  if (TierView) {
    return (
      <TierGuard tier={subscriptionTier} minTier={subscriptionTier}>
        <TierView userId={sessionUserId} targetBand={goalBand ?? 7} />
      </TierGuard>
    );
  }

  const accentClass: Record<NonNullable<InnovationTile['accent']>, string> = {
    primary: 'bg-primary/15 text-primary',
    secondary: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    info: 'bg-electricBlue/15 text-electricBlue',
  };

  const renderTileAction = (key: string, action: TileAction, variant: 'primary' | 'ghost') =>
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
    <DashboardShell>
      <section className="space-y-6">
        <h1 className="text-2xl font-semibold">AI Command Center</h1>
        <AIOverviewPanel
          currentBand={overview.currentBand}
          weeklyImprovement={overview.weeklyImprovement}
          nextAction={overview.nextAction}
        />
        <TierGuard tier={tier} feature="advancedAnalytics" minimumTier="rocket">
          <PerformanceAnalytics
            reading={trendData.reading}
            writing={trendData.writing}
            speaking={trendData.speaking}
          />
        </TierGuard>
        <SkillModulesGrid modules={skillModules} />
        <TierGuard tier={tier} feature="fullAiInsights" minimumTier="owl">
          <SmartRecommendations items={recommendations} />
        </TierGuard>
      </section>
      <AICommandCenter />
    </DashboardShell>
  );
};

export default DashboardPage;
