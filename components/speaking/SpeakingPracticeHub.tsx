import React from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { NextTaskCard } from '@/components/reco/NextTaskCard';
import { useNextTask } from '@/hooks/useNextTask';
import type { SpeakingPracticeHubProps } from '@/types/speakingPracticeHub';

const featureHighlights = [
  {
    id: 'prompt-library',
    badgeLabel: 'Expanded',
    badgeVariant: 'primary' as const,
    title: 'Speaking prompt library',
    description:
      'Search 500+ IELTS topics, interview questions, and professional scenarios with smart filters and bookmarks.',
    bullets: [
      'Surface prompts by part, band, tags, or locale in seconds.',
      'Launch mocks or pronunciation drills directly from each card.',
    ],
    action: {
      label: 'Explore library',
      href: '/speaking/library',
      variant: 'primary' as const,
    },
  },
  {
    id: 'pronunciation-coach',
    badgeLabel: 'New',
    badgeVariant: 'accent' as const,
    title: 'Pronunciation coach',
    description:
      'Get phoneme-level accuracy, pacing guidance, and personalised drills mapped to IELTS descriptors.',
    bullets: [
      'Heatmaps for words and phonemes with instant playback.',
      'Daily weak-sound plan plus reattempt deltas.',
    ],
    action: {
      label: 'Open coach',
      href: '/speaking/coach',
      variant: 'primary' as const,
    },
  },
  {
    id: 'live-sessions',
    badgeLabel: 'Beta',
    badgeVariant: 'info' as const,
    title: 'Live speaking sessions',
    description:
      'Schedule tutor-led, AI, or peer sessions with secure recordings and transcripts to review later.',
    bullets: [
      'Plan or instantly join sessions based on your subscription.',
      'Capture call recordings and notes for progress tracking.',
    ],
    action: {
      label: 'Manage sessions',
      href: '/speaking/live',
      variant: 'secondary' as const,
    },
  },
  {
    id: 'community-review',
    badgeLabel: 'Community',
    badgeVariant: 'success' as const,
    title: 'Peer review & teacher feedback',
    description:
      'Share attempts with trusted peers or teachers to collect threaded comments, annotations, and rubric-aligned overrides.',
    bullets: [
      'Create invite-only threads with audio snippets and transcript highlights.',
      'Teacher overrides blend with AI scores for richer progress tracking.',
    ],
    action: {
      label: 'Open review hub',
      href: '/community/review',
      variant: 'secondary' as const,
    },
  },
] as const;

export function SpeakingPracticeHub({ attempts, attemptsToday, limit, signedIn }: SpeakingPracticeHubProps) {
  const limitLeft = Math.max(0, limit - attemptsToday);
  const {
    recommendationId: speakingRecommendationId,
    task: speakingNextTask,
    reason: speakingNextReason,
    evidence: speakingNextEvidence,
    score: speakingNextScore,
    loading: speakingNextLoading,
    error: speakingNextError,
    refresh: refreshSpeakingNextTask,
  } = useNextTask();

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-slab text-h1 md:text-display">Speaking Practice</h1>
            <p className="text-grayish mt-2">
              Simulator (Parts 1–3), pronunciation coach, adaptive next steps, live sessions, community threads, and now an
              expanded prompt library to keep you improving.
            </p>
          </div>

          {signedIn && (
            limitLeft > 0 ? (
              <Badge variant="info" size="sm">
                {limitLeft} / {limit} attempts left today
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">Daily limit reached</Badge>
            )
          )}
        </div>

        <div className="mt-8">
          <NextTaskCard
            variant="compact"
            loading={speakingNextLoading}
            task={speakingNextTask}
            reason={speakingNextReason}
            evidence={speakingNextEvidence}
            recommendationId={speakingRecommendationId}
            score={speakingNextScore}
            error={speakingNextError}
            onRefresh={() => refreshSpeakingNextTask()}
          />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureHighlights.map((feature) => (
            <Card key={feature.id} className="relative overflow-hidden" interactive>
              <div
                className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-electricBlue/5"
                aria-hidden="true"
              />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={feature.badgeVariant}>{feature.badgeLabel}</Badge>
                </div>
                <div>
                  <h2 className="text-h3 leading-tight">{feature.title}</h2>
                  <p className="text-grayish mt-2 max-w-xl text-body">{feature.description}</p>
                </div>
                <ul className="mt-2 space-y-2 text-small text-mutedText">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Button
                    href={feature.action.href}
                    variant={feature.action.variant}
                    className="rounded-ds-xl"
                    aria-label={feature.action.label}
                    fullWidth
                  >
                    {feature.action.label}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="card-surface rounded-ds-2xl p-6">
            <Badge variant="info">Core</Badge>
            <h3 className="text-h3 mt-3">Test Simulator</h3>
            <p className="text-grayish mt-1">Parts 1–3 with prompts, timing, auto-record &amp; AI feedback.</p>
            <Button
              variant="primary"
              className="mt-6 rounded-ds-xl"
              aria-label="Start Speaking Test Simulator"
              href="/speaking/simulator"
            >
              Start
            </Button>
          </Card>

          <Card className="card-surface rounded-ds-2xl p-6">
            <Badge variant="success">Interactive</Badge>
            <h3 className="text-h3 mt-3">AI Speaking Partner</h3>
            <p className="text-grayish mt-1">Practice answers with live feedback and saved clips.</p>
            <Button
              variant="secondary"
              className="mt-6 rounded-ds-xl"
              aria-label="Open AI Speaking Partner"
              href="/speaking/partner"
            >
              Open
            </Button>
          </Card>

          <Card className="card-surface rounded-ds-2xl p-6">
            <Badge variant="warning">Scenarios</Badge>
            <h3 className="text-h3 mt-3">Role-play</h3>
            <p className="text-grayish mt-1">Real-life dialogues (UK/US/AUS accents) with guided prompts.</p>
            <Button
              variant="secondary"
              className="mt-6 rounded-ds-xl"
              aria-label="Try Role-play Check-in"
              href="/speaking/roleplay/check-in"
            >
              Try
            </Button>
          </Card>

          <Card className="card-surface rounded-ds-2xl p-6">
            <Badge variant="primary">Library</Badge>
            <h3 className="text-h3 mt-3">Prompt Collections</h3>
            <p className="text-grayish mt-1">Browse 500+ prompts by topic, band, or pack and jump straight into mocks or drills.</p>
            <Button
              variant="primary"
              className="mt-6 rounded-ds-xl"
              aria-label="Open speaking prompt library"
              href="/speaking/library"
            >
              Browse prompts
            </Button>
          </Card>

          <Card className="card-surface rounded-ds-2xl p-6">
            <Badge variant="success">Community</Badge>
            <h3 className="text-h3 mt-3">Peer Review Threads</h3>
            <p className="text-grayish mt-1">
              Share an attempt with invited peers or teachers, exchange annotated feedback, and track overrides alongside AI scores.
            </p>
            <Button
              variant="secondary"
              className="mt-6 rounded-ds-xl"
              aria-label="Open peer review hub"
              href="/community/review"
            >
              Join feedback loop
            </Button>
          </Card>

          {signedIn && (
            <Card className="card-surface rounded-ds-2xl p-6 md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="text-h3">Recent Attempts</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" className="rounded-ds-xl" href="/speaking/attempts">
                    View All
                  </Button>
                  <Button variant="primary" className="rounded-ds-xl" href="/speaking/simulator">
                    New Attempt
                  </Button>
                </div>
              </div>

              {attempts.length === 0 ? (
                <p className="text-grayish mt-3">No attempts yet. Start the simulator to get your first score.</p>
              ) : (
                <div className="mt-4 divide-y divide-black/10 dark:divide-white/10">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex-1">
                        <div className="text-small opacity-70">{new Date(attempt.created_at).toLocaleString()}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-small">
                          {(['p1', 'p2', 'p3'] as const).map((part) => {
                            const value = attempt.parts[part];
                            return value != null ? (
                              <Badge key={part} variant="success" size="sm">
                                {part.toUpperCase()} {value}
                              </Badge>
                            ) : (
                              <Badge key={part} variant="secondary" size="sm">
                                {part.toUpperCase()} —
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="primary">Overall {attempt.overall != null ? attempt.overall.toFixed(1) : '—'}</Badge>
                        <Button variant="primary" className="rounded-ds-xl" href={`/speaking/review/${attempt.id}`}>
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </Container>
    </section>
  );
}

export default SpeakingPracticeHub;
