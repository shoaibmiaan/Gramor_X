import { env } from "@/lib/env";
// pages/speaking/index.tsx
import React from 'react';
import type { GetServerSideProps } from 'next';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { getUserServer } from '@/lib/authServer';

type Parts = Record<'p1' | 'p2' | 'p3', number | null>;
type AttemptRow = {
  id: string;
  created_at: string;
  overall: number | null;
  parts: Parts;
};

export default function SpeakingHub({
  attempts,
  attemptsToday,
  limit,
  signedIn,
}: {
  attempts: AttemptRow[];
  attemptsToday: number;
  limit: number;
  signedIn: boolean;
}) {
  const limitLeft = Math.max(0, limit - attemptsToday);

  const featureHighlights = [
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
  ];

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        {/* Hero */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-slab text-h1 md:text-display">Speaking Practice</h1>
            <p className="text-grayish mt-2">
              Simulator (Parts 1–3), pronunciation coach, live sessions, AI partner, and detailed reports.
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

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {featureHighlights.map((feature) => (
            <Card key={feature.id} className="relative overflow-hidden" interactive>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-electricBlue/5 pointer-events-none" aria-hidden="true" />
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
          {/* Simulator */}
          <Card className="card-surface p-6 rounded-ds-2xl">
            <Badge variant="info">Core</Badge>
            <h3 className="text-h3 mt-3">Test Simulator</h3>
            <p className="text-grayish mt-1">Parts 1–3 with prompts, timing, auto-record & AI feedback.</p>
            <Button
              variant="primary"
              className="mt-6 rounded-ds-xl"
              aria-label="Start Speaking Test Simulator"
              href="/speaking/simulator"
            >
              Start
            </Button>
          </Card>

          {/* AI Partner */}
          <Card className="card-surface p-6 rounded-ds-2xl">
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

          {/* Role-play */}
          <Card className="card-surface p-6 rounded-ds-2xl">
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

          {/* Recent attempts */}
          {signedIn && (
            <Card className="card-surface p-6 rounded-ds-2xl md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="text-h3">Recent Attempts</h3>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-ds-xl"
                    href="/speaking/attempts"
                  >
                    View All
                  </Button>
                  <Button
                    variant="primary"
                    className="rounded-ds-xl"
                    href="/speaking/simulator"
                  >
                    New Attempt
                  </Button>
                </div>
              </div>

              {attempts.length === 0 ? (
                <p className="text-grayish mt-3">No attempts yet. Start the simulator to get your first score.</p>
              ) : (
                <div className="mt-4 divide-y divide-black/10 dark:divide-white/10">
                  {attempts.map((a) => (
                    <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="text-small opacity-70">{new Date(a.created_at).toLocaleString()}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-small">
                          {(['p1','p2','p3'] as const).map((k) => {
                            const v = a.parts[k];
                            return v != null ? (
                              <Badge key={k} variant="success" size="sm">{k.toUpperCase()} {v}</Badge>
                            ) : (
                              <Badge key={k} variant="secondary" size="sm">{k.toUpperCase()} —</Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="primary">Overall {a.overall != null ? a.overall.toFixed(1) : '—'}</Badge>
                        <Button
                          variant="primary"
                          className="rounded-ds-xl"
                          href={`/speaking/review/${a.id}`}
                        >
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

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const { user, supabase } = await getUserServer(req as any, res as any);

  const limit = parseInt(env.SPEAKING_DAILY_LIMIT || '5', 10);
  if (!user) {
    return { props: { attempts: [], attemptsToday: 0, limit, signedIn: false } };
  }

  // attempts in last 24h (for limit)
  const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: attemptsToday = 0 } = await supabase
    .from('speaking_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', sinceIso);

  // last 5 attempts
  const { data: atts = [] } = await supabase
    .from('speaking_attempts')
    .select('id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const attempts: AttemptRow[] = [];
  if (atts.length) {
    const ids = atts.map((a) => a.id);
    const { data: clips = [] } = await supabase
      .from('speaking_clips')
      .select('attempt_id, part, overall')
      .in('attempt_id', ids);

    const map = new Map<string, AttemptRow>();
    atts.forEach((a) =>
      map.set(a.id, {
        id: a.id,
        created_at: a.created_at,
        overall: null,
        parts: { p1: null, p2: null, p3: null },
      })
    );

    clips.forEach((c: any) => {
      const row = map.get(c.attempt_id);
      if (row && (c.part === 'p1' || c.part === 'p2' || c.part === 'p3')) {
        row.parts[c.part] = typeof c.overall === 'number' ? Number(c.overall) : null;
      }
    });

    map.forEach((r) => {
      const vals = Object.values(r.parts).filter((v): v is number => v != null);
      r.overall = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null;
      attempts.push(r);
    });
  }

  return { props: { attempts, attemptsToday, limit, signedIn: true } };
};
