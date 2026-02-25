import { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Textarea } from '@/components/design-system/Textarea';
import { FeedbackRadial } from '@/components/speaking/FeedbackRadial';
import { IPAHeatmap } from '@/components/speaking/IPAHeatmap';
import { Recorder } from '@/components/speaking/Recorder';
import { WordTimeline } from '@/components/speaking/WordTimeline';
import { CoachTips } from '@/components/speaking/CoachTips';
import exercises from '@/data/speaking/exercises.json';
import { track } from '@/lib/analytics/track';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/plan/withPlan';
import type { PhonemeScore, ScoreAudioResult, WordScore } from '@/lib/speaking/scoreAudio';

interface PromptCard {
  slug: string;
  prompt: string;
  level: string;
}

interface PageProps {
  prompts: PromptCard[];
}

type RecorderPayload = {
  blob: Blob;
  durationMs: number;
  waveform: number[];
  url: string;
};

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

export const getServerSideProps: GetServerSideProps<PageProps> = withPlan('starter')(async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/speaking/coach/free',
        permanent: false,
      },
    };
  }

  const promptCards = (exercises as PromptCard[]).filter((exercise) => exercise.slug.startsWith('cuecard-'));

  const queryText = typeof ctx.query.text === 'string' ? ctx.query.text.trim() : '';
  const querySlug = typeof ctx.query.promptSlug === 'string' ? ctx.query.promptSlug : 'library';
  if (queryText) {
    promptCards.unshift({ slug: `library-${querySlug}`, prompt: queryText, level: 'custom' });
  }

  return {
    props: {
      prompts: promptCards.slice(0, 10),
    },
  };
});

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

const FreeCoachPage = ({ prompts }: PageProps) => {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [recorderPayload, setRecorderPayload] = useState<RecorderPayload | null>(null);
  const [feedback, setFeedback] = useState<ScoreResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'scoring' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const prompt = prompts[selectedPromptIndex];

  const rotatePrompt = () => {
    setSelectedPromptIndex((index) => (index + 1) % prompts.length);
    setNotes('');
    setFeedback(null);
    setRecorderPayload(null);
    setStatus('idle');
    setError(null);
  };

  const handleComplete = useCallback((payload: RecorderPayload) => {
    setRecorderPayload(payload);
    setFeedback(null);
    setStatus('idle');
    setError(null);
  }, []);

  const submitRecording = useCallback(async () => {
    if (!recorderPayload) return;
    try {
      setStatus('uploading');
      setError(null);
      track('speaking_attempt_started', {
        exercise_slug: 'free_speech',
        ref_type: 'free_speech',
      });

      const uploadRes = await fetch('/api/speaking/coach/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refType: 'free_speech',
          refText: notes || prompt.prompt,
          durationMs: recorderPayload.durationMs,
          audioB64: await blobToBase64(recorderPayload.blob),
        }),
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
        exercise_slug: 'free_speech',
        band_estimate: scorePayload.overall.band,
        wpm: scorePayload.overall.wpm,
        weak_ipa: scorePayload.weakIPA.join(','),
      });
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Something went wrong. Please try again.');
    }
  }, [notes, prompt.prompt, recorderPayload]);

  const promptTags = useMemo(() => prompt.prompt.split(' ').slice(0, 3), [prompt.prompt]);

  return (
    <>
      <Head>
        <title>Free speech coach · Pronunciation</title>
      </Head>
      <Container className="py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Badge variant="info" size="sm">
                Cue card practice · Level {prompt.level}
              </Badge>
              <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{prompt.prompt}</h1>
              <p className="text-sm text-muted-foreground">
                Speak for two minutes. Use the notes panel to jot key points before recording.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {promptTags.map((tag) => (
                  <Badge key={tag} variant="neutral" size="xs">
                    {tag.toLowerCase()}
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={rotatePrompt}>
                Try another cue card
              </Button>
            </div>
            <Card className="w-full max-w-sm space-y-3 p-5">
              <h2 className="text-base font-semibold text-foreground">Preparation notes</h2>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Brainstorm ideas, transitions, and vocabulary you want to use."
                rows={6}
              />
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-4">
              <Recorder maxDurationMs={150_000} onComplete={handleComplete} />
              <div className="flex gap-3">
                <Button onClick={submitRecording} disabled={!recorderPayload} loading={status === 'uploading' || status === 'scoring'}>
                  {status === 'scoring' ? 'Scoring...' : status === 'uploading' ? 'Uploading...' : 'Submit for feedback'}
                </Button>
                <Button variant="ghost" tone="secondary" href="/speaking/coach">
                  Back to dashboard
                </Button>
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
                Submit a recording to unlock personalised feedback and weak-sound drills.
              </Card>
            )}
          </section>
        </div>
      </Container>
    </>
  );
};

export default FreeCoachPage;
