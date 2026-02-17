import React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { getServerClient } from '@/lib/supabaseServer';
import type { LiveSessionStatus, LiveSessionType } from '@/types/supabase';

type SessionListItem = {
  id: string;
  type: LiveSessionType;
  status: LiveSessionStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  hostUserId: string;
  participantUserId: string | null;
};

type LiveSessionsIndexProps = {
  sessions: SessionListItem[];
  viewer: {
    id: string;
    email: string | null;
  };
};

const statusTone: Record<
  LiveSessionStatus,
  { label: string; badge: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  pending: { label: 'Scheduled', badge: 'info' },
  active: { label: 'In progress', badge: 'success' },
  completed: { label: 'Completed', badge: 'neutral' },
  cancelled: { label: 'Cancelled', badge: 'danger' },
};

const sessionTypeLabel: Record<LiveSessionType, string> = {
  human: 'Tutor-led session',
  ai: 'AI conversation',
  peer: 'Peer practice',
};

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return value;
  }
}

const LiveSessionsIndex: NextPage<LiveSessionsIndexProps> = ({ sessions, viewer }) => {
  const upcoming = sessions.filter((s) => s.status === 'pending' || s.status === 'active');
  const history = sessions.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  return (
    <>
      <Head>
        <title>Live speaking sessions · Gramor</title>
      </Head>
      <main className="bg-background py-24 text-foreground">
        <Container>
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-caption text-mutedText">Live speaking</p>
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Manage live sessions</h1>
              <p className="text-small text-mutedText md:text-body">
                Schedule tutor-led or AI sessions, join rooms, and review your recordings in one place.
              </p>
            </div>
            <Card className="max-w-xs bg-card/70 backdrop-blur" padding="sm">
              <p className="text-small text-mutedText">Signed in as</p>
              <p className="text-body font-medium text-foreground">{viewer.email ?? 'Your account'}</p>
            </Card>
          </header>

          <section className="mt-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="flex flex-col gap-6" padding="lg">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Upcoming sessions</h2>
                <Badge variant="info">Beta</Badge>
              </div>

              {upcoming.length === 0 ? (
                <div className="rounded-ds-xl border border-border/60 bg-muted/40 p-6 text-center text-mutedText">
                  <p className="text-body font-medium text-foreground/80">No upcoming sessions yet</p>
                  <p className="mt-2 text-small">
                    Book a slot with your tutor or launch an instant AI conversation to add it here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {upcoming.map((session) => {
                    const status = statusTone[session.status];
                    const viewerBadge = session.hostUserId === viewer.id ? 'Host' : 'Participant';
                    const rawTopic = session.metadata?.['topic'];
                    const topic = typeof rawTopic === 'string' ? rawTopic : null;

                    return (
                      <li key={session.id} className="rounded-ds-xl border border-border/60 bg-surface/80 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={status.badge}>{status.label}</Badge>
                              <Badge variant="neutral">{sessionTypeLabel[session.type]}</Badge>
                              <Badge variant="subtle">{viewerBadge}</Badge>
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">{topic ?? 'Live speaking session'}</h3>
                            <p className="text-small text-mutedText">
                              {session.status === 'pending'
                                ? `Starts ${formatDate(session.scheduledAt)} (room opens 5 minutes before).`
                                : `Started ${formatDate(session.startedAt ?? session.scheduledAt)}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button href={`/speaking/live/${session.id}`} variant="primary" className="rounded-ds-xl">
                              Open session
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="flex flex-col gap-4" padding="lg">
              <h2 className="text-xl font-semibold">How it works</h2>
              <ul className="space-y-3 text-small text-mutedText">
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Choose tutor-led, AI conversation, or peer practice when creating a session.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Sessions unlock a secure room link and optional recording controls.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Recordings and transcripts are saved to review alongside pronunciation analytics.</span>
                </li>
              </ul>
              <div className="mt-2 rounded-ds-xl border border-dashed border-border/60 bg-muted/30 p-4 text-small text-mutedText">
                Need a new session? Contact your tutor or support team—they can schedule it instantly for you.
              </div>
            </Card>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Past sessions</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-small text-mutedText">Your completed sessions will appear here once you finish them.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {history.map((session) => {
                  const status = statusTone[session.status];
                  const rawTopic = session.metadata?.['topic'];
                  const topic = typeof rawTopic === 'string' ? rawTopic : null;

                  return (
                    <Card
                      key={session.id}
                      padding="md"
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={status.badge}>{status.label}</Badge>
                          <Badge variant="neutral">{sessionTypeLabel[session.type]}</Badge>
                        </div>
                        <p className="mt-1 text-body font-medium text-foreground">
                          {topic ?? 'Live speaking session'}
                        </p>
                        <p className="text-small text-mutedText">
                          {session.status === 'completed'
                            ? `Completed ${formatDate(session.endedAt ?? session.startedAt ?? session.scheduledAt)}`
                            : `Cancelled ${formatDate(session.endedAt ?? session.scheduledAt)}`}
                        </p>
                      </div>
                      <Button href={`/speaking/live/${session.id}`} variant="soft" tone="primary" className="rounded-ds-xl">
                        View details
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </Container>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    const from = encodeURIComponent('/speaking/live');
    return {
      redirect: {
        destination: `/welcome?from=${from}`,
        permanent: false,
      },
    };
  }

  const { data: rows = [] } = await supabase
    .from('speaking_sessions')
    .select(
      'id, type, status, scheduled_at, started_at, ended_at, metadata, host_user_id, participant_user_id, created_at'
    )
    .or(`host_user_id.eq.${user.id},participant_user_id.eq.${user.id}`)
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(30);

  const sessions: SessionListItem[] = (rows as any[]).map((row) => ({
    id: row.id,
    type: row.type as LiveSessionType,
    status: row.status as LiveSessionStatus,
    scheduledAt: row.scheduled_at ?? null,
    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    hostUserId: row.host_user_id,
    participantUserId: row.participant_user_id ?? null,
  }));

  return {
    props: {
      sessions,
      viewer: {
        id: user.id,
        email: user.email ?? null,
      },
    },
  };
};

export default LiveSessionsIndex;
