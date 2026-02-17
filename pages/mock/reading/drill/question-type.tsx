// pages/mock/reading/drill/question-type.tsx
import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';
import type { ReadingQuestion } from '@/lib/reading/types';
import { ReadingQuestionItem } from '@/components/reading/ReadingQuestionItem';

type PageProps = {
  questionTypeId: string;
  questions: ReadingQuestion[];
};

const QuestionTypeDrillPage: NextPage<PageProps> = ({ questionTypeId, questions }) => {
  const [answers, setAnswers] = React.useState<Record<string, string | string[] | null>>({});

  const handleChange = (questionId: string, val: string | string[] | null) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  return (
    <>
      <Head>
        <title>Question Type Drill – {questionTypeId} · GramorX</title>
      </Head>

      <section className="py-8 bg-background">
        <Container className="max-w-3xl space-y-4">
          <Card className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge variant="outline" size="xs">
                Question-type drill
              </Badge>
              <h1 className="text-lg font-semibold tracking-tight">
                {questionTypeId.toUpperCase()} questions
              </h1>
              <p className="text-xs text-muted-foreground">
                Practice only this question type. Try to move quickly but accurately.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/mock/reading">
                <Icon name="arrow-left" className="h-4 w-4 mr-1" />
                Back to Reading
              </a>
            </Button>
          </Card>

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
                No questions found for this type yet.
              </Card>
            )}
          </div>
        </Container>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  const qt = ctx.query.type;
  const questionTypeId =
    typeof qt === 'string' ? qt : 'TFNG';

  // Just sample 20 questions of this type
  const { data, error } = await supabase
    .from('reading_questions')
    .select('*')
    .eq('question_type_id', questionTypeId)
    .limit(20);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('question-type drill error', error);
  }

  const questions: ReadingQuestion[] =
    (data ?? []).map((row: any) => ({
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
      questionTypeId,
      questions,
    },
  };
};

export default QuestionTypeDrillPage;
