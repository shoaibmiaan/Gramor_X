import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import calibration from '@/data/writing/review-calibration';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlanPage } from '@/lib/withPlanPage';

interface CalibrationAnchor {
  id: string;
  taskType: string;
  prompt: string;
  band: number;
  essay: string;
  rubric: Record<string, string>;
}

interface CalibrationPageProps {
  anchors: CalibrationAnchor[];
}

const CalibrationPage = ({ anchors }: CalibrationPageProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const [firstAnchor] = anchors;
      const response = await fetch('/api/writing/reviews/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anchorId: firstAnchor.id,
          ratings: { TR: 7, CC: 7, LR: 7, GRA: 7 },
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to record calibration');
      }
      setComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record calibration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Peer review calibration • Writing studio</title>
      </Head>
      <Container className="py-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Peer review calibration</h1>
            <p className="text-sm text-muted-foreground">
              Score two anchored essays to align with Gramor feedback standards. Once complete, you can submit peer reviews on any attempt.
            </p>
          </header>

          {anchors.map((anchor) => (
            <Card key={anchor.id} className="space-y-4" padding="lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="soft" tone="info" size="sm" className="capitalize">
                  {anchor.taskType}
                </Badge>
                <Badge variant="soft" tone="success" size="sm">
                  Band {anchor.band.toFixed(1)}
                </Badge>
              </div>
              <h2 className="text-xl font-semibold text-foreground">{anchor.prompt}</h2>
              <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="whitespace-pre-line text-sm text-muted-foreground">{anchor.essay}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Rubric highlights</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {Object.entries(anchor.rubric).map(([criterion, note]) => (
                    <li key={criterion} className="flex items-start gap-2">
                      <Badge variant="soft" tone="default" size="xs">
                        {criterion}
                      </Badge>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}

          <Card className="space-y-3" padding="lg">
            <h2 className="text-lg font-semibold text-foreground">Confirm alignment</h2>
            <p className="text-sm text-muted-foreground">
              When you understand the scoring rationale above, record your calibration to unlock peer feedback tools.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSubmit} loading={submitting} disabled={complete}>
                {complete ? 'Calibration recorded' : 'Mark calibration complete'}
              </Button>
              <Button size="sm" variant="outline" href="/writing/review">
                Back to reviews
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<CalibrationPageProps> = withPlanPage('starter')(async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/writing',
        permanent: false,
      },
    };
  }

  return {
    props: {
      anchors: calibration as CalibrationAnchor[],
    },
  };
});

export default CalibrationPage;
