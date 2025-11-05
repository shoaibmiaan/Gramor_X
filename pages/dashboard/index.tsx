// pages/dashboard/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
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

import DashboardSidebar from '@/components/navigation/DashboardSidebar';
import SavedItems from '@/components/dashboard/SavedItems';
import ShareLinkCard from '@/components/dashboard/ShareLinkCard';
import WhatsAppOptIn from '@/components/dashboard/WhatsAppOptIn';
import JoinWeeklyChallengeCard from '@/components/dashboard/JoinWeeklyChallengeCard';
import ChallengeSpotlightCard from '@/components/dashboard/ChallengeSpotlightCard';
import DailyWeeklyChallenges from '@/components/dashboard/DailyWeeklyChallenges';
import GapToGoal from '@/components/visa/GapToGoal';
import GoalRoadmap from '@/components/feature/GoalRoadmap';
import ReadingStats from '@/components/reading/ReadingStatsCard';

import type { Profile, AIPlan } from '@/types/profile';
import type { SubscriptionTier } from '@/lib/navigation/types';

const StudyCalendar = dynamic(() => import('@/components/feature/StudyCalendar'), { ssr: false });

// Innovation panels (lazy)
const AICoachPanel = dynamic(() => import('@/components/innovation/AICoachPanel'), { ssr: false });
const StudyBuddyPanel = dynamic(() => import('@/components/innovation/StudyBuddyPanel'), { ssr: false });
const MistakesBookPanel = dynamic(() => import('@/components/innovation/MistakesBookPanel'), { ssr: false });
const WhatsAppTasksPanel = dynamic(() => import('@/components/innovation/WhatsAppTasksPanel'), { ssr: false });

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

export default function Dashboard(): JSX.Element {
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

  const { latestEnrollment: challengeEnrollment, loading: challengeLoading } = useChallengeEnrollments(sessionUserId);

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
  const subscriptionTier: SubscriptionTier = (profile?.tier as SubscriptionTier | undefined) ?? 'free';
  const earnedBadges = [...badges.streaks, ...badges.milestones, ...badges.community];
  const topBadges = earnedBadges.slice(0, 3);

  const sessionMixEntries = useMemo(() => {
    const fallbackPrefs = profile?.study_prefs ?? [];
    const mixSource =
      ai.sessionMix && ai.sessionMix.length > 0
        ? ai.sessionMix
        : (ai.sequence ?? fallbackPrefs).map((skill) => ({ skill, topic: '' }));

    return mixSource.slice(0, 4);
  }, [ai.sessionMix, ai.sequence, profile?.study_prefs]);

  const focusTopics = useMemo(() => {
    const declaredTopics = (profile?.focus_topics as string[] | null) ?? null;
    if (declaredTopics && declaredTopics.length) {
      return declaredTopics.slice(0, 3);
    }

    const topicCandidates = (ai.sessionMix ?? [])
      .map((entry) => entry.topic)
      .filter((topic): topic is string => Boolean(topic));

    return topicCandidates.slice(0, 3);
  }, [ai.sessionMix, profile?.focus_topics]);

  const goalBand = typeof profile?.goal_band === 'number' ? profile.goal_band : ai.suggestedGoal ?? null;
  const englishLevel = profile?.english_level ?? null;
  const targetStudyTime = profile?.time_commitment || '1–2h/day';
  const dailyQuota = ai.dailyQuota ?? profile?.daily_quota_goal ?? null;

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

  type SummaryCard = {
    id: string;
    title: string;
    headline: string;
    body: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
    supporting?: React.ReactNode;
  };

  const summaryCards: SummaryCard[] = useMemo(() => {
    const cards: SummaryCard[] = [
      {
        id: 'goal-progress',
        title: 'Goal progress',
        headline: typeof goalBand === 'number' ? `Band ${goalBand.toFixed(1)}` : 'Set your target',
        body: englishLevel
          ? `You’re currently tracking at ${englishLevel}. Review your recent scores and lock the next milestone.`
          : 'Tell us your current level so we can chart the fastest route to your target band.',
        primaryCta: {
          label: typeof goalBand === 'number' ? 'Review progress' : 'Set your goal',
          href: typeof goalBand === 'number' ? '/progress' : '/profile/setup',
        },
        secondaryCta: { label: 'Edit goal', href: '/profile/setup' },
        supporting: englishLevel ? <Badge variant="info" size="sm">{englishLevel}</Badge> : null,
      },
      {
        id: 'weekly-focus',
        title: 'This week’s focus',
        headline: sessionMixEntries.length ? `${sessionMixEntries[0]?.skill ?? 'Custom'}` : 'Pick skills',
        body: sessionMixEntries.length
          ? 'Follow this recommended order to close your biggest gaps faster.'
          : 'Choose the skills you want to prioritise so we can prepare drills for you.',
        primaryCta: { label: 'Open practice path', href: '/learning' },
        secondaryCta: { label: 'Plan study week', href: '#study-calendar' },
        supporting: sessionMixEntries.length ? (
          <div className="flex flex-wrap gap-2">
            {sessionMixEntries.map((entry, index) => (
              <Badge key={`${entry.skill}-${entry.topic || index}`} size="sm">
                {entry.topic ? `${entry.skill} • ${entry.topic}` : entry.skill}
              </Badge>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'daily-habit',
        title: 'Daily habit',
        headline: typeof dailyQuota === 'number' ? `${dailyQuota} sessions` : 'Define your quota',
        body: `Stay on rhythm with ${targetStudyTime} of focussed study. Protect your streak by logging today’s practice.`,
        primaryCta: { label: 'Track streak', href: '#streak-panel' },
        secondaryCta: { label: 'Schedule sessions', href: '#study-calendar' },
        supporting: focusTopics.length ? (
          <div className="flex flex-wrap gap-2">
            {focusTopics.map((topic) => (
              <Badge key={topic} variant="secondary" size="sm" className="capitalize">{topic}</Badge>
            ))}
          </div>
        ) : null,
      },
    ];

    if (examDate) {
      cards.push({
        id: 'exam-timeline',
        title: 'Exam timeline',
        headline: daysUntilExam !== null ? `${daysUntilExam} day${daysUntilExam === 1 ? '' : 's'}` : examDate.toLocaleDateString(),
        body: daysUntilExam !== null && daysUntilExam > 0
          ? 'Lock in your mock tests and speaking practice so every week ladders up to exam day.'
          : 'Exam day is here. Complete a confidence run-through and review your checklist.',
        primaryCta: { label: 'View checklist', href: '/mock-tests' },
        secondaryCta: { label: 'Manage calendar', href: '#study-calendar' },
        supporting: <div className="text-small text-muted-foreground">Exam date: {examDate.toLocaleDateString()}</div>,
      });
    }

    return cards;
  }, [dailyQuota, daysUntilExam, englishLevel, examDate, focusTopics, goalBand, sessionMixEntries, targetStudyTime]);

  if (loading) return loadingSkeleton;

  // telemetry helper
  const trackFeatureOpen = (feature: string) => {
    // window.analytics?.track('feature_open', { feature, userId: sessionUserId });
    // eslint-disable-next-line no-console
    console.log('[feature] open', feature);
  };

  const openAICoach = () => {
    setShowAICoach(true);
    trackFeatureOpen('ai_coach');
  };
  const openStudyBuddy = () => {
    setShowStudyBuddy(true);
    trackFeatureOpen('study_buddy');
  };
  const openMistakesBook = () => {
    setShowMistakesBook(true);
    trackFeatureOpen('mistakes_book');
  };
  const openWhatsAppTasks = () => {
    setShowWhatsAppTasks(true);
    trackFeatureOpen('whatsapp_tasks');
  };

  return (
    <>
      <Head>
        <title>Dashboard — Gramor_X</title>
      </Head>

      <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="flex flex-col gap-8 lg:flex-row">
            <DashboardSidebar subscriptionTier={subscriptionTier} />

            <div className="flex-1 space-y-8">
              {needsSetup && (
                <Alert variant="warning" className="mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">Complete your profile to unlock a personalized plan.</div>
                      <div className="text-small opacity-80">It only takes a minute—target band, exam date and study prefs.</div>
                    </div>
                    <Link href="/profile/setup" className="shrink-0">
                      <Button variant="secondary" className="rounded-ds-xl">Continue setup</Button>
                    </Link>
                  </div>
                </Alert>
              )}

              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  {profileAvatarUrl ? (
                    <Image src={profileAvatarUrl} alt={profile?.full_name ? `${profile.full_name} avatar` : 'Profile avatar'} width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-h3 font-semibold text-primary">
                      {(profile?.full_name || 'Learner').split(' ').slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || 'L'}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <h1 className="font-slab text-display text-gradient-primary">Welcome back, {profile?.full_name || 'Learner'}</h1>
                      <p className="text-grayish">Every module below is wired into your IELTS goal—choose where to dive in next.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
                      <span>Preferred language: {(profile?.preferred_language ?? 'en').toUpperCase()}</span>
                      {typeof goalBand === 'number' ? <span>• Target band {goalBand.toFixed(1)}</span> : <span>• Set your goal to unlock tailored guidance</span>}
                      {targetStudyTime ? <span>• Study rhythm: {targetStudyTime}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="flex flex-wrap items-center gap-3">
                    <StreakIndicator value={streak} />
                    {streak >= 7 && <Badge variant="success" size="sm">🔥 {streak}-day streak!</Badge>}
                    <Badge size="sm">🛡 {shields}</Badge>
                    <Button onClick={claimShield} variant="secondary" className="rounded-ds-xl">Claim Shield</Button>
                    {shields > 0 && <Button onClick={useShield} variant="secondary" className="rounded-ds-xl">Use Shield</Button>}
                  </div>

                  {topBadges.length ? (
                    <div className="flex flex-wrap items-center gap-2 text-2xl">
                      {topBadges.map((meta) => <span key={meta.id} aria-label={meta.name} title={meta.name}>{meta.icon}</span>)}
                    </div>
                  ) : null}

                  <div className="flex gap-2 items-center">
                    <Button onClick={openAICoach} variant="primary" size="sm" className="rounded-ds-xl">Open AI Coach</Button>
                    <Button onClick={openStudyBuddy} variant="secondary" size="sm" className="rounded-ds-xl">Study Buddy</Button>
                    <Button onClick={openMistakesBook} variant="ghost" size="sm" className="rounded-ds-xl">Mistakes Book</Button>
                  </div>

                  <Button onClick={() => { navigator.clipboard?.writeText(window.location.href); }} variant="ghost" size="sm" className="rounded-ds-xl">Share progress</Button>
                </div>
              </div>

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

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">AI Coach</h3>
                      <p className="text-sm text-muted-foreground">Personalised feedback, micro-actions and next-step prompts.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={openAICoach} className="rounded-ds-xl">Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = '/ai/coach'}>Full view</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">Study Buddy</h3>
                      <p className="text-sm text-muted-foreground">Smart session builder and on-demand practice partner.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={openStudyBuddy} className="rounded-ds-xl">Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = '/study-buddy'}>Full view</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">Mistakes Book</h3>
                      <p className="text-sm text-muted-foreground">Collect errors, auto-categorise, and generate remediation drills.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={openMistakesBook} className="rounded-ds-xl">Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = '/mistakes-book'}>Full view</Button>
                    </div>
                  </div>
                </Card>
              </div>

              <div id="streak-panel">
                <StreakCounter current={streak} longest={longest} loading={streakLoading} shields={shields} />
                {nextRestart && <Alert variant="info" className="mt-4">Streak will restart on {nextRestart}.</Alert>}
              </div>

              {showTips && (
                <Alert variant="info" className="mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <span>Explore practice modules and track your progress from here.</span>
                    <Button size="sm" variant="secondary" onClick={dismissTips} className="rounded-ds-xl">Got it</Button>
                  </div>
                </Alert>
              )}

              <div className="mt-10 space-y-4" id="vocabulary-spotlight">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Vocabulary spotlight</h2>
                    <p className="text-grayish">Boost your lexical score with today’s curated picks.</p>
                  </div>
                  <Link href="/vocabulary" className="shrink-0">
                    <Button variant="ghost" size="sm" className="rounded-ds-xl">Open vocabulary lab</Button>
                  </Link>
                </div>
                <VocabularySpotlightFeature />
              </div>

              <div className="mt-10" id="weekly-challenge">
                {challengeLoading ? (
                  <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-6">
                    <div className="h-6 w-40 animate-pulse rounded bg-border" />
                    <div className="mt-4 h-24 w-full animate-pulse rounded bg-border" />
                  </Card>
                ) : challengeEnrollment ? (
                  <ChallengeSpotlightCard cohortId={challengeEnrollment.cohort} progress={challengeEnrollment.progress ?? null} />
                ) : (
                  <JoinWeeklyChallengeCard />
                )}
              </div>

              <div className="mt-6"><DailyWeeklyChallenges /></div>

              <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4" id="goal-summary">
                {summaryCards.map((card) => (
                  <Card key={card.id} className="flex h-full flex-col justify-between gap-5 rounded-ds-2xl p-6">
                    <div className="space-y-3">
                      <div>
                        <div className="text-small opacity-70">{card.title}</div>
                        <div className="text-h1 font-semibold">{card.headline}</div>
                      </div>
                      <p className="text-small text-muted-foreground">{card.body}</p>
                      {card.supporting}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={card.primaryCta.href} className="inline-flex">
                        <Button variant="soft" tone="primary" size="sm" className="rounded-ds-xl">{card.primaryCta.label}</Button>
                      </Link>
                      {card.secondaryCta ? (
                        <Link href={card.secondaryCta.href} className="inline-flex">
                          <Button variant="ghost" size="sm" className="rounded-ds-xl">{card.secondaryCta.label}</Button>
                        </Link>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>

              {((ai.sessionMix ?? ai.sequence) ?? []).length > 0 && (
                <div className="mt-10" id="next-sessions">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-slab text-h2">Next Lessons</h2>
                      <p className="text-small text-grayish">Work through these in order to stay aligned with your goal.</p>
                    </div>
                    <Link href="#goal-summary" className="text-small font-medium text-primary underline-offset-4 hover:underline">Revisit your plan</Link>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {(ai.sessionMix && ai.sessionMix.length ? ai.sessionMix : (ai.sequence ?? []).map((skill) => ({ skill, topic: '' })))
                      .slice(0, 3)
                      .map((entry, index) => {
                        const hrefSkill = entry.skill.toLowerCase();
                        const title = entry.topic ? `${entry.skill}: ${entry.topic}` : entry.skill;
                        return (
                          <Card key={`${entry.skill}-${entry.topic || index}`} className="flex flex-col rounded-ds-2xl p-6">
                            <h3 className="mb-2 font-slab text-h3 capitalize">{title}</h3>
                            <div className="mt-auto">
                              <Link href={`/learning/skills/${hrefSkill}`} className="inline-block w-full">
                                <Button variant="primary" className="w-full rounded-ds-xl">Start</Button>
                              </Link>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="mt-10 space-y-4" id="visa-target">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Visa & admissions target</h2>
                    <p className="text-grayish">Track how close you are to the band requirement.</p>
                  </div>
                  <Link href="/visa" className="shrink-0"><Button variant="ghost" size="sm" className="rounded-ds-xl">Update target</Button></Link>
                </div>
                <GapToGoal />
              </div>

              <div className="mt-10 space-y-4" id="study-calendar">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Weekly momentum</h2>
                    <p className="text-grayish">Protect your streak by finishing the scheduled sessions.</p>
                  </div>
                  <Link href="/study-plan" className="shrink-0"><Button variant="ghost" size="sm" className="rounded-ds-xl">Adjust schedule</Button></Link>
                </div>
                <StudyCalendar />
              </div>

              <div className="mt-10">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Roadmap to exam day</h2>
                    <p className="text-grayish">See which stage you are in and what to do next.</p>
                  </div>
                  <Link href="/exam-day" className="shrink-0"><Button variant="ghost" size="sm" className="rounded-ds-xl">Plan exam day</Button></Link>
                </div>
                <GoalRoadmap examDate={profile?.exam_date ?? null} />
              </div>

              <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_.9fr]">
                <Card className="rounded-ds-2xl p-6">
                  <h2 className="font-slab text-h2">Quick Actions</h2>
                  <p className="mt-1 text-grayish">Jump back in with one click.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <QuickDrillButton />
                    <Link href="/learning"><Button variant="primary" className="rounded-ds-xl">Start Today’s Lesson</Button></Link>
                    <Link href="/mock-tests"><Button variant="secondary" className="rounded-ds-xl">Take a Mock Test</Button></Link>
                    <Link href="/writing"><Button variant="accent" className="rounded-ds-xl">Practice Writing</Button></Link>
                    <Link href="/reading"><Button variant="secondary" className="rounded-ds-xl">Practice Reading</Button></Link>
                    <Link href="/progress"><Button variant="ghost" className="rounded-ds-xl">Review progress report</Button></Link>
                    <Link href="#visa-target"><Button variant="ghost" className="rounded-ds-xl">Check visa target</Button></Link>
                    <Button onClick={() => { navigator.clipboard?.writeText(window.location.href); }} variant="secondary" className="rounded-ds-xl">Share Progress</Button>
                  </div>

                  <div className="mt-8 rounded-ds-2xl border border-border/60 bg-muted/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Writing studio shortcuts</h3>
                        <p className="text-xs text-muted-foreground">Jump straight to drafts, feedback, drills, or your retake plan.</p>
                      </div>
                      <Badge variant="soft" tone="info" size="sm">Writing</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/writing"><Button size="sm" variant="primary" className="rounded-ds-xl">New task</Button></Link>
                      <Link href="/writing#continue-drafts"><Button size="sm" variant="secondary" className="rounded-ds-xl">Continue drafts</Button></Link>
                      <Link href="/writing#recent-attempts"><Button size="sm" variant="secondary" className="rounded-ds-xl">Review feedback</Button></Link>
                      <Link href="/writing/drills"><Button size="sm" variant="ghost" className="rounded-ds-xl">Micro-drills</Button></Link>
                      <Link href="/writing#retake-plan"><Button size="sm" variant="ghost" className="rounded-ds-xl">Retake plan</Button></Link>
                    </div>
                  </div>
                </Card>

                <ReadingStatsCard />
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <ShareLinkCard />
                <div>
                  <WhatsAppOptIn />
                  <div className="mt-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">WhatsApp Tasks</h4>
                          <p className="text-sm text-muted-foreground">Receive daily micro-tasks and reminders via WhatsApp.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={openWhatsAppTasks} className="rounded-ds-xl">Open Tasks</Button>
                          <Button size="sm" variant="ghost" onClick={() => window.location.href = '/whatsapp-tasks'}>Manage</Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Card className="space-y-4 rounded-ds-2xl p-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-slab text-h3">Skill focus</h3>
                    <Link href="/learning" className="shrink-0"><Button variant="link" size="sm" className="rounded-ds-xl">Dive into lessons</Button></Link>
                  </div>
                  {(ai.sequence ?? []).length ? (
                    <ul className="list-disc pl-6 text-body">
                      {(ai.sequence ?? []).map((s, i, arr) => (
                        <li key={s}>{s} {i === 0 ? '- prioritize now' : i === arr.length - 1 ? '- strength area' : ''}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-body">Add preferences in your profile to see analytics.</p>
                  )}
                </Card>
              </div>

              <div className="mt-10 space-y-4" id="saved-items">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-slab text-h2">Saved for later</h2>
                    <p className="text-grayish">Jump back to lessons and drills you flagged.</p>
                  </div>
                  <Link href="/saved" className="shrink-0"><Button variant="ghost" size="sm" className="rounded-ds-xl">Manage saved items</Button></Link>
                </div>
                <SavedItems />
              </div>

              <div className="mt-10">
                <Card className="rounded-ds-2xl p-6">
                  <h3 className="mb-2 font-slab text-h3">Upgrade to Rocket 🚀</h3>
                  <p className="text-body opacity-90">Unlock AI deep feedback, speaking evaluator, and full analytics.</p>
                  <div className="mt-4"><Link href="/pricing"><Button variant="primary" className="rounded-ds-xl">See Plans</Button></Link></div>
                </Card>
              </div>

              <div className="mt-10">
                <Card className="rounded-ds-2xl p-6">
                  <h3 className="font-slab text-h3">Coach Notes</h3>
                  {Array.isArray(ai?.notes) && ai.notes.length ? (
                    <ul className="mt-3 list-disc pl-6 text-body">
                      {ai.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                    </ul>
                  ) : (
                    <Alert variant="info" className="mt-3">Add more details in <b>Profile</b> to refine your AI plan.</Alert>
                  )}
                  <div className="mt-4"><Link href="/profile/setup"><Button variant="secondary" className="rounded-ds-xl">Edit Profile</Button></Link></div>
                </Card>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Innovation modals */}
      {showAICoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAICoach(false)} />
          <div className="relative w-full max-w-4xl rounded-ds-2xl p-6">
            <AICoachPanel onClose={() => setShowAICoach(false)} profile={profile ? { user_id: profile.user_id, full_name: profile.full_name } : null} onOpenStudyBuddy={() => { setShowAICoach(false); setShowStudyBuddy(true); }} />
          </div>
        </div>
      )}

      {showStudyBuddy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowStudyBuddy(false)} />
          <div className="relative w-full max-w-3xl rounded-ds-2xl p-6">
            <StudyBuddyPanel onClose={() => setShowStudyBuddy(false)} profile={profile ?? null} />
          </div>
        </div>
      )}

      {showMistakesBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMistakesBook(false)} />
          <div className="relative w-full max-w-3xl rounded-ds-2xl p-6">
            <MistakesBookPanel onClose={() => setShowMistakesBook(false)} userId={sessionUserId} />
          </div>
        </div>
      )}

      {showWhatsAppTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowWhatsAppTasks(false)} />
          <div className="relative w-full max-w-2xl rounded-ds-2xl p-6">
            <WhatsAppTasksPanel onClose={() => setShowWhatsAppTasks(false)} userId={sessionUserId} />
          </div>
        </div>
      )}
    </>
  );
}
