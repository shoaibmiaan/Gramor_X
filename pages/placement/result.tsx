// pages/placement/result.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { GradientText } from '@/components/design-system/GradientText';
import { PREFS } from '@/lib/profile-options';

type PlacementResultPayload = {
  attemptId: string;
  bandOverall: number;
  bands: Record<'listening' | 'reading' | 'writing' | 'speaking', number>;
  guidance?: {
    overall?: string;
    bySkill?: Partial<Record<'listening' | 'reading' | 'writing' | 'speaking', string>>;
  };
  scoredAt?: string;
};

const keyByPref: Record<string, 'listening' | 'reading' | 'writing' | 'speaking'> = {
  Listening: 'listening',
  Reading: 'reading',
  Writing: 'writing',
  Speaking: 'speaking',
};

export default function PlacementResult() {
  const router = useRouter();
  const [result, setResult] = useState<PlacementResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
    const attemptId = typeof router.query.attemptId === 'string' ? router.query.attemptId : null;

    const loadResult = () => {
      if (typeof window === 'undefined') return;
      if (attemptId) {
        const exact = localStorage.getItem(`placement:result:${attemptId}`);
        if (exact) {
          setResult(JSON.parse(exact));
          setLoading(false);
          return;
        }
      }

      const latest = localStorage.getItem('placement:lastResult');
      if (latest) {
        setResult(JSON.parse(latest));
      }
      setLoading(false);
    };

    loadResult();
  }, [router.isReady, router.query.attemptId]);

  const scoredAt = useMemo(() => {
    if (!result?.scoredAt) return null;
    const d = new Date(result.scoredAt);
    return Number.isNaN(d.valueOf()) ? null : d.toLocaleString();
  }, [result?.scoredAt]);

  return (
    <>
      <Head><title>Placement Result | GramorX</title></Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <h1 className="font-slab text-display mb-3"><GradientText>Your estimated bands</GradientText></h1>
          <Card className="p-6 rounded-ds-2xl">
            {!loading && !result && (
              <Alert variant="warning" title="No placement result found" className="mb-4">
                Start a new placement attempt to generate your estimated skill bands.
              </Alert>
            )}

            <div className="grid sm:grid-cols-4 gap-4 text-center">
              {PREFS.map((s) => {
                const key = keyByPref[s];
                const score = result?.bands?.[key];
                return (
                  <div key={s} className="p-4 rounded-ds border border-lightBorder dark:border-white/10">
                    <div className="text-small opacity-80">{s}</div>
                    <div className="text-h1">{typeof score === 'number' ? score.toFixed(1) : '—'}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-body">
                <span className="opacity-80">Overall estimate: </span>
                <span className="font-semibold">{typeof result?.bandOverall === 'number' ? result.bandOverall.toFixed(1) : '—'}</span>
              </div>

              {scoredAt && <p className="text-small text-grayish">Scored: {scoredAt}</p>}

              <Card className="p-4 rounded-ds border border-lightBorder dark:border-white/10">
                <h2 className="font-semibold mb-2">Guidance</h2>
                <p className="text-body text-grayish">{result?.guidance?.overall || 'Guidance is loading or unavailable. Please retry after another attempt.'}</p>
                <ul className="mt-3 space-y-2 text-small text-grayish">
                  {(['listening', 'reading', 'writing', 'speaking'] as const).map((skill) => (
                    <li key={skill}>
                      <span className="font-medium capitalize">{skill}: </span>
                      {result?.guidance?.bySkill?.[skill] || 'Not available for this attempt.'}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <Link href="/placement/run" passHref legacyBehavior>
                <Button as="a" variant="secondary" className="rounded-ds">Retake placement</Button>
              </Link>
              <Link href="/learning" passHref legacyBehavior>
                <Button as="a" variant="primary" className="rounded-ds">See your plan</Button>
              </Link>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
