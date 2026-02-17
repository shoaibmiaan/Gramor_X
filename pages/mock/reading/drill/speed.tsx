// pages/mock/reading/drill/speed.tsx
import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';
import type { ReadingPassage, ReadingQuestion, ReadingTest } from '@/lib/reading/types';
import { ReadingExamShell } from '@/components/reading/ReadingExamShell';
import { speedTrainingLevels as rawSpeedLevels } from '@/data/reading/speedTrainingConfigs';

type SpeedLevel = {
  id: string;
  label: string;
  durationMinutes: number;
};

type PageProps = {
  test: ReadingTest | null;
  passages: ReadingPassage[];
  questions: ReadingQuestion[];
  levelId: string;
};

// Normalize / fallback so we never crash if config is missing or empty
const normalizeLevels = (): SpeedLevel[] => {
  if (Array.isArray(rawSpeedLevels) && rawSpeedLevels.length > 0) {
    return rawSpeedLevels as SpeedLevel[];
  }

  // Fallback defaults if your config file is empty / broken
  return [
    { id: 'light', label: 'Light sprint (20 min)', durationMinutes: 20 },
    { id: 'normal', label: 'Exam pace (40 min)', durationMinutes: 40 },
    { id: 'hard', label: 'Pressure cooker (30 min)', durationMinutes: 30 },
  ];
};

const levels = normalizeLevels();

const SpeedTrainingPage: NextPage<PageProps> = ({
  test,
  passages,
  questions,
  levelId,
}) => {
  const level =
    levels.find((l) => l.id === levelId) ??
    levels.find((l) => l.id === 'normal') ??
    levels[0];

  if (!test || !level) {
    return (
      <>
        <Head>
          <title>Reading Speed Training · GramorX</title>
        </Head>
        <section className="py-16">
          <Container className="max-w-3xl">
            <Card className="p-6 text-sm text-muted-foreground">
              No Reading test / speed level found for speed training.
            </Card>
          </Container>
        </section>
      </>
    );
  }

  const speedTest: ReadingTest = {
    ...test,
    durationSeconds: level.durationMinutes * 60,
  };

  return (
    <>
      <Head>
        <title>Speed Training – {level.label} · GramorX</title>
      </Head>

      <section className="py-6 bg-background">
        <Container className="max-w-4xl space-y-3">
          <Card className="p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Badge size="xs" variant="outline">
                Speed Training
              </Badge>
              <span className="font-medium">{level.label}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="clock" className="h-3.5 w-3.5" />
              <span>{level.durationMinutes} minutes</span>
            </div>
          </Card>

          <ReadingExamShell test={speedTest} passages={passages} questions={questions} />
        </Container>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  const levelIdRaw = ctx.query.level;

  const defaultLevel =
    levels.find((l) => l.id === 'normal') ?? levels[0];

  const levelId =
    typeof levelIdRaw === 'string'
      ? levelIdRaw
      : defaultLevel.id;

  // pick any reading test for now (later: choose by difficulty)
  const { data: testsRows } = await supabase
    .from('reading_tests')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1);

  if (!testsRows || !testsRows.length) {
    return {
      props: {
        test: null,
        passages: [],
        questions: [],
        levelId,
      },
    };
  }

  const testRow = testsRows[0];

  const { data: passageRows } = await supabase
    .from('reading_passages')
    .select('*')
    .eq('test_id', testRow.id)
    .order('passage_order', { ascending: true });

  const { data: questionRows } = await supabase
    .from('reading_questions')
    .select('*')
    .eq('test_id', testRow.id)
    .order('question_order', { ascending: true });

  const test: ReadingTest = {
    id: testRow.id,
    slug: testRow.slug,
    title: testRow.title,
    description: testRow.description,
    examType: testRow.exam_type,
    durationSeconds: testRow.duration_seconds ?? 3600,
    createdAt: testRow.created_at,
    updatedAt: testRow.updated_at,
  };

  const passages: ReadingPassage[] =
    (passageRows ?? []).map((row: any) => ({
      id: row.id,
      testId: row.test_id,
      passageOrder: row.passage_order,
      title: row.title,
      subtitle: row.subtitle,
      content: row.content,
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) ?? [];

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
      test,
      passages,
      questions,
      levelId,
    },
  };
};

export default SpeedTrainingPage;
