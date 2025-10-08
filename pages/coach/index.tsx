import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import BandBreakdown from '@/components/predictor/BandBreakdown';
import { percentToBand, runPredictor, type PredictorResult } from '@/lib/predictor';
import { analyzeEssay, type EssayAnalysis } from '@/lib/coach/analyzeEssay';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';

const MIN_WORDS = 80;
const coachCanonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/coach`
  : undefined;
const coachEnabled = flags.enabled('coach');

function formatNumber(value: number, fraction = 0) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fraction,
    minimumFractionDigits: fraction,
  });
}

function CoachComingSoon() {
  return (
    <>
      <Head>
        <title>Coaching coming soon</title>
        {coachCanonical ? <link rel="canonical" href={coachCanonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Personalised coaching sessions are rolling out soon. Explore live classes while we finish the experience."
        />
      </Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="max-w-2xl mx-auto space-y-5 p-6 rounded-ds-2xl text-center">
            <h1 className="font-slab text-h2">Coaching is almost here</h1>
            <p className="text-body text-mutedText">
              We&apos;re putting the final polish on 1:1 coaching so that your essays get
              thoughtful, human feedback. You&apos;ll see it first in your account once it&apos;s ready.
            </p>
            <p className="text-body text-mutedText">
              In the meantime, keep building momentum with structured classes and practice plans.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/classes">Explore live classes</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/study-plan">Open your study plan</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}

function CoachExperience() {
  const [essay, setEssay] = useState('');
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const [result, setResult] = useState<PredictorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveWordCount = useMemo(() => {
    const trimmed = essay.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [essay]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = essay.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    if (words < MIN_WORDS) {
      setError(`Please enter at least ${MIN_WORDS} words.`);
      setAnalysis(null);
      setResult(null);
      return;
    }

    const computed = analyzeEssay(trimmed);
    const prediction = runPredictor(computed.predictorInput);

    setAnalysis(computed);
    setResult(prediction);
    setError(null);
  };

  const writingBands = useMemo(() => {
    if (!analysis) return null;
    return {
      task: percentToBand(analysis.writing.taskResponse),
      coherence: percentToBand(analysis.writing.coherence),
      lexical: percentToBand(analysis.writing.lexical),
      grammar: percentToBand(analysis.writing.grammar),
    };
  }, [analysis]);

  const combinedAdvice = useMemo(() => {
    if (!result || !analysis) return [] as string[];
    const merged = new Set<string>([...analysis.suggestions, ...result.advice]);
    return Array.from(merged);
  }, [analysis, result]);

  return (
    <>
      <Head>
        <title>Essay Coach</title>
      </Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <header className="max-w-3xl">
            <h1 className="text-h1 font-semibold">Essay Coach</h1>
            <p className="mt-2 text-small text-muted-foreground">
              Paste a Task 2 style response to get an instant band estimate, writing breakdown, and coaching tips.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8">
            <label className="block">
              <span className="text-small font-medium">Your essay</span>
              <textarea
                className="mt-2 h-60 w-full rounded-xl border border-border bg-background px-4 py-3 text-small leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Paste your IELTS Task 2 essay here..."
                value={essay}
                onChange={(event) => setEssay(event.target.value)}
              />
            </label>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
              <span>Word count: {liveWordCount}</span>
              <span>Minimum recommended: {MIN_WORDS} words</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                disabled={!essay.trim()}
              >
                Get feedback
              </button>
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2 text-small hover:bg-muted"
                onClick={() => {
                  setEssay('');
                  setResult(null);
                  setAnalysis(null);
                  setError(null);
                }}
              >
                Clear
              </button>
            </div>
          </form>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-small text-destructive">
              {error}
            </div>
          ) : null}

          {result && analysis ? (
            <div className="mt-10 space-y-6">
              <BandBreakdown
                overall={result.overall}
                breakdown={result.breakdown}
                confidence={result.confidence}
                className="border-border"
              />

              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <h2 className="text-h4 font-semibold">Writing breakdown</h2>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Percent scores are mapped to approximate IELTS bands using our predictor heuristics.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label="Task response"
                      percent={analysis.writing.taskResponse}
                      band={writingBands?.task ?? 0}
                    />
                    <MetricCard
                      label="Coherence & cohesion"
                      percent={analysis.writing.coherence}
                      band={writingBands?.coherence ?? 0}
                    />
                    <MetricCard
                      label="Lexical resource"
                      percent={analysis.writing.lexical}
                      band={writingBands?.lexical ?? 0}
                    />
                    <MetricCard
                      label="Grammar range"
                      percent={analysis.writing.grammar}
                      band={writingBands?.grammar ?? 0}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <h2 className="text-h4 font-semibold">Essay stats</h2>
                  <ul className="mt-3 space-y-2 text-small text-muted-foreground">
                    <li className="flex items-center justify-between gap-4">
                      <span>Word count</span>
                      <span className="font-medium text-foreground">{analysis.stats.wordCount}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>Paragraphs</span>
                      <span className="font-medium text-foreground">{analysis.stats.paragraphCount}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>Sentences</span>
                      <span className="font-medium text-foreground">{analysis.stats.sentenceCount}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>Average sentence length</span>
                      <span className="font-medium text-foreground">
                        {formatNumber(analysis.stats.averageSentenceLength, 1)} words
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>Linking phrases spotted</span>
                      <span className="font-medium text-foreground">{analysis.stats.connectorCount}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>Unique word ratio</span>
                      <span className="font-medium text-foreground">
                        {(analysis.stats.uniqueWordRatio * 100).toFixed(1)}%
                      </span>
                    </li>
                  </ul>
                </div>
              </section>

              {combinedAdvice.length ? (
                <section className="rounded-xl border border-border p-4">
                  <h2 className="text-h4 font-semibold">Coaching tips</h2>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-small text-muted-foreground">
                    {combinedAdvice.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

export default function CoachIndexPage() {
  if (!coachEnabled) {
    return <CoachComingSoon />;
  }

  return <CoachExperience />;
}

function MetricCard({ label, percent, band }: { label: string; percent: number; band: number }) {
  return (
    <div className="rounded-lg border border-lightBorder bg-card/60 p-3">
      <p className="text-caption text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-h4 font-semibold">{Math.round(percent)}%</p>
      <p className="text-caption text-muted-foreground">≈ Band {band.toFixed(1)}</p>
    </div>
  );
}

