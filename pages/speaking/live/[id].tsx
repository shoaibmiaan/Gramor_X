import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import { useMemo } from 'react';
import { z } from 'zod';

import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { useLiveSession } from '@/hooks/useLiveSession';
import { withPlan } from '@/lib/plan/withPlan';
import { supabaseServer } from '@/lib/supabaseServer';
import type { LiveSessionStatus, LiveSessionType } from '@/types/supabase';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

type SessionRecordingSummary = {
  id: string;
  storagePath: string;
  transcriptPath: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

type SessionPageProps = {
  session: {
    id: string;
    type: LiveSessionType;
    status: LiveSessionStatus;
    scheduledAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    metadata: Record<string, unknown>;
    recordings: SessionRecordingSummary[];
    hostUserId: string;
    participantUserId: string | null;
  };
  viewer: {
    id: string;
    role: string | null;
  };
  token: string | null;
  __plan: string;
};

const statusCopy: Record<LiveSessionStatus, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Scheduled', tone: 'info' },
  active: { label: 'In progress', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

function formatIso(value: string | null): string {
  if (!value) return 'Not scheduled';
  try {
    const dt = new Date(value);
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt);
  } catch {
    return value;
  }
}

const LiveSessionPage: NextPage<SessionPageProps> = ({ session, token, viewer }) => {
  const { connectionState, connected, error, connect, disconnect, startRecording, stopRecording, isRecording, recordingDurationSeconds } =
    useLiveSession({ sessionId: session.id, token, autoConnect: session.status === 'active', onConnectionChange: undefined });

  const status = statusCopy[session.status];
  const recordingProgress = useMemo(() => {
    const capSeconds = 60 * 60; // 60 minutes visual scale
    const pct = (recordingDurationSeconds / capSeconds) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [recordingDurationSeconds]);

  const sessionTypeLabel: Record<LiveSessionType, string> = {
    human: 'Tutor-led session',
    ai: 'AI conversation',
    peer: 'Peer practice',
  };

  const viewerBadge = (() => {
    if (session.hostUserId === viewer.id) return { label: 'Host', variant: 'primary' as const };
    if (session.participantUserId && session.participantUserId === viewer.id) return { label: 'Participant', variant: 'secondary' as const };
    return viewer.role ? { label: viewer.role, variant: 'subtle' as const } : { label: 'Viewer', variant: 'subtle' as const };
  })();

  return (
    <>
      <Head>
        <title>Live speaking session · Gramor</title>
      </Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
          <header className="flex flex-col gap-3">
            <p className="text-caption text-mutedText">Live speaking</p>
            <h1 className="text-3xl font-semibold leading-tight text-foreground">{sessionTypeLabel[session.type]}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={status.tone === 'success' ? 'success' : status.tone === 'danger' ? 'danger' : status.tone === 'info' ? 'info' : 'neutral'}>
                {status.label}
              </Badge>
              <Badge variant={viewerBadge.variant}>{viewerBadge.label}</Badge>
              <span className="text-small text-mutedText">Session ID: {session.id}</span>
            </div>
          </header>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Connection</h2>
                <p className="text-small text-mutedText">
                  {connected ? 'You are connected to the live room.' : 'Join the room to start the live speaking session.'}
                </p>
                <dl className="grid grid-cols-1 gap-2 text-small text-mutedText sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground">Scheduled</dt>
                    <dd>{formatIso(session.scheduledAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Status</dt>
                    <dd className="capitalize">{status.label}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Connection state</dt>
                    <dd className="capitalize">{connectionState}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Recording</dt>
                    <dd>{isRecording ? 'Recording in progress' : 'Recording stopped'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Your role</dt>
                    <dd>{viewerBadge.label}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant={connected ? 'secondary' : 'primary'}
                  onClick={() => (connected ? void disconnect() : void connect())}
                  loading={connectionState === 'connecting' || connectionState === 'disconnecting'}
                  loadingText={connected ? 'Leaving…' : 'Joining…'}
                >
                  {connected ? 'Leave session' : 'Join session'}
                </Button>
                <Button
                  variant="soft"
                  tone={isRecording ? 'warning' : 'primary'}
                  onClick={() => (isRecording ? void stopRecording() : void startRecording())}
                  disabled={!connected}
                >
                  {isRecording ? 'Stop recording' : 'Start recording'}
                </Button>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <ProgressBar value={recordingProgress} label="Recording length" ariaLabel="Recording progress" />
              <p className="text-small text-mutedText">
                {isRecording
                  ? `Recording… ${recordingDurationSeconds.toString()}s elapsed`
                  : 'Recording is idle. Start recording to capture this session.'}
              </p>
              {error && <p className="text-small text-danger">{error}</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Session metadata</h2>
            <p className="mt-1 text-small text-mutedText">
              These details are stored securely so tutors and AI services can personalise feedback after the call.
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-small sm:grid-cols-2">
              {Object.entries(session.metadata).length === 0 && (
                <div className="rounded-2xl border border-border/60 bg-background p-4 text-mutedText">
                  No metadata has been captured for this session yet.
                </div>
              )}
              {Object.entries(session.metadata).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-border/60 bg-background p-4">
                  <dt className="text-caption font-semibold uppercase tracking-wide text-mutedText">{key}</dt>
                  <dd className="mt-1 text-small text-foreground">
                    {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                      ? String(value)
                      : JSON.stringify(value, null, 2)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Recordings & transcripts</h2>
            <p className="mt-1 text-small text-mutedText">
              When a recording finishes, the file is uploaded to Supabase Storage and listed here with transcript links.
            </p>
            {session.recordings.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-background px-4 py-6 text-center text-small text-mutedText">
                No recordings yet. Start recording after you join the session to create the first one.
              </div>
            )}
            {session.recordings.length > 0 && (
              <ul className="mt-4 space-y-3">
                {session.recordings.map((recording) => (
                  <li
                    key={recording.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-small sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">Recording • {formatIso(recording.createdAt)}</p>
                      <p className="text-mutedText">
                        Duration: {recording.durationSeconds ? `${recording.durationSeconds}s` : 'pending'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge size="xs" variant={recording.transcriptPath ? 'success' : 'subtle'}>
                        {recording.transcriptPath ? 'Transcript ready' : 'Transcript pending'}
                      </Badge>
                      <span className="text-caption text-mutedText break-all">{recording.storagePath}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = withPlan('starter')(async (ctx) => {
  const idValue = typeof ctx.params?.id === 'string' ? ctx.params.id : Array.isArray(ctx.params?.id) ? ctx.params?.id[0] : undefined;
  const parsed = ParamsSchema.safeParse({ id: idValue });
  if (!parsed.success) {
    return { notFound: true };
  }

  const supabase = supabaseServer(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl ?? '/')}`,
        permanent: false,
      },
    };
  }

  const sessionId = parsed.data.id;

  const { data: session, error: sessionError } = await supabase
    .from('speaking_sessions')
    .select(
      'id, host_user_id, participant_user_id, type, status, scheduled_at, started_at, ended_at, metadata, created_at, updated_at',
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return { notFound: true };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const viewerRole = (profile?.role as string | null) ?? null;
  const isStaff = viewerRole === 'teacher' || viewerRole === 'admin';
  const isParticipant = session.host_user_id === user.id || session.participant_user_id === user.id;

  if (!isStaff && !isParticipant) {
    return { notFound: true };
  }

  const { data: recordings } = await supabase
    .from('session_recordings')
    .select('id, storage_path, transcript_path, duration_seconds, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  return {
    props: {
      session: {
        id: session.id,
        type: session.type as LiveSessionType,
        status: session.status as LiveSessionStatus,
        scheduledAt: session.scheduled_at,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        metadata: session.metadata ?? {},
        hostUserId: session.host_user_id,
        participantUserId: session.participant_user_id ?? null,
        recordings:
          recordings?.map((item) => ({
            id: item.id,
            storagePath: item.storage_path,
            transcriptPath: item.transcript_path ?? null,
            durationSeconds: item.duration_seconds ?? null,
            createdAt: item.created_at,
          })) ?? [],
      },
      viewer: {
        id: user.id,
        role: viewerRole,
      },
      token: null,
    },
  };
});

export default LiveSessionPage;
