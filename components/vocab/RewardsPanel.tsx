import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';
import { track } from '@/lib/analytics/track';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const CONFETTI_COUNT = 14;
const CONFETTI_COLORS = ['#f97316', '#3b82f6', '#10b981', '#facc15', '#ec4899'] as const;

type AttemptSummary = {
  xpAwarded: number;
  attempts: number;
  label: string;
  detail?: string;
  tone: 'success' | 'info' | 'warning' | 'neutral';
};

type MeaningSummary = {
  xpAwarded: number;
  correct: boolean;
  attempts: number;
};

type SentenceSummary = {
  xpAwarded: number;
  score: number;
};

type SynonymSummary = {
  xpAwarded: number;
  score: number;
  accuracy: number;
};

type AttemptState = {
  meaning?: MeaningSummary;
  sentence?: SentenceSummary;
  synonyms?: SynonymSummary;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
};

export type RewardsPanelProps = Readonly<{
  xpTotal: number;
  attempts: AttemptState;
}>;

function ConfettiBurst({ visible, disabled }: { visible: boolean; disabled?: boolean }) {
  const pieces = React.useMemo(() => Array.from({ length: CONFETTI_COUNT }), []);
  const dynamicStyles = React.useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT })
        .map((_, index) => {
          const delay = (index * 9) / 100;
          const left = (index / CONFETTI_COUNT) * 100;
          const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
          return `.confetti-piece-${index} { left: ${left}%; background-color: ${color}; animation-delay: ${delay}s; }`;
        })
        .join('\n'),
    [],
  );
  if (!visible || disabled) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden confetti-burst" aria-hidden>
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -12%;
          width: 10px;
          height: 18px;
          opacity: 0;
          border-radius: 4px;
          animation: confetti-fall 1.6s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -10%, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 120%, 0) rotate(360deg);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .confetti-burst {
            display: none;
          }
        }
        ${dynamicStyles}
      `}</style>
      {pieces.map((_, index) => {
        return (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`confetti-piece confetti-piece-${index}`}
          />
        );
      })}
    </div>
  );
}

function buildAttemptSummaries(attempts: AttemptState): AttemptSummary[] {
  const summary: AttemptSummary[] = [];

  if (attempts.meaning) {
    summary.push({
      xpAwarded: attempts.meaning.xpAwarded,
      attempts: attempts.meaning.attempts,
      label: attempts.meaning.correct ? 'Meaning mastered' : 'Meaning attempt',
      detail: attempts.meaning.correct ? 'You nailed the definition.' : 'Keep trying for the +10 XP bonus.',
      tone: attempts.meaning.correct ? 'success' : 'info',
    });
  } else {
    summary.push({
      xpAwarded: 0,
      attempts: 0,
      label: 'Meaning quiz',
      detail: 'Answer to unlock XP.',
      tone: 'neutral',
    });
  }

  if (attempts.sentence) {
    const tone = attempts.sentence.score >= 3 ? 'success' : attempts.sentence.score === 2 ? 'info' : 'warning';
    summary.push({
      xpAwarded: attempts.sentence.xpAwarded,
      attempts: 1,
      label: `Sentence score ${attempts.sentence.score}/3`,
      detail:
        attempts.sentence.score >= 3
          ? 'Bonus awarded for examiner-ready writing.'
          : 'Add more detail and clarity for a higher score.',
      tone,
    });
  } else {
    summary.push({
      xpAwarded: 0,
      attempts: 0,
      label: 'Sentence practice',
      detail: 'Submit for instant AI feedback.',
      tone: 'neutral',
    });
  }

  if (attempts.synonyms) {
    const tone = attempts.synonyms.score >= 70 ? 'success' : attempts.synonyms.score >= 40 ? 'info' : 'warning';
    summary.push({
      xpAwarded: attempts.synonyms.xpAwarded,
      attempts: 1,
      label: `Synonym rush ${attempts.synonyms.score}`,
      detail: `Accuracy ${(attempts.synonyms.accuracy * 100).toFixed(0)}%.`,
      tone,
    });
  } else {
    summary.push({
      xpAwarded: 0,
      attempts: 0,
      label: 'Synonym rush',
      detail: 'Beat the clock to earn bonus XP.',
      tone: 'neutral',
    });
  }

  return summary;
}

export function RewardsPanel({ xpTotal, attempts }: RewardsPanelProps) {
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [shareStatus, setShareStatus] = React.useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
  const [showConfetti, setShowConfetti] = React.useState(false);
  const prevXpRef = React.useRef(0);
  const rewardLoggedRef = React.useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/vocab/leaderboard', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to load leaderboard');
        }
        const payload = (await response.json()) as { entries?: LeaderboardEntry[] };
        setLeaderboard((payload.entries ?? []).slice(0, 5));
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Leaderboard is warming up — try again soon.');
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      prevXpRef.current = xpTotal;
      setShowConfetti(false);
      return undefined;
    }

    if (xpTotal > prevXpRef.current && xpTotal > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1800);
      prevXpRef.current = xpTotal;
      return () => clearTimeout(timer);
    }
    prevXpRef.current = xpTotal;
    return undefined;
  }, [prefersReducedMotion, xpTotal]);

  React.useEffect(() => {
    if (xpTotal <= 0) {
      rewardLoggedRef.current = false;
      return;
    }
    if (!rewardLoggedRef.current) {
      rewardLoggedRef.current = true;
      track('vocab_reward_shown', { xpTotal });
    }
  }, [xpTotal]);

  const attemptSummaries = React.useMemo(() => buildAttemptSummaries(attempts), [attempts]);

  const handleShare = React.useCallback(async () => {
    try {
      const shareText = `I just earned ${xpTotal} XP practising IELTS vocabulary on GramorX!`;
      const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/vocab' : 'https://gramorx.com/vocab';
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'GramorX Vocabulary Streak', text: shareText, url: shareUrl });
        setShareStatus('shared');
        track('vocab_share_clicked', { method: 'web-share', status: 'shared' });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
        track('vocab_share_clicked', { method: 'clipboard', status: 'copied' });
        return;
      }
      throw new Error('Sharing not supported');
    } catch (err) {
      console.warn('[RewardsPanel] share failed', err);
      setShareStatus('error');
      track('vocab_share_clicked', { method: 'fallback', status: 'error' });
    }
  }, [xpTotal]);

  return (
    <Card className="relative overflow-hidden p-6">
      <ConfettiBurst visible={showConfetti} disabled={prefersReducedMotion} />
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-h4 font-semibold text-foreground">Rewards & leaderboard</h2>
            <p className="text-body text-mutedText">Keep the streak alive to climb the weekly XP ladder.</p>
          </div>
          <span aria-live="polite">
            <Badge variant="success" size="sm">
              Total XP today · {xpTotal}
            </Badge>
          </span>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {attemptSummaries.map((item) => (
            <div
              key={item.label}
              className={[
                'rounded-2xl border px-4 py-3 shadow-sm transition-colors',
                item.tone === 'success' ? 'border-success/40 bg-success/5' : '',
                item.tone === 'info' ? 'border-info/40 bg-info/5' : '',
                item.tone === 'warning' ? 'border-warning/50 bg-warning/10' : '',
                item.tone === 'neutral' ? 'border-border/80 bg-surface' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{item.label}</span>
                <span className="text-small font-medium text-primary tabular-nums">+{item.xpAwarded} XP</span>
              </div>
              <p className="mt-1 text-small text-mutedText">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="soft" tone="success" onClick={handleShare} aria-describedby="share-status">
            <Icon name="gift" size={18} aria-hidden />
            {shareStatus === 'copied'
              ? 'Link copied!'
              : shareStatus === 'shared'
                ? 'Shared — nice!'
                : shareStatus === 'error'
                  ? 'Sharing unavailable'
                  : 'Share progress'}
          </Button>
          <span id="share-status" className="sr-only" aria-live="polite">
            {shareStatus === 'copied'
              ? 'Share link copied to clipboard'
              : shareStatus === 'shared'
                ? 'Shared successfully'
                : shareStatus === 'error'
                  ? 'Sharing failed'
                  : 'Ready to share'}
          </span>
          <Button asChild variant="soft" tone="info">
            <Link href="/vocabulary">
              <Icon name="book" size={18} aria-hidden />
              Review words
            </Link>
          </Button>
          <Button variant="soft" tone="primary" onClick={handleShare} aria-describedby="share-status">
            <Icon name="arrow-right" size={18} aria-hidden />
            Challenge a friend
          </Button>
        </div>

        <section aria-live="polite" className="space-y-3" aria-busy={loading}>
          <div className="flex items-center gap-2">
            <h3 className="text-h5 font-semibold text-foreground">Weekly leaderboard</h3>
            <Badge variant="neutral" size="xs">
              Top 5 · Asia/Karachi
            </Badge>
          </div>
          {loading ? (
            <p className="text-small text-mutedText">Loading standings…</p>
          ) : error ? (
            <p className="text-small text-warning">{error}</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-small text-mutedText">Be the first to log XP this week!</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-surface px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {entry.rank}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-small font-medium text-foreground">{entry.displayName}</span>
                      <span className="text-caption text-mutedText">{entry.userId.slice(0, 6)}…</span>
                    </div>
                  </div>
                  <span className="text-small font-semibold text-foreground tabular-nums">{entry.xp} XP</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Card>
  );
}

export default RewardsPanel;
