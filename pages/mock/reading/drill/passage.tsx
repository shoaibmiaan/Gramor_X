// pages/mock/reading/drill/passage.tsx
import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';
import type { ReadingPassage, ReadingQuestion } from '@/lib/reading/types';
import { ReadingPassagePane } from '@/components/reading/ReadingPassagePane';
import { ReadingQuestionItem } from '@/components/reading/ReadingQuestionItem';

type PageProps = {
  passage: ReadingPassage | null;
  questions: ReadingQuestion[];
};

const PassageDrillPage: NextPage<PageProps> = ({ passage, questions }) => {
  const [answers, setAnswers] = React.useState<Record<string, string | string[] | null>>({});

  if (!passage) {
    return (
      <>
        <Head>
          <title>Passage Drill · GramorX</title>
        </Head>
        <section className="py-16">
          <Container className="max-w-3xl">
            <Card className="p-6 text-sm text-muted-foreground">
              No passage found for this drill.
            </Card>
          </Container>
        </section>
      </>
    );
  }

  const handleChange = (questionId: string, val: string | string[] | null) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  return (
    <>
      <Head>
        <title>Passage Drill – Passage {passage.passageOrder} · GramorX</title>
      </Head>

      <section className="py-8 bg-background">
        <Container className="max-w-4xl space-y-4">
          <Card className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="book-open" className="h-4 w-4" />
                Passage drill
              </span>
              <h1 className="text-lg font-semibold tracking-tight">
                Passage {passage.passageOrder}
                {passage.title ? `: ${passage.title}` : ''}
              </h1>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/mock/reading">
                <Icon name="arrow-left" className="h-4 w-4 mr-1" />
                Back to Reading
              </a>
            </Button>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <ReadingPassagePane passage={passage} totalPassages={1} />
            <div className="space-y-2">
              {questions.map((q) => (
                <ReadingQuestionItem
                  key={q.id}
                  question={q}
                  value={answers[q.id] ?? null}
                  onChange={(val) => handleChange(q.id, val)}
                />
              ))}
              {!questions.length && (
                <Card className="p-4 text-xs text-muted-foreground">
                  No questions found for this passage yet.
                </Card>
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  const testSlug = ctx.query.test;
  const passageOrderRaw = ctx.query.p;
  if (!testSlug || typeof testSlug !== 'string') {
    return { props: { passage: null, questions: [] } };
  }

  const passageOrder = Number(passageOrderRaw ?? 1);

  const { data: testRow } = await supabase
    .from('reading_tests')
    .select('*')
    .eq('slug', testSlug)
    .maybeSingle();

  if (!testRow) {
    return { props: { passage: null, questions: [] } };
  }

  const { data: passageRow } = await supabase
    .from('reading_passages')
    .select('*')
    .eq('test_id', testRow.id)
    .eq('passage_order', passageOrder)
    .maybeSingle();

  if (!passageRow) {
    return { props: { passage: null, questions: [] } };
  }

  const { data: questionRows } = await supabase
    .from('reading_questions')
    .select('*')
    .eq('test_id', testRow.id)
    .eq('passage_id', passageRow.id)
    .order('question_order', { ascending: true });

  const passage: ReadingPassage = {
    id: passageRow.id,
    testId: passageRow.test_id,
    passageOrder: passageRow.passage_order,
    title: passageRow.title,
    subtitle: passageRow.subtitle,
    content: passageRow.content,
    wordCount: passageRow.word_count,
    createdAt: passageRow.created_at,
    updatedAt: passageRow.updated_at,
  };

  const questions: ReadingQuestion[] =
    (questionRows ?? []).map((row: any) => ({
      id: row.id,
      testId: row.test_id,
      passageId: row.passage_id,
      questionOrder: row.question_order,
      questionTypeId: row.question_type_id as any,
      prompt: row.prompt,
      instruction: row.instruction,
      correctAnswer: row.correct_answer as any,
      constraintsJson: (row.constraints_json ?? {}) as Record<string, unknown>,
      tags: row.tags ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) ?? [];

  return {
    props: {
      passage,
      questions,
    },
  };
};

export default PassageDrillPage;
