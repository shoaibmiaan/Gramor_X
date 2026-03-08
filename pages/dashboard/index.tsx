import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';

import { supabase } from '@/lib/supabaseClient';
import { useStreak } from '@/hooks/useStreak';
import { getDayKeyInTZ } from '@/lib/streak';
import { useSignedAvatar } from '@/hooks/useSignedAvatar';
import { useChallengeEnrollments } from '@/hooks/useChallengeEnrollments';
import { useNextTask } from '@/hooks/useNextTask';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import { badges } from '@/data/badges';
import { VocabularySpotlightFeature } from '@/components/feature/VocabularySpotlight';
import { StreakCounter } from '@/components/streak/StreakCounter';
import { NextTaskCard } from '@/components/reco/NextTaskCard';

import GapToGoal from '@/components/visa/GapToGoal';
import { AIWorkspaceSection } from '@/components/dashboard/sections/AIWorkspaceSection';
import { CalendarSection } from '@/components/dashboard/sections/CalendarSection';
import { ChallengeSection } from '@/components/dashboard/sections/ChallengeSection';
import { PriorityActionsSection } from '@/components/dashboard/sections/PriorityActionsSection';
import { ProfileHeaderSection } from '@/components/dashboard/sections/ProfileHeaderSection';
import { QuickActionsSection } from '@/components/dashboard/sections/QuickActionsSection';
import { RoadmapSection } from '@/components/dashboard/sections/RoadmapSection';
import { SavedItemsSection } from '@/components/dashboard/sections/SavedItemsSection';
import { UpgradeSection } from '@/components/dashboard/sections/UpgradeSection';
import type { ActionItem, InnovationTile } from '@/components/dashboard/sections/types';

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

const deriveNameFromEmail = (email: string | null | undefined): string => {
  if (!email) return '';

  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return '';

  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const Dashboard: NextPage = () => {
  useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useLocalStorage<string>('dashboardTipsDismissed', '');
  const showTips = !tipsDismissed;
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  // Study plan tasks for today
  const { todayTasks, loading: planLoading } = useStudyPlan();

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
            const { error } = await supabase.auth.exchangeCodeForSession(url);
            if (!error) {
              await window.history.replaceState({}, '', '/dashboard');
            }
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const authUser = session?.user ?? null;
        setSessionUserId(authUser?.id ?? null);

        if (!authUser) {
          // redirect to login preserving next
          window.location.href = `/login?next=/dashboard`;
          return;
        }

        // Load or create minimal profile
        const { data, error } = await supabase
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
            full_name: deriveNameFromEmail(authUser.email),
            preferred_language: 'en',
            onboarding_complete: false,
          };

          const { data: created, error: insertErr } = await supabase
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

  const dismissTips = () => {
    setTipsDismissed('1');
  };

  useEffect(() => {
    if (streakLoading) return;
    const today = getDayKeyInTZ();
    if (lastDayKey !== today) {
      void completeToday().catch(() => {});
    }
  }, [streakLoading, lastDayKey, completeToday]);

  const { signedUrl: profileAvatarUrl } = useSignedAvatar(profile?.avatar_url ?? null);

  // Wrap ai in useMemo to avoid recreating it on every render (fix for exhaustive-deps warning)
  const ai = useMemo<AIPlan>(
    () => (profile?.ai_recommendation ?? {}) as AIPlan,
    [profile?.ai_recommendation],
  );

  const subscriptionTier: SubscriptionTier =
    (profile?.tier as SubscriptionTier | undefined) ?? 'free';
  const earnedBadges = [...badges.streaks, ...badges.milestones, ...badges.community];
  const topBadges = earnedBadges.slice(0, 3);

  const goalBand =
    typeof profile?.goal_band === 'number' ? profile.goal_band : (ai.suggestedGoal ?? null);
  const targetStudyTime = profile?.time_commitment || '1–2h/day';

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

  // Speaking vocab topic + slug for today
  const speakingVocabTopic = useMemo(() => {
    const aiAny = ai as any;
    const fromAI =
      aiAny?.speakingFocusTopic ||
      (ai.sessionMix ?? []).find((entry: any) => entry?.skill?.toLowerCase() === 'speaking')?.topic;
    if (typeof fromAI === 'string' && fromAI.trim().length > 0) {
      return fromAI;
    }
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
          ? `You&apos;ve locked in your ${streak} day streak. Keep the rhythm going tomorrow.`
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
        title: 'Shape this week&apos;s plan',
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
      logClientEvent('dashboard.feature_open', {
        feature,
        user_id: sessionUserId,
        source: 'dashboard_home',
      });
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
            <ProfileHeaderSection
              profileAvatarUrl={profileAvatarUrl}
              fullName={profile?.full_name}
              preferredLanguage={profile?.preferred_language}
              goalBand={goalBand}
              targetStudyTime={targetStudyTime}
              streak={streak}
              shields={shields}
              topBadges={topBadges}
              onClaimShield={claimShield}
              onUseShield={useShield}
              onOpenAICoach={openAICoach}
              onOpenStudyBuddy={openStudyBuddy}
              onOpenMistakesBook={openMistakesBook}
              onOpenWhatsAppTasks={openWhatsAppTasks}
              onShareProgress={shareDashboard}
            />

            {/* STUDY PLAN TASKS FOR TODAY */}

            {!planLoading && todayTasks && todayTasks.length > 0 && (
              <Card className="p-6 rounded-ds-2xl border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-slab text-h2">📋 Today&apos;s study plan</h2>
                  <Link href="/study-plan">
                    <Button variant="ghost" size="sm" className="rounded-ds-xl">
                      View full plan
                    </Button>
                  </Link>
                </div>
                <ul className="space-y-3">
                  {todayTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between p-3 border border-border rounded-ds-xl bg-background/60"
                    >
                      <div>
                        <Badge variant="soft" size="sm" className="mr-2 capitalize">
                          {task.type}
                        </Badge>
                        <span className="text-sm">{task.description}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{task.duration} min</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* NEXT TASK (AI Recommendation) */}
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
            <AIWorkspaceSection innovationTiles={innovationTiles} />

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
                    Boost your lexical score with today&apos;s curated pick and quick quiz.
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
            <ChallengeSection
              loading={challengeLoading}
              challengeEnrollment={
                challengeEnrollment
                  ? {
                      cohort: challengeEnrollment.cohort,
                      progress: challengeEnrollment.progress ?? null,
                    }
                  : null
              }
            />
            <PriorityActionsSection actionItems={actionItems} />

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
                    : (ai.sequence ?? []).map((skill) => ({ skill, topic: '' }))
                  )
                    .slice(0, 3)
                    .map((entry, index) => {
                      const hrefSkill = entry.skill.toLowerCase();
                      const title = entry.topic ? `${entry.skill}: ${entry.topic}` : entry.skill;
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
            <CalendarSection StudyCalendar={StudyCalendar} />
            <RoadmapSection examDate={profile?.exam_date ?? null} />
            <QuickActionsSection
              speakingVocabSlug={speakingVocabSlug}
              onShareDashboard={shareDashboard}
            />
            <SavedItemsSection />
            <UpgradeSection aiNotes={Array.isArray(ai?.notes) ? ai.notes : []} />
          </div>
        </Container>
      </section>

      {/* Innovation modals */}
      {showAICoach && (
        <AccessibleModal isOpen={showAICoach} onClose={() => setShowAICoach(false)} title="AI Coach" maxWidthClassName="max-w-4xl">
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
        </AccessibleModal>
      )}

      {showStudyBuddy && (
        <AccessibleModal isOpen={showStudyBuddy} onClose={() => setShowStudyBuddy(false)} title="Study Buddy">
          <StudyBuddyPanel
            onClose={() => setShowStudyBuddy(false)}
            profile={profile ?? null}
          />
        </AccessibleModal>
      )}

      {showMistakesBook && (
        <AccessibleModal isOpen={showMistakesBook} onClose={() => setShowMistakesBook(false)} title="Mistakes Book">
          <MistakesBookPanel
            onClose={() => setShowMistakesBook(false)}
            userId={sessionUserId}
          />
        </AccessibleModal>
      )}

      {showWhatsAppTasks && (
        <AccessibleModal isOpen={showWhatsAppTasks} onClose={() => setShowWhatsAppTasks(false)} title="WhatsApp Tasks" maxWidthClassName="max-w-2xl">
          <WhatsAppTasksPanel
            onClose={() => setShowWhatsAppTasks(false)}
            userId={sessionUserId}
          />
        </AccessibleModal>
      )}
    </>
  );
};

export default Dashboard;
