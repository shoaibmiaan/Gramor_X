// pages/mock/writing/[testId].tsx
import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

import { WritingExamShell } from '@/components/writing/WritingExamShell';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';

type ExamType = 'Academic' | 'General Training';

type PageProps = {
  test: {
    id: string;
    title: string;
    examType: ExamType;
    durationMinutes: number;
    task1Prompt: string | null;
    task2Prompt: string | null;
  };
};

type SubmitPayload = {
  answers: {
    taskId: string;
    label: 'Task 1' | 'Task 2';
    text: string;
    wordCount: number;
  }[];
};

type SubmitResponse = {
  attemptId: string;
};

const WritingExamPage: NextPage<PageProps> = ({ test }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleSubmit = async (payload: SubmitPayload) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/mock/writing/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: test.id,
          answers: payload.answers,
        } satisfies {
          testId: string;
          answers: SubmitPayload['answers'];
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSubmitError(data?.error ?? 'Failed to submit attempt.');
        return;
      }

      const data = (await res.json()) as SubmitResponse;
      if (!data.attemptId) {
        setSubmitError('Invalid server response (missing attemptId).');
        return;
      }

      router.push(`/mock/writing/result/${data.attemptId}`);
    } catch (error) {
      setSubmitError('Something went wrong while submitting your attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tasks = [
    {
      id: 'task1',
      label: 'Task 1' as const,
      title: 'Task 1',
      prompt: test.task1Prompt ?? 'Task 1 prompt not available.',
      minimumWords: 150,
      recommendedMinutes: 20,
    },
    {
      id: 'task2',
      label: 'Task 2' as const,
      title: 'Task 2',
      prompt: test.task2Prompt ?? 'Task 2 prompt not available.',
      minimumWords: 250,
      recommendedMinutes: 40,
    },
  ].filter((t) => t.prompt && t.prompt.trim().length > 0);

  const totalDurationMinutes = test.durationMinutes || 60;

  return (
    <>
      <Head>
        <title>Writing Mock · {test.title} · GramorX</title>
        <meta
          name="description"
          content="Strict IELTS Writing mock exam room with Task 1 and Task 2, timer, and auto word count."
        />
      </Head>

      <main className="bg-lightBg dark:bg-dark/90 min-h-screen pb-8">
        <Container className="py-4 md:py-6 max-w-6xl space-y-3">
          {/* Small top bar with back link */}
          <div className="flex items-center justify-between gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-ds-full px-3"
            >
              <a href="/mock/writing" aria-label="Back to Writing mocks">
                <span className="inline-flex items-center gap-1 text-xs">
                  <Icon name="ArrowLeft" size={14} />
                  <span>Back to Writing mocks</span>
                </span>
              </a>
            </Button>

            <p className="text-[11px] text-muted-foreground">
              Do not refresh or close the page during the exam.
            </p>
          </div>

          {/* Exam shell */}
          <WritingExamShell
            testTitle={test.title}
            examType={test.examType}
            totalDurationMinutes={totalDurationMinutes}
            tasks={tasks}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={false}
          />

          {submitError ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-danger">
              <Icon name="AlertTriangle" size={14} />
              <span>{submitError}</span>
            </div>
          ) : null}
        </Container>
      </main>
    </>
  );
};

export default WritingExamPage;

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx,
) => {
  const { req, res, params } = ctx;
  const testIdParam = params?.testId;

  if (!testIdParam || typeof testIdParam !== 'string') {
    return { notFound: true };
  }

  const supabase = getServerClient(req, res);
  type WritingTestsRow =
    Database['public']['Tables']['writing_tests']['Row'];

  const { data: testRow, error } = await supabase
    .from<WritingTestsRow>('writing_tests')
    .select('*')
    .eq('id', testIdParam)
    .single();

  if (error || !testRow) {
    return { notFound: true };
  }

  const examType: ExamType =
    testRow.exam_type === 'general_training'
      ? 'General Training'
      : 'Academic';

  const durationMinutes =
    (testRow as Partial<WritingTestsRow> & {
      duration_minutes?: number | null;
    }).duration_minutes ?? 60;

  const task1Prompt =
    (testRow as Partial<WritingTestsRow> & {
      task1_prompt?: string | null;
    }).task1_prompt ?? null;

  const task2Prompt =
    (testRow as Partial<WritingTestsRow> & {
      task2_prompt?: string | null;
    }).task2_prompt ?? null;

  return {
    props: {
      test: {
        id: testRow.id as string,
        title: testRow.title ?? 'Writing Mock',
        examType,
        durationMinutes,
        task1Prompt,
        task2Prompt,
      },
    },
  };
};
