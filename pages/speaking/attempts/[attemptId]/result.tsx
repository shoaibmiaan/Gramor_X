import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { ScoreCard } from '@/components/design-system/ScoreCard';
import { Loader } from '@/components/common/Loader';

interface Breakdown {
  fluency?: number | null;
  lexical?: number | null;
  grammar?: number | null;
  pronunciation?: number | null;
}

interface AttemptResult {
  id: string;
  section: string | null;
  createdAt: string | null;
  durationSec: number | null;
  topic: string | null;
  points: string[] | null;
  transcript: string | null;
  feedback: string | null;
  overall: number | null;
  breakdown: Breakdown | null;
  audioPaths: string[];
}

type ApiResponse =
  | { ok: true; attempt: AttemptResult }
  | { ok: false; error: string };

function formatSection(section: string | null) {
  if (!section) return 'Unknown section';
  const normalized = section.toLowerCase();
  if (normalized.startsWith('part')) {
    const part = normalized.replace('part', '').trim();
    return `Part ${part}`;
  }
  if (normalized === 'p1') return 'Part 1';
  if (normalized === 'p2') return 'Part 2';
  if (normalized === 'p3') return 'Part 3';
  return section;
}

function formatDuration(sec: number | null) {
  if (!sec || sec <= 0) return null;
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function SpeakingAttemptResultPage() {
  const router = useRouter();
  const attemptIdParam = router.query.attemptId;
  const attemptId = typeof attemptIdParam === 'string' ? attemptIdParam : undefined;

  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/speaking/attempts/${attemptId}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to load attempt');
        }
        return res.json() as Promise<ApiResponse>;
      })
      .then((json) => {
        if (!active) return;
        if (!json.ok) {
          throw new Error(json.error || 'Failed to load attempt');
        }
        setAttempt(json.attempt);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load attempt');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attemptId]);

  const audioKey = useMemo(() => (attempt?.audioPaths ?? []).join('|'), [attempt?.audioPaths]);

  useEffect(() => {
    if (!attempt || attempt.audioPaths.length === 0) {
      setAudioUrls([]);
      setAudioLoading(false);
      setAudioError(null);
      return;
    }

    let active = true;
    setAudioLoading(true);
    setAudioError(null);

    Promise.all(
      attempt.audioPaths.map(async (path) => {
        const res = await fetch('/api/speaking/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: attempt.id, path }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to prepare audio');
        }
        const payload = (await res.json()) as { url?: string };
        if (!payload?.url) throw new Error('Missing audio URL');
        return payload.url;
      }),
    )
      .then((urls) => {
        if (!active) return;
        setAudioUrls(urls);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAudioError(err instanceof Error ? err.message : 'Could not load audio');
        setAudioUrls([]);
      })
      .finally(() => {
        if (active) setAudioLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt?.id, audioKey]);

  const breakdown = attempt?.breakdown ?? null;

  return (
    <>
      <Head>
        <title>Speaking Result</title>
      </Head>
      <Container className="py-10">
        <div className="mb-4">
          <Link href="/speaking/attempts" className="text-small text-electricBlue hover:underline">
            ← Back to attempts
          </Link>
        </div>

        {loading ? (
          <Card className="p-6">
            <Loader label="Loading speaking result…" />
          </Card>
        ) : error ? (
          <Alert variant="error" title="Unable to load attempt">
            <p className="mt-1 text-body text-muted-foreground">{error}</p>
          </Alert>
        ) : attempt ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-h3 font-semibold text-foreground">Speaking Result</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-small text-muted-foreground">
                      <Badge variant="info">{formatSection(attempt.section)}</Badge>
                      {formatDate(attempt.createdAt) && <span>{formatDate(attempt.createdAt)}</span>}
                      {formatDuration(attempt.durationSec) && (
                        <span>Duration: {formatDuration(attempt.durationSec)}</span>
                      )}
                    </div>
                  </div>
                  <Button as={Link} href={`/speaking/review/${attempt.id}`} variant="secondary">
                    Open detailed review
                  </Button>
                </div>

                {attempt.topic && (
                  <div>
                    <h2 className="text-h5 font-semibold text-foreground">Topic</h2>
                    <p className="mt-1 text-body text-foreground/80">{attempt.topic}</p>
                  </div>
                )}

                {attempt.points && attempt.points.length > 0 && (
                  <div>
                    <h3 className="text-h6 font-semibold text-foreground">Key points</h3>
                    <ul className="mt-2 list-disc pl-5 text-body text-foreground/80">
                      {attempt.points.map((point, idx) => (
                        <li key={`${idx}-${point.slice(0, 10)}`}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.feedback && (
                  <div>
                    <h3 className="text-h6 font-semibold text-foreground">AI feedback</h3>
                    <p className="mt-2 whitespace-pre-wrap text-body leading-relaxed text-foreground/80">
                      {attempt.feedback}
                    </p>
                  </div>
                )}

                {attempt.transcript && (
                  <div>
                    <h3 className="text-h6 font-semibold text-foreground">Transcript</h3>
                    <p className="mt-2 whitespace-pre-wrap text-body leading-relaxed text-foreground/80">
                      {attempt.transcript}
                    </p>
                  </div>
                )}
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-h5 font-semibold text-foreground">Your recording</h2>
                  {audioLoading && <Loader label="Preparing audio…" />}
                </div>

                {audioError && (
                  <Alert variant="warning" className="text-body">
                    {audioError}
                  </Alert>
                )}

                {!audioLoading && audioUrls.length === 0 && !audioError ? (
                  <p className="text-body text-muted-foreground">No audio available for this attempt.</p>
                ) : null}

                {audioUrls.length > 0 && (
                  <div className="space-y-4">
                    {audioUrls.map((url, index) => (
                      <div key={url} className="space-y-1">
                        <div className="text-small font-medium text-muted-foreground">
                          Clip {index + 1}
                        </div>
                        <audio controls preload="none" className="w-full">
                          <source src={url} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              {attempt.overall != null ? (
                <ScoreCard
                  overall={attempt.overall}
                  subscores={
                    breakdown
                      ? {
                          fluency: breakdown.fluency ?? undefined,
                          lexical: breakdown.lexical ?? undefined,
                          grammar: breakdown.grammar ?? undefined,
                          pronunciation: breakdown.pronunciation ?? undefined,
                        }
                      : undefined
                  }
                  className="w-full"
                />
              ) : (
                <Card className="p-6">
                  <h2 className="text-h5 font-semibold text-foreground">Score pending</h2>
                  <p className="mt-2 text-body text-muted-foreground">
                    We are still processing this attempt. Check back in a few minutes.
                  </p>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="text-h6 font-semibold text-foreground">Need more practice?</h3>
                <p className="mt-2 text-body text-muted-foreground">
                  Run another speaking simulation to keep improving your fluency and confidence.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button as={Link} href="/speaking/simulator" variant="primary">
                    Open simulator
                  </Button>
                  <Button as={Link} href="/speaking/practice" variant="secondary">
                    Practice hub
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <Alert variant="info">Attempt not found.</Alert>
        )}
      </Container>
    </>
  );
}
