import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import BandDiffView from '@/components/writing/BandDiffView';
import BandProgressChart from '@/components/writing/BandProgressChart';
import WritingResultCard from '@/components/writing/WritingResultCard';
import AccessibilityHints from '@/components/writing/AccessibilityHints';
import ExportButton from '@/components/writing/ExportButton';
import ReferralCard from '@/components/account/ReferralCard';
import { UpgradeDialog } from '@/components/billing/UpgradeDialog';
import { Variant, useVariantConversion } from '@/components/exp/Variant';
import { computeWritingSummary } from '@/lib/analytics/writing';
import {
  logWritingCoachEntry,
  logWritingResultsAnalyticsClick,
  logWritingResultsShare,
  logWritingResultsView,
} from '@/lib/analytics/writing-events';
import { getServerClient } from '@/lib/supabaseServer';
import { computeCriterionDeltas, trimProgressPoints } from '@/lib/writing/progress';
import { calculateWritingXp, type WritingAchievement } from '@/lib/gamification/xp';
import type { CriterionDelta, WritingProgressPoint } from '@/types/analytics';
import type { WritingFeedback, WritingScorePayload, WritingTaskType } from '@/types/writing';
import type { PlanId } from '@/types/pricing';
import { resolveFlags } from '@/lib/flags';
import { track } from '@/lib/analytics/track';
import { evaluateQuota, nextPlanForQuota, type QuotaKey } from '@/lib/plan/quotas';
import { planAllows } from '@/lib/plan/gates';
import { KeyboardAwareSheet } from '@/components/mobile/KeyboardAwareSheet';
import { PushOptInCard } from '@/components/mobile/PushOptInCard';
import { InstallBanner } from '@/components/mobile/InstallBanner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useInstalledApp } from '@/hooks/useInstalledApp';

interface HighlightSection {
  task: WritingTaskType;
  essay: string;
  feedback: WritingFeedback;
}

interface PageProps {
  plan: PlanId;
  featureFlags: {
    writingExports: boolean;
    writingCertificates: boolean;
  };
  attemptId: string;
  results: Array<{ task: WritingTaskType; essay: string; score: WritingScorePayload }>;
  averageBand: number;
  highlight?: HighlightSection | null;
  progressPoints: WritingProgressPoint[];
  progressDeltas: CriterionDelta[];
  xp: {
    points: number;
    reason: string;
    achievements: WritingAchievement[];
    improvement: number;
    durationSeconds: number | null;
  };
  quota: { key: QuotaKey; used: number } | null;
  referralCode?: string | null;
}

const CoachDock = dynamic(() => import('@/components/writing/CoachDock'), {
  ssr: false,
  loading: () => (
    <div className="rounded-ds-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
      Loading coach…
    </div>
  ),
});

const quotaCopy: Record<QuotaKey, { title: string; helper: string }> = {
  dailyMocks: {
    title: 'Daily mock limit reached',
    helper: 'Upgrade to unlock more daily attempts and keep your streak going.',
  },
  aiEvaluationsPerDay: {
    title: 'AI feedback limit reached',
    helper: 'Upgrade to increase your daily writing evaluations.',
  },
  storageGB: {
    title: 'Storage limit reached',
    helper: 'Upgrade to expand your library for essays and speaking recordings.',
  },
};

const formatPlanLabel = (id: PlanId) => id.charAt(0).toUpperCase() + id.slice(1);

const quotaLimitText = (key: QuotaKey, limit: number) => {
  const isUnlimited = !Number.isFinite(limit);
  switch (key) {
    case 'dailyMocks':
      return isUnlimited ? 'unlimited daily mock tests' : `${limit} daily mock test${limit === 1 ? '' : 's'}`;
    case 'aiEvaluationsPerDay':
      return isUnlimited
        ? 'unlimited daily AI evaluations'
        : `${limit} daily AI evaluation${limit === 1 ? '' : 's'}`;
    case 'storageGB':
      return isUnlimited ? 'unlimited storage' : `${limit} GB of storage`;
    default:
      return isUnlimited ? 'unlimited usage' : `${limit}`;
  }
};

type QuotaUpgradeNoticeProps = {
  plan: PlanId;
  quota: { key: QuotaKey; used: number } | null;
  evaluation: ReturnType<typeof evaluateQuota> | null;
  onUpgrade: () => void;
};

function QuotaUpgradeNotice({ plan, quota, evaluation, onUpgrade }: QuotaUpgradeNoticeProps) {
  if (!quota || !evaluation || !evaluation.exceeded) return null;
  const copy = quotaCopy[quota.key];
  const limitText = evaluation.isUnlimited ? 'unlimited' : evaluation.limit;
  const currentPlanLabel = formatPlanLabel(plan);
  const nextPlanId = nextPlanForQuota(plan, quota.key);
  const nextPlanLimit = nextPlanId ? evaluateQuota(nextPlanId, quota.key, 0).limit : null;
  const nextPlanCopy =
    nextPlanId && nextPlanLimit !== null
      ? ` ${formatPlanLabel(nextPlanId)} unlocks ${quotaLimitText(quota.key, nextPlanLimit)}.`
      : '';

  return (
    <section className="rounded-ds-xl border border-destructive/40 bg-destructive/10 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-destructive">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You have used {quota.used} of {limitText} available today on the {currentPlanLabel} plan. {copy.helper}
            {nextPlanCopy}
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={onUpgrade}>
          Upgrade plan
        </Button>
      </div>
    </section>
  );
}

type ReferralVariantSlotProps = { source?: string };

function ReferralVariantSlot({ source = 'writing-results' }: ReferralVariantSlotProps) {
  const trackConversion = useVariantConversion();

  const handleCodeGenerated = useCallback(
    (code: string) => {
      void trackConversion({ action: 'referral-code', codeLength: code.length });
    },
    [trackConversion],
  );

  const handleShare = useCallback(
    (mode: 'copy' | 'share' | 'error') => {
      if (mode === 'error') return;
      void trackConversion({ action: 'referral-share', method: mode });
    },
    [trackConversion],
  );

  return (
    <ReferralCard
      className="mt-6"
      source={source}
      onCodeGenerated={handleCodeGenerated}
      onShare={handleShare}
    />
  );
}

const WritingResultsPage: React.FC<PageProps> = ({
  plan,
  featureFlags,
  attemptId,
  results,
  averageBand,
  highlight,
  progressPoints,
  progressDeltas,
  xp,
  quota,
  referralCode,
}) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { isInstalled } = useInstalledApp();
  const { promptEvent, clearPrompt } = useInstallPrompt();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'default';
    return Notification.permission;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    setPushStatus(Notification.permission);
  }, []);

  const supportsPush = typeof window !== 'undefined' && typeof Notification !== 'undefined';

  const shouldShowInstall = useMemo(() => {
    if (!planAllows(plan, 'writing.install.prompt')) return false;
    if (isInstalled || installDismissed) return false;
    return Boolean(promptEvent);
  }, [installDismissed, isInstalled, plan, promptEvent]);

  const shouldShowPush = useMemo(() => {
    if (!planAllows(plan, 'writing.push.optin')) return false;
    if (!supportsPush) return false;
    if (pushStatus === 'granted' || pushDismissed) return false;
    return true;
  }, [plan, pushDismissed, pushStatus, supportsPush]);

  const hasEngagementPrompts = shouldShowInstall || shouldShowPush;

  useEffect(() => {
    if (!hasEngagementPrompts) {
      setSheetOpen(false);
    }
  }, [hasEngagementPrompts]);

  const handleInstallComplete = (outcome: 'accepted' | 'dismissed') => {
    setInstallDismissed(true);
    clearPrompt();
    if (outcome === 'accepted') {
      setSheetOpen(false);
    }
  };

  const handlePushGranted = () => {
    setPushStatus('granted');
    setSheetOpen(false);
  };

  const handlePushDismiss = () => {
    setPushDismissed(true);
  };

  const quotaEvaluation = useMemo(() => {
    if (!quota) return null;
    return evaluateQuota(plan, quota.key, quota.used);
  }, [plan, quota?.key, quota?.used]);

  const paywallTrackedRef = useRef(false);
  useEffect(() => {
    if (!quota || !quotaEvaluation?.exceeded || paywallTrackedRef.current) return;
    paywallTrackedRef.current = true;
    track('paywall_view', { source: 'writing_results', quota: quota.key, plan });
  }, [plan, quota, quotaEvaluation?.exceeded]);

  useEffect(() => {
    logWritingCoachEntry({ attemptId, tasks: results.length, averageBand });
    logWritingResultsView({ attemptId, tasks: results.length, averageBand });
  }, [attemptId, results.length, averageBand]);

  const shareLabel = useMemo(() => {
    if (shareStatus === 'copied') return 'Link copied!';
    if (shareStatus === 'shared') return 'Shared — nice!';
    if (shareStatus === 'error') return 'Sharing unavailable';
    return 'Share results';
  }, [shareStatus]);

  const shareFeedback = useMemo(() => {
    if (shareStatus === 'copied') return 'Share link copied to clipboard';
    if (shareStatus === 'shared') return 'Shared successfully';
    if (shareStatus === 'error') return 'Sharing failed';
    return 'Ready to share';
  }, [shareStatus]);

  const handleShare = useCallback(async () => {
    const shareText = `I just logged a band ${averageBand.toFixed(1)} IELTS writing mock on GramorX!`;
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/writing/mock/${attemptId}/results`
        : 'https://gramorx.com/writing/mock';

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'GramorX Writing Results',
          text: shareText,
          url: shareUrl,
        });
        setShareStatus('shared');
        logWritingResultsShare({ attemptId, method: 'web-share', status: 'shared' });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
        logWritingResultsShare({ attemptId, method: 'clipboard', status: 'copied' });
        return;
      }

      throw new Error('Sharing not supported');
    } catch (error) {
      console.warn('[writing/results] share failed', error);
      setShareStatus('error');
      logWritingResultsShare({ attemptId, method: 'fallback', status: 'error' });
    }
  }, [attemptId, averageBand]);

  const handleAnalyticsClick = useCallback(() => {
    logWritingResultsAnalyticsClick({ attemptId });
  }, [attemptId]);

  const openUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);

  const referralVariant = (
    <Variant
      experiment="writing_results_referral"
      context={{ plan, attemptId, quota: quota?.key ?? null }}
      fallback={null}
      variants={{
        control: null,
        referral: <ReferralVariantSlot source="writing-results" />,
      }}
    />
  );

  return (
    <Container className="py-12">
      {quota ? (
        <UpgradeDialog
          open={upgradeOpen}
          onClose={closeUpgrade}
          plan={plan}
          quota={quota}
          referralCode={referralCode ?? undefined}
          source="writing-results"
        />
      ) : null}
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Mock writing results</h1>
          <p className="text-sm text-muted-foreground">Attempt ID: {attemptId}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1 font-medium text-foreground">
              Average band {averageBand.toFixed(1)}
            </span>
            <Badge variant="success" size="sm">
              +{xp.points} XP
            </Badge>
            <Link href={`/writing/mock/${attemptId}/review`}>
              <Button size="sm" variant="secondary">
                Detailed review
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="primary" onClick={handleShare} aria-describedby="share-status">
              {shareLabel}
            </Button>
            <span id="share-status" className="sr-only" aria-live="polite">
              {shareFeedback}
            </span>
            {featureFlags.writingExports ? (
              <ExportButton attemptId={attemptId} />
            ) : null}
            {featureFlags.writingCertificates ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  track('cert.view', { attemptId, plan });
                  window.open(`/cert/writing/${attemptId}`, '_blank');
                }}
              >
                Certificate
              </Button>
            ) : null}
            <Link href="/analytics/writing" onClick={handleAnalyticsClick} className="inline-flex">
              <Button size="sm" variant="secondary">
                Open analytics
              </Button>
            </Link>
          </div>
        </header>

        {hasEngagementPrompts ? (
          <div className="hidden gap-4 md:grid md:grid-cols-2">
            {shouldShowInstall ? (
              <InstallBanner promptEvent={promptEvent} onComplete={handleInstallComplete} onDismiss={handleInstallComplete} />
            ) : null}
            {shouldShowPush ? (
              <PushOptInCard onGranted={handlePushGranted} onDismiss={handlePushDismiss} />
            ) : null}
          </div>
        ) : null}

        {hasEngagementPrompts ? (
          <div className="flex justify-center md:hidden">
            <Button size="lg" variant="secondary" onClick={() => setSheetOpen(true)}>
              Stay connected
            </Button>
          </div>
        ) : null}

        {xp.achievements.length > 0 ? (
          <section className="rounded-ds-xl border border-border/60 bg-muted/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Achievements unlocked</h2>
              <Badge variant="success" size="sm">
                +{xp.points} XP total
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {xp.achievements.map((achievement) => (
                <div
                  key={`${achievement.id}-${achievement.label}`}
                  className="rounded-lg border border-border/50 bg-background/80 p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{achievement.label}</p>
                    <span className="text-sm font-semibold text-primary">+{achievement.points} XP</span>
                  </div>
                  {achievement.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <AccessibilityHints />

        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Scores are still processing. Refresh this page in a few seconds.</p>
        ) : (
          results.map((result) => (
            <WritingResultCard key={result.task} task={result.task} result={result.score} essay={result.essay} />
          ))
        )}

        {highlight ? (
          <BandDiffView essay={highlight.essay} feedback={highlight.feedback} />
        ) : (
          <div className="rounded-ds-xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
            Detailed highlights will appear once AI feedback is ready.
          </div>
        )}

        <BandProgressChart points={progressPoints} deltas={progressDeltas} />

        <QuotaUpgradeNotice plan={plan} quota={quota} evaluation={quotaEvaluation} onUpgrade={openUpgrade} />

        {referralVariant}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Need a next step?</h2>
          <p className="text-sm text-muted-foreground">
            Chat with the AI writing coach to plan rewrites, upgrade paragraphs, or build lexical drills using this attempt.
          </p>
          <CoachDock attemptId={attemptId} />
        </section>
      </div>

      <KeyboardAwareSheet
        open={sheetOpen && hasEngagementPrompts}
        title="Stay connected"
        description="Install the app or enable notifications to follow your progress on the go."
        onClose={() => setSheetOpen(false)}
      >
        {shouldShowInstall ? (
          <InstallBanner promptEvent={promptEvent} onComplete={handleInstallComplete} onDismiss={handleInstallComplete} />
        ) : null}
        {shouldShowPush ? (
          <PushOptInCard onGranted={handlePushGranted} onDismiss={handlePushDismiss} />
        ) : null}
      </KeyboardAwareSheet>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: {
        destination: '/welcome',
        permanent: false,
      },
    };
  }

  const { mockId: attemptId } = ctx.params as { mockId: string };

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (error || !attempt || attempt.user_id !== user.id) {
    return { notFound: true };
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('plan, role')
    .eq('id', user.id)
    .maybeSingle();

  const plan = (profileRow?.plan as PlanId | undefined) ?? 'free';
  const role = (profileRow?.role as string | null) ?? null;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [{ count: dailyMocksCount }, { count: aiEvaluationsCount }] = await Promise.all([
    supabase
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('exam_type', 'writing')
      .gte('started_at', todayIso),
    supabase
      .from('writing_responses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayIso),
  ]);

  const quotaCandidates: Array<{ key: QuotaKey; used: number }> = [
    { key: 'dailyMocks', used: dailyMocksCount ?? 0 },
    { key: 'aiEvaluationsPerDay', used: aiEvaluationsCount ?? 0 },
    { key: 'storageGB', used: 0 },
  ];

  const quotaHit =
    quotaCandidates.find((candidate) => evaluateQuota(plan, candidate.key, candidate.used).exceeded) ?? null;

  const flagSnapshot = await resolveFlags({ plan, role, userId: user.id });

  const { data: responses } = await supabase
    .from('writing_responses')
    .select('id, task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version, submitted_at, created_at')
    .eq('exam_attempt_id', attemptId);

  const responseIds = (responses ?? []).map((row) => row.id).filter(Boolean);
  const { data: feedbackRows } = responseIds.length
    ? await supabase
        .from('writing_feedback')
        .select('attempt_id, band9_rewrite, errors, blocks')
        .in('attempt_id', responseIds as string[])
    : { data: [] };

  const scores = (responses ?? [])
    .filter((row) => row.task === 'task1' || row.task === 'task2')
    .map((row) => ({
      task: row.task as WritingTaskType,
      essay: row.answer_text ?? '',
      score: {
        version: (row.evaluation_version as string) ?? 'baseline-v1',
        overallBand: row.overall_band ?? 0,
        bandScores: (row.band_scores as any) ?? {
          task_response: 0,
          coherence_and_cohesion: 0,
          lexical_resource: 0,
          grammatical_range: 0,
        },
        feedback:
          (row.feedback as any) ?? {
            summary: 'No feedback recorded yet.',
            strengths: [],
            improvements: [],
            perCriterion: {
              task_response: { band: 0, feedback: '' },
              coherence_and_cohesion: { band: 0, feedback: '' },
              lexical_resource: { band: 0, feedback: '' },
              grammatical_range: { band: 0, feedback: '' },
            },
          },
        wordCount: row.word_count ?? 0,
        durationSeconds: row.duration_seconds ?? undefined,
        tokensUsed: undefined,
      } satisfies WritingScorePayload,
      id: row.id as string,
    }));

  const summary = computeWritingSummary(
    scores.map((entry) => ({
      id: `${attemptId}-${entry.task}`,
      attemptId,
      examAttemptId: attemptId,
      promptId: undefined,
      task: entry.task,
      answerText: entry.essay,
      wordCount: entry.score.wordCount,
      overallBand: entry.score.overallBand,
      bandScores: entry.score.bandScores,
      feedback: entry.score.feedback,
      durationSeconds: entry.score.durationSeconds,
      evaluationVersion: entry.score.version,
      tokensUsed: entry.score.tokensUsed,
      createdAt: attempt.created_at,
      submittedAt: attempt.submitted_at ?? attempt.updated_at ?? attempt.created_at,
      metadata: null,
    })),
  );

  const progress = await loadProgress(supabase, user.id, attemptId);

  const sortedPoints = [...progress.points].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const currentPoint = sortedPoints.find((point) => point.attemptId === attemptId) ?? null;
  const previousPoint = sortedPoints.filter((point) => point.attemptId !== attemptId).pop() ?? null;

  const xpSummary = calculateWritingXp({
    currentOverall: currentPoint?.overallBand ?? summary.averageBand ?? 0,
    previousOverall: previousPoint?.overallBand ?? null,
    submittedAt: attempt.submitted_at ?? attempt.updated_at ?? attempt.created_at ?? null,
    startedAt: attempt.started_at ?? attempt.created_at ?? null,
    durationSeconds: attempt.duration_seconds ?? null,
  });

  const referralCode = typeof ctx.query.code === 'string' ? ctx.query.code : null;

  return {
    props: {
      plan,
      featureFlags: {
        writingExports: Boolean(flagSnapshot.writingExports),
        writingCertificates: Boolean(flagSnapshot.writingCertificates),
      },
      attemptId,
      results: scores.map(({ id: _id, ...rest }) => rest),
      averageBand: summary.averageBand || 0,
      highlight:
        scores.length > 0
          ? (() => {
              const primary = scores.find((entry) => entry.task === 'task2') ?? scores[0];
              const feedbackRow = feedbackRows?.find((row) => row.attempt_id === primary.id);
              const combinedFeedback: WritingFeedback = {
                ...primary.score.feedback,
                band9Rewrite: feedbackRow?.band9_rewrite ?? primary.score.feedback.band9Rewrite,
                errors: (feedbackRow?.errors as WritingFeedback['errors']) ?? primary.score.feedback.errors,
                blocks: (feedbackRow?.blocks as WritingFeedback['blocks']) ?? primary.score.feedback.blocks,
              };
              return {
                task: primary.task,
                essay: primary.essay,
                feedback: combinedFeedback,
              } satisfies HighlightSection;
            })()
          : null,
      progressPoints: progress.points,
      progressDeltas: progress.deltas,
      xp: {
        points: xpSummary.points,
        reason: xpSummary.reason,
        achievements: xpSummary.achievements,
        improvement: xpSummary.improvement,
        durationSeconds: xpSummary.effectiveDuration,
      },
      quota: quotaHit,
      referralCode,
    },
  };
};

async function loadProgress(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
  currentAttemptId: string,
) {
  const { data: rows } = await supabase
    .from('writing_responses')
    .select('exam_attempt_id, overall_band, band_scores, submitted_at, created_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(10);

  const attempts = new Map<string, { total: number; count: number; createdAt: string } & WritingProgressPoint>();

  for (const row of rows ?? []) {
    const examId = row.exam_attempt_id as string | null;
    if (!examId) continue;
    const point =
      attempts.get(examId) ?? {
        attemptId: examId,
        createdAt: row.submitted_at ?? row.created_at ?? new Date().toISOString(),
        overallBand: 0,
        bandScores: {
          task_response: 0,
          coherence_and_cohesion: 0,
          lexical_resource: 0,
          grammatical_range: 0,
        },
        total: 0,
        count: 0,
      };
    point.total += Number(row.overall_band ?? 0);
    point.count += 1;
    const bands = (row.band_scores as Record<string, number> | null) ?? {};
    point.bandScores.task_response += Number(bands.task_response ?? 0);
    point.bandScores.coherence_and_cohesion += Number(bands.coherence_and_cohesion ?? 0);
    point.bandScores.lexical_resource += Number(bands.lexical_resource ?? 0);
    point.bandScores.grammatical_range += Number(bands.grammatical_range ?? 0);
    attempts.set(examId, point);
  }

  const rawPoints: WritingProgressPoint[] = Array.from(attempts.values()).map((point) => {
    const divisor = point.count === 0 ? 1 : point.count;
    return {
      attemptId: point.attemptId,
      createdAt: point.createdAt,
      overallBand: Number((point.total / divisor).toFixed(1)),
      bandScores: {
        task_response: Number((point.bandScores.task_response / divisor).toFixed(1)),
        coherence_and_cohesion: Number((point.bandScores.coherence_and_cohesion / divisor).toFixed(1)),
        lexical_resource: Number((point.bandScores.lexical_resource / divisor).toFixed(1)),
        grammatical_range: Number((point.bandScores.grammatical_range / divisor).toFixed(1)),
      },
    };
  });

  const trimmed = trimProgressPoints(rawPoints, 3);
  const deltas = computeCriterionDeltas(trimmed);

  if (!trimmed.find((point) => point.attemptId === currentAttemptId)) {
    const current = rawPoints.find((point) => point.attemptId === currentAttemptId);
    if (current) {
      trimmed.push(current);
    }
  }

  return { points: trimProgressPoints(trimmed, 3), deltas };
}

export default WritingResultsPage;
