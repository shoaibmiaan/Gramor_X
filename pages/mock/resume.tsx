import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { MockCheckpoint, MockSection } from '@/lib/mock/state';
import { fetchMockCheckpoint, setMockAttemptId } from '@/lib/mock/state';

const SECTION_LABEL: Record<MockSection, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

export default function MockResumePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkpoint, setCheckpoint] = useState<MockCheckpoint | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const cp = await fetchMockCheckpoint({});
      if (!active) return;
      setCheckpoint(cp);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const remaining = useMemo(() => {
    if (!checkpoint || typeof checkpoint.duration !== 'number') return null;
    return Math.max(0, checkpoint.duration - checkpoint.elapsed);
  }, [checkpoint]);

  const canResume = checkpoint ? !checkpoint.completed : false;

  const resumeHref = useMemo(() => {
    if (!checkpoint) return '#';
    return `/mock/${checkpoint.section}/${checkpoint.mockId}`;
  }, [checkpoint]);

  const handleResume = useCallback(async () => {
    if (!checkpoint || !canResume) return;
    setMockAttemptId(checkpoint.section, checkpoint.mockId, checkpoint.attemptId);
    await router.push(resumeHref);
  }, [checkpoint, router, resumeHref, canResume]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-h3 font-semibold">Resume mock test</h1>
          <p className="text-small text-foreground/80">
            Pick up where you left off. We keep your progress synced so timers and answers stay accurate across devices.
          </p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-border bg-background/60 p-6 text-small text-foreground/70">
            Checking for saved progress…
          </div>
        )}

        {!loading && !checkpoint && (
          <div className="rounded-2xl border border-border bg-background/60 p-6">
            <p className="text-small text-foreground/80">
              You don&apos;t have any saved mock attempts. Start a new test from the mock library to create one.
            </p>
            <div className="mt-4">
              <Link href="/mock" className="text-small underline underline-offset-4">
                Browse mock tests
              </Link>
            </div>
          </div>
        )}

        {!loading && checkpoint && (
          <div className="rounded-2xl border border-border bg-background/60 p-6">
            <div className="mb-4 flex flex-col gap-1">
              <span className="text-caption uppercase tracking-wide text-foreground/60">Latest checkpoint</span>
              <span className="text-body font-semibold">{SECTION_LABEL[checkpoint.section]} section</span>
              <span className="text-small text-foreground/70">
                Saved {new Date(checkpoint.updatedAt).toLocaleString()}
              </span>
            </div>
            <dl className="grid gap-2 text-small text-foreground/80">
              <div className="flex items-center justify-between">
                <dt>Mock ID</dt>
                <dd className="font-mono text-foreground/90">{checkpoint.mockId}</dd>
              </div>
              {remaining !== null && (
                <div className="flex items-center justify-between">
                  <dt>Time remaining</dt>
                  <dd>{formatDuration(remaining)}</dd>
                </div>
              )}
              {checkpoint.completed && (
                <div className="flex items-center justify-between text-foreground/70">
                  <dt>Status</dt>
                  <dd>Completed</dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResume}
                disabled={!canResume}
                className="rounded-xl bg-primary px-4 py-2 font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canResume ? 'Continue' : 'Start a new attempt'}
              </button>
              <Link href="/mock" className="text-small underline underline-offset-4">
                Start a different test
              </Link>
            </div>
            {!canResume && (
              <p className="mt-3 text-caption text-foreground/70">
                This attempt has been submitted already. Start a new test from the mock library to practice again.
              </p>
            )}
            {canResume && (
              <div className="mt-6 rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                <p className="font-semibold text-amber-100">Exam day reminder</p>
                <p className="mt-1">
                  We&apos;ll restore your timer and answers from this checkpoint. Before you resume, double-check your device,
                  connection, and quiet environment so you don&apos;t lose time mid-section.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
