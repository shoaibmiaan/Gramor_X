import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Input } from '@/components/design-system/Input';
import { TextareaAutosize } from '@/components/design-system/TextareaAutosize';
import type { Drill, DrillCheck } from '@/lib/writing/drills';
import { findDrillBySlug } from '@/lib/writing/drills';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/withPlan';

interface DrillPageProps {
  drill: Drill;
  completed: boolean;
}

const criteriaLabels: Record<Drill['criterion'], string> = {
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammar',
};

const renderCheck = (check: DrillCheck, showAnswers: boolean) => {
  switch (check.type) {
    case 'rewrite':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Rewrite: <span className="text-foreground">{check.input}</span></p>
          {showAnswers && (
            <p className="text-sm text-success">Model answer: {check.target}</p>
          )}
        </div>
      );
    case 'compare':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Prompt: {check.question}</p>
          {showAnswers && (
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>✅ Strong: <span className="text-success">{check.strong}</span></p>
              <p>⚠️ Weak: <span className="text-danger">{check.weak}</span></p>
            </div>
          )}
        </div>
      );
    case 'fill':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{check.question}</p>
          {showAnswers ? (
            <p className="text-sm text-success">Answer: {check.answer}</p>
          ) : (
            <Input placeholder="Type your answer" />
          )}
        </div>
      );
    case 'timer':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Set a timer for {Math.round(check.durationSeconds / 60)} minutes and complete the goal:</p>
          <p className="text-sm text-foreground font-medium">{check.goal}</p>
        </div>
      );
    case 'ordering':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Arrange these steps:</p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {check.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      );
    case 'match':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Match each item:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {check.pairs.map(([left, right]) => (
              <li key={left}>
                <span className="font-medium text-foreground">{left}</span> → {showAnswers ? right : '________'}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'wordcount':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Stay under {check.maxWords} words for this exercise.</p>
          {!showAnswers && <TextareaAutosize minRows={4} className="w-full rounded-2xl border border-border/60 bg-card px-4 py-2 text-sm text-foreground" placeholder="Draft your response here" />}
        </div>
      );
    case 'reflection':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Reflect: {check.question}</p>
          {!showAnswers && <TextareaAutosize minRows={3} className="w-full rounded-2xl border border-border/60 bg-card px-4 py-2 text-sm text-foreground" placeholder="Jot down your notes" />}
        </div>
      );
    case 'checklist':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Tick off each item:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {check.items.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Checkbox checked={showAnswers} readOnly />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
};

const DrillRunner = ({ drill, completed }: DrillPageProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/writing/drills/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: [drill.criterion, drill.slug],
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to record completion');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record completion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{drill.title} • Writing drill</title>
      </Head>
      <Container className="py-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Card className="space-y-4" padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Badge variant="soft" tone="info" size="sm">
                  {drill.criterion} • {criteriaLabels[drill.criterion]}
                </Badge>
                <h1 className="text-2xl font-semibold text-foreground">{drill.title}</h1>
                <p className="text-sm text-muted-foreground">{drill.prompt}</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                <span>{drill.durationMinutes} min</span>
                {done && <Badge variant="soft" tone="success" size="sm">Completed</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {drill.tags.map((tag) => (
                <Badge key={tag} variant="soft" tone="default" size="sm">
                  #{tag}
                </Badge>
              ))}
            </div>
            <ol className="list-decimal space-y-3 pl-6 text-sm text-muted-foreground">
              {drill.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="flex items-center justify-between">
              <Button size="sm" variant="ghost" onClick={() => setShowAnswers((prev) => !prev)}>
                {showAnswers ? 'Hide examples' : 'Show examples'}
              </Button>
              <Button size="sm" onClick={handleComplete} disabled={submitting} loading={submitting}>
                Mark drill complete
              </Button>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </Card>

          <div className="grid gap-4">
            {drill.checks.map((check, index) => (
              <Card key={index} className="space-y-3" padding="lg">
                {renderCheck(check, showAnswers)}
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<DrillPageProps> = withPlan('free')(async (ctx) => {
  const { slug } = ctx.params as { slug: string };
  const drill = findDrillBySlug(slug);
  if (!drill) {
    return { notFound: true };
  }

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

  const { data: events } = await supabase
    .from('writing_drill_events')
    .select('tags')
    .eq('user_id', user.id)
    .contains('tags', [drill.slug])
    .limit(1);

  const completed = (events ?? []).length > 0;

  return {
    props: {
      drill,
      completed,
    },
  };
});

export default DrillRunner;
