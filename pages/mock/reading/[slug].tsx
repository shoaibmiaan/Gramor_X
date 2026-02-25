// pages/mock/reading/[slug].tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';

import type {
  ReadingTest as ReadingTestType,
  ReadingPassage as ReadingPassageType,
  ReadingQuestion as ReadingQuestionType,
} from '@/lib/reading/types';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { ReadingExamShell } from '@/components/reading/ReadingExamShell';

type PageProps = {
  test: ReadingTestType | null;
  passages: ReadingPassageType[];
  questions: ReadingQuestionType[];
};

const ReadingMockRunPage: NextPage<PageProps> = ({ test, passages, questions }) => {
  if (!test) {
    return (
      <>
        <Head>
          <title>Reading mock not found · GramorX</title>
        </Head>
        <Container className="py-10">
          <Card className="mx-auto max-w-xl p-8 text-center space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Icon name="alert-circle" className="h-8 w-8 text-destructive" />
              <h1 className="text-lg font-semibold">Reading mock not found</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              This reading mock is not available anymore or the link is incorrect.
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/mock/reading">
                  <Icon name="arrow-left" className="mr-2 h-4 w-4" />
                  Back to Reading Mocks
                </Link>
              </Button>
            </div>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{test.title} · Reading Mock · GramorX</title>
      </Head>
      <Container fluid className="p-0">
        <ReadingExamShell test={test} passages={passages} questions={questions} />
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const slugParam = ctx.params?.slug;

  if (!slugParam || typeof slugParam !== 'string') {
    return {
      props: {
        test: null,
        passages: [],
        questions: [],
      },
    };
  }

  const supabase = getServerClient(ctx.req, ctx.res);
  type TestRow = Database['public']['Tables']['reading_tests']['Row'];
  type PassageRow = Database['public']['Tables']['reading_passages']['Row'];
  type QuestionRow = Database['public']['Tables']['reading_questions']['Row'];

  const { data: testsRows, error: testsError } = await supabase
    .from('reading_tests')
    .select('*')
    .eq('slug', slugParam)
    .eq('is_active', true)
    .limit(1);

  if (testsError || !testsRows || testsRows.length === 0) {
    return {
      props: {
        test: null,
        passages: [],
        questions: [],
      },
    };
  }

  const testRow: TestRow = testsRows[0];

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

  const test: ReadingTestType = {
    id: testRow.id,
    slug: testRow.slug,
    title: testRow.title,
    description: testRow.description,
    examType: testRow.exam_type,
    durationSeconds: testRow.duration_seconds ?? 3600,
    createdAt: testRow.created_at,
    updatedAt: testRow.updated_at,
  };

  const passages: ReadingPassageType[] =
    (passageRows ?? []).map((row: PassageRow) => ({
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

  const questions: ReadingQuestionType[] =
    (questionRows ?? []).map((row: QuestionRow) => ({
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
    },
  };
};

export default ReadingMockRunPage;
