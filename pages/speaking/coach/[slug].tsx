import { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { FeedbackRadial } from '@/components/speaking/FeedbackRadial';
import { IPAHeatmap } from '@/components/speaking/IPAHeatmap';
import { Recorder } from '@/components/speaking/Recorder';
import { WordTimeline } from '@/components/speaking/WordTimeline';
import { CoachTips } from '@/components/speaking/CoachTips';
import exercises from '@/data/speaking/exercises.json';
import { track } from '@/lib/analytics/track';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlanPage } from '@/lib/withPlanPage';
import type { PhonemeScore, ScoreAudioResult, WordScore } from '@/lib/speaking/scoreAudio';

interface ExerciseDetail {
  id: string;
  slug: string;
  prompt: string;
  level: string;
  type: string;
  ipa: string | null;
  targetWpm: number | null;
  tags: string[];
  tip?: string;
}

interface PastAttempt {
  id: string;
  createdAt: string;
  overall: {
    pron: number | null;
    intonation: number | null;
    stress: number | null;
    fluency: number | null;
    band: number | null;
    wpm: number | null;
    fillers: number | null;
  };
}

interface PageProps {
  exercise: ExerciseDetail;
  attempts: PastAttempt[];
}

type UploadResponse = {
  attemptId: string;
};

type ScoreResponse = {
  attemptId: string;
  overall: ScoreAudioResult['overall'];
  weakIPA: string[];
  words: WordScore[];
  phonemes: PhonemeScore[];
};

type RecorderPayload = {
  blob: Blob;
  durationMs: number;
  waveform: number[];
  url: string;
};

export const getServerSideProps: GetServerSideProps<PageProps> = withPlanPage('starter')(async (ctx) => {
  const { slug } = ctx.params as { slug: string };
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/speaking/coach',
        permanent: false,
      },
    };
  }

  const { data: exerciseRow, error: exerciseError } = await supabase
    .from('speaking_exercises')
    .select('id, slug, prompt, level, type, ipa, target_wpm, tags')
    .eq('slug', slug)
    .maybeSingle();

  if (exerciseError) {
    throw exerciseError;
  }

  if (!exerciseRow) {
    return { notFound: true };
  }

  const { data: attemptsData } = await supabase
    .from('speaking_attempts')
    .select('id, created_at, overall_pron, overall_intonation, overall_stress, overall_fluency, band_estimate, wpm, fillers_count')
    .eq('user_id', user.id)
    .eq('exercise_id', exerciseRow.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const tipRecord = (exercises as ExerciseDetail[]).find((item) => item.slug === exerciseRow.slug);

  return {
    props: {
      exercise: {
        id: exerciseRow.id,
        slug: exerciseRow.slug,
        prompt: exerciseRow.prompt,
        level: exerciseRow.level,
        type: exerciseRow.type,
        ipa: exerciseRow.ipa,
        targetWpm: exerciseRow.target_wpm,
        tags: exerciseRow.tags ?? [],
        tip: tipRecord?.tip,
      },
      attempts: (attemptsData ?? []).map((attempt) => ({
        id: attempt.id,
        createdAt: attempt.created_at,
        overall: {
          pron: attempt.overall_pron,
          intonation: attempt.overall_intonation,
          stress: attempt.overall_stress,
          fluency: attempt.overall_fluency,
          band: attempt.band_estimate,
          wpm: attempt.wpm,
          fillers: attempt.fillers_count,
        },
      })),
    },
  };
});

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(iso));
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

const DrillPage = ({ exercise, attempts }: PageProps) => {
  const [recorderPayload, setRecorderPayload] = useState<RecorderPayload | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'scoring' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScoreResponse | null>(null);
  const [history, setHistory] = useState<PastAttempt[]>(attempts);

  const latest = history[0];

  const handleComplete = useCallback((payload: RecorderPayload) => {
    setRecorderPayload(payload);
    setError(null);
    setFeedback(null);
    setStatus('idle');
  }, []);

  const submitRecording = useCallback(async () => {
    if (!recorderPayload) return;
    try {
      setStatus('uploading');
      setError(null);
      track('speaking_attempt_started', {
        exercise_slug: exercise.slug,
        ref_type: 'exercise',
      });

      const body = {
        refType: 'exercise',
        exerciseSlug: exercise.slug,
        durationMs: recorderPayload.durationMs,
        audioB64: await blobToBase64(recorderPayload.blob),
      };

      const uploadRes = await fetch('/api/speaking/coach/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!uploadRes.ok) {
        const info = await uploadRes.json().catch(() => ({}));
        throw new Error(info.error ?? 'Upload failed');
      }

      const uploadPayload = (await uploadRes.json()) as UploadResponse;
      setStatus('scoring');

      const scoreRes = await fetch('/api/speaking/coach/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: uploadPayload.attemptId }),
      });

      if (!scoreRes.ok) {
        const info = await scoreRes.json().catch(() => ({}));
        throw new Error(info.error ?? 'Scoring failed');
      }

      const scorePayload = (await scoreRes.json()) as ScoreResponse;
      setFeedback(scorePayload);
      setStatus('complete');

      track('speaking_attempt_scored', {
        exercise_slug: exercise.slug,
        band_estimate: scorePayload.overall.band,
        wpm: scorePayload.overall.wpm,
        weak_ipa: scorePayload.weakIPA.join(','),
      });

      setHistory((prev) => [
        {
          id: scorePayload.attemptId,
          createdAt: new Date().toISOString(),
          overall: {
            pron: scorePayload.overall.pron,
            intonation: scorePayload.overall.intonation,
            stress: scorePayload.overall.stress,
            fluency: scorePayload.overall.fluency,
            band: scorePayload.overall.band,
            wpm: scorePayload.overall.wpm,
            fillers: scorePayload.overall.fillers,
          },
        },
        ...prev,
      ]);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Something went wrong. Please try again.');
    }
  }, [exercise.slug, recorderPayload]);

  const improvement = useMemo(() => {
    if (history.length < 2) return null;
    const [current, previous] = history;
    if (!current || !previous) return null;
    return {
      pron: current.overall.pron != null && previous.overall.pron != null ? current.overall.pron - previous.overall.pron : null,
      fluency:
        current.overall.fluency != null && previous.overall.fluency != null
          ? current.overall.fluency - previous.overall.fluency
          : null,
      band:
        current.overall.band != null && previous.overall.band != null ? current.overall.band - previous.overall.band : null,
    };
  }, [history]);

  return (
    <>
      <Head>
        <title>{exercise.prompt} · Pronunciation coach</title>
      </Head>
      <Container className="py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Badge variant="info" size="sm">
                {exercise.level} · {exercise.type}
              </Badge>
              <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{exercise.prompt}</h1>
              <p className="text-sm text-muted-foreground">
                Target band-ready delivery by matching the model pronunciation and intonation.{' '}
                {exercise.targetWpm ? `Aim for ~${exercise.targetWpm} wpm.` : 'Focus on crisp articulation and steady pace.'}
              </p>
              {exercise.tip && <p className="text-sm text-muted-foreground">Tip: {exercise.tip}</p>}
            </div>
            <Card className="w-full max-w-sm space-y-3 p-5">
              <h2 className="text-base font-semibold text-foreground">Latest performance</h2>
              {latest ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Band estimate</p>
                    <p className="text-2xl font-semibold text-foreground">{latest.overall.band?.toFixed(1) ?? '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Pron</p>
                      <span className="text-foreground">{latest.overall.pron?.toFixed(2) ?? '—'}</span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Fluency</p>
                      <span className="text-foreground">{latest.overall.fluency?.toFixed(2) ?? '—'}</span>
                    </div>
                  </div>
                  {improvement && (
                    <div className="rounded-ds-xl bg-success/10 p-3 text-xs text-success">
                      <p>Δ band {improvement.band ? improvement.band.toFixed(2) : '—'}</p>
                      <p>Δ pron {improvement.pron ? improvement.pron.toFixed(2) : '—'}</p>
                      <p>Δ fluency {improvement.fluency ? improvement.fluency.toFixed(2) : '—'}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Last attempt {latest ? formatTimestamp(latest.createdAt) : '—'}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attempts yet—record to unlock insights.</p>
              )}
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-4">
              <Recorder maxDurationMs={exercise.type === 'cue_card' ? 150_000 : 120_000} onComplete={handleComplete} />
              <div className="flex gap-3">
                <Button onClick={submitRecording} disabled={!recorderPayload} loading={status === 'uploading' || status === 'scoring'}>
                  {status === 'scoring' ? 'Scoring...' : status === 'uploading' ? 'Uploading...' : 'Submit for feedback'}
                </Button>
                <Button variant="ghost" tone="secondary" href="/speaking/coach">Back to dashboard</Button>
              </div>
              {error && (
                <p className="rounded-ds-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </div>

            {feedback ? (
              <div className="space-y-4">
                <FeedbackRadial overall={feedback.overall} />
                <IPAHeatmap phonemes={feedback.phonemes} weakTargets={feedback.weakIPA} />
                <WordTimeline words={feedback.words} />
                <CoachTips ipaTargets={feedback.weakIPA} />
              </div>
            ) : (
              <Card className="flex min-h-[320px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Submit a recording to unlock personalised feedback, phoneme heatmaps, and next-action tips.
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Attempt history</h2>
            {history.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">No history yet. Your attempts will appear here after scoring.</p>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {history.slice(0, 6).map((attempt) => (
                  <Card key={attempt.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Band {attempt.overall.band?.toFixed(1) ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(attempt.createdAt)}</p>
                      </div>
                      <Badge variant="info" size="sm">Pron {attempt.overall.pron?.toFixed(2) ?? '—'}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Fluency {attempt.overall.fluency?.toFixed(2) ?? '—'}</span>
                      <span>WPM {attempt.overall.wpm ?? '—'}</span>
                      <span>Fillers {attempt.overall.fillers ?? '—'}</span>
                      <span>Stress {attempt.overall.stress?.toFixed(2) ?? '—'}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </Container>
    </>
  );
};

export default DrillPage;
