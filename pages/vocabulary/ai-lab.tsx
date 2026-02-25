// pages/vocabulary/ai-lab.tsx
'use client';

import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import Icon from '@/components/design-system/Icon';

type RewriteResponse = {
  improved: string;
  explanation?: string;
  keyPhrases?: string[];
};

const EXAMPLE_SENTENCE =
  'A lot of people travel abroad these days because it is easier and cheaper than before.';

const VocabularyAiLabPage: NextPage = () => {
  const [input, setInput] = useState<string>('');
  const [bandTarget, setBandTarget] = useState<'6.0' | '6.5' | '7.0' | '7.5' | '8.0'>('7.0');
  const [module, setModule] = useState<'writing' | 'speaking'>('writing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUseExample = () => {
    setInput(EXAMPLE_SENTENCE);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('Paste a sentence or short paragraph first.');
      setResult(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // TODO: implement this backend route in pages/api/ai/vocab/rewrite.ts
      const res = await fetch('/api/ai/vocab/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: input,
          bandTarget,
          module, // 'writing' or 'speaking'
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Something went wrong.');
      }

      const data = (await res.json()) as RewriteResponse;
      setResult({
        improved: data.improved,
        explanation: data.explanation,
        keyPhrases: data.keyPhrases ?? [],
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[ai-lab] rewrite error', err);
      setError(
        err?.message || 'Could not rewrite this sentence. Try again in a few seconds.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Vocabulary Lab — Gramor_X</title>
      </Head>
      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="space-y-10">
            {/* HEADER */}
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge size="sm" variant="accent">
                  AI Rewrite Lab
                </Badge>
                <Badge size="sm" variant="neutral">
                  Writing & Speaking
                </Badge>
              </div>
              <div className="space-y-2">
                <h1 className="font-slab text-display">
                  Upgrade your sentences to band 7+ vocabulary.
                </h1>
                <p className="max-w-2xl text-body text-grayish">
                  Paste a sentence or short paragraph. AI will rewrite it with more precise,
                  academic vocabulary while keeping your original meaning.
                </p>
              </div>
              <Alert variant="info">
                <div className="flex flex-col gap-1 text-sm">
                  <span>
                    Use this for{' '}
                    <span className="font-semibold">
                      Writing Task 1, Writing Task 2, and Speaking answers
                    </span>
                    . Don’t spam full essays — focus on individual sentences and short
                    paragraphs.
                  </span>
                </div>
              </Alert>
            </header>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {/* LEFT: INPUT + CONTROLS */}
              <Card className="space-y-6 rounded-ds-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="font-slab text-h2">Your text</h2>
                    <p className="text-sm text-muted-foreground">
                      Paste one or a few sentences that you want to sound more “band 7+”.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-ds-xl"
                    type="button"
                    onClick={handleUseExample}
                  >
                    Use example sentence
                  </Button>
                </div>

                <div>
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setError(null);
                      setResult(null);
                    }}
                    rows={6}
                    className="w-full resize-none rounded-ds-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Paste your sentence or short paragraph here…"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Tip: Keep it under 2–3 sentences for the cleanest rewrite.</span>
                    <span>{input.length}/800 chars</span>
                  </div>
                </div>

                {/* CONTROLS */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-ds-2xl bg-muted/40 px-4 py-3">
                  {/* Band target */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="font-medium text-foreground">Target band:</span>
                    <div className="flex flex-wrap gap-1">
                      {(['6.0', '6.5', '7.0', '7.5', '8.0'] as const).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBandTarget(b)}
                          className={[
                            'rounded-full px-2.5 py-1 text-xs font-medium transition',
                            bandTarget === b
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-background text-muted-foreground hover:bg-card',
                          ].join(' ')}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Module */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="font-medium text-foreground">Module:</span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setModule('writing')}
                        className={[
                          'rounded-full px-2.5 py-1 text-xs font-medium transition',
                          module === 'writing'
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-background text-muted-foreground hover:bg-card',
                        ].join(' ')}
                      >
                        Writing
                      </button>
                      <button
                        type="button"
                        onClick={() => setModule('speaking')}
                        className={[
                          'rounded-full px-2.5 py-1 text-xs font-medium transition',
                          module === 'speaking'
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-background text-muted-foreground hover:bg-card',
                        ].join(' ')}
                      >
                        Speaking
                      </button>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON + ERROR */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !input.trim()}
                    className="w-full rounded-ds-xl"
                    variant="primary"
                    leadingIcon={<Icon name="Sparkles" size={16} />}
                  >
                    {isSubmitting ? 'Rewriting…' : 'Rewrite with better vocabulary'}
                  </Button>
                  {error && (
                    <Alert variant="danger">
                      <span className="text-sm">{error}</span>
                    </Alert>
                  )}
                  {!error && !result && !isSubmitting && (
                    <p className="text-xs text-muted-foreground">
                      After the rewrite, you’ll see:
                      <span className="font-medium">
                        {' '}
                        upgraded sentence, explanation, and key phrases
                      </span>
                      .
                    </p>
                  )}
                </div>
              </Card>

              {/* RIGHT: RESULT */}
              <div className="space-y-4">
                <Card className="space-y-4 rounded-ds-2xl p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-slab text-h2">AI rewrite</h2>
                    <Badge size="sm" variant="neutral">
                      Beta
                    </Badge>
                  </div>

                  {!result && !isSubmitting && (
                    <p className="text-sm text-muted-foreground">
                      Rewrite result will appear here. Paste a sentence on the left and hit{' '}
                      <span className="font-medium">“Rewrite with better vocabulary”</span>.
                    </p>
                  )}

                  {isSubmitting && (
                    <div className="space-y-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-border/70" />
                      <div className="h-24 w-full animate-pulse rounded bg-border/70" />
                      <div className="h-3 w-40 animate-pulse rounded bg-border/70" />
                    </div>
                  )}

                  {result && !isSubmitting && (
                    <div className="space-y-6">
                      {/* Improved text */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon name="ArrowUpRight" size={16} />
                          </span>
                          <h3 className="text-sm font-semibold text-foreground">
                            Improved version
                          </h3>
                        </div>
                        <p className="rounded-ds-2xl border border-border/60 bg-card/70 p-3 text-sm leading-relaxed text-foreground">
                          {result.improved}
                        </p>
                      </div>

                      {/* Explanation */}
                      {result.explanation && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                              <Icon name="Sparkles" size={16} />
                            </span>
                            <h3 className="text-sm font-semibold text-foreground">
                              Why this is better
                            </h3>
                          </div>
                          <p className="rounded-ds-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
                            {result.explanation}
                          </p>
                        </div>
                      )}

                      {/* Key phrases */}
                      {result.keyPhrases && result.keyPhrases.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-electricBlue/10 text-electricBlue">
                              <Icon name="Highlighter" size={16} />
                            </span>
                            <h3 className="text-sm font-semibold text-foreground">
                              Key phrases to steal
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.keyPhrases.map((phrase) => (
                              <Badge
                                key={phrase}
                                size="xs"
                                variant="soft"
                                className="whitespace-normal text-left"
                              >
                                {phrase}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Hints card */}
                <Card className="space-y-3 rounded-ds-2xl p-5">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground">
                      <Icon name="Info" size={14} />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        How to use this without sounding fake
                      </h3>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground">
                        <li>Don’t copy-paste blindly — tweak the sentence so it still feels like you.</li>
                        <li>
                          For Speaking, keep it natural. Don’t push it to full band 9 vocabulary if
                          you can’t say it smoothly.
                        </li>
                        <li>
                          For Writing, focus on clarity first, then upgrade a few key words or
                          phrases.
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default VocabularyAiLabPage;
