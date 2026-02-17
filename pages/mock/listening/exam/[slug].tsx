// pages/mock/listening/exam/[slug].tsx
import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { Container } from '@/components/design-system/Container';
import { ListeningExamShell } from '@/components/listening/ListeningExamShell';

export type ListeningTest = {
  id: string;
  slug: string;
  title: string;
  audioUrl: string | null;
  durationMinutes: number;
  totalQuestions: number;
};

export type ListeningSection = {
  id: string;
  testId: string;
  order: number;
  audioUrl: string | null;
  label: string;
  startSec: number | null;
  endSec: number | null;
};

export type ListeningQuestion = {
  id: string;
  testId: string;
  sectionId: string;
  questionNo: number;
  text: string;
  type: string;
  options: unknown;
};

type PageProps = {
  test: ListeningTest;
  sections: ListeningSection[];
  questions: ListeningQuestion[];
};

const ListeningExamPage: NextPage<PageProps> = ({
  test,
  sections,
  questions,
}) => {
  return (
    <>
      <Head>
        <title>{test.title} · Listening Mock · GramorX</title>
      </Head>
      {/* Exam room should hug the viewport, minimal padding */}
      <Container className="py-2">
        <ListeningExamShell
          test={test}
          sections={sections}
          questions={questions}
        />
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const slugParam = ctx.params?.slug;
  const slug = typeof slugParam === 'string' ? slugParam : null;

  if (!slug) {
    return {
      redirect: {
        destination: '/mock/listening',
        permanent: false,
      },
    };
  }

  const supabase = getServerClient(ctx);

  // 1) Test by slug
  const { data: testRow, error: testError } = await supabase
    .from('listening_tests')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (testError || !testRow) {
    console.error('Listening test fetch error', testError);
    return {
      redirect: {
        destination: '/mock/listening',
        permanent: false,
      },
    };
  }

  // 2) Sections
  const { data: sectionRows, error: sectionError } = await supabase
    .from('listening_sections')
    .select('*')
    .eq('test_id', testRow.id)
    .order('order_no', { ascending: true });

  if (sectionError) {
    console.error('Listening sections fetch error', sectionError);
  }

  // 3) Questions
  const { data: questionRows, error: questionError } = await supabase
    .from('listening_questions')
    .select('*')
    .eq('test_id', testRow.id)
    .order('section_no', { ascending: true })
    .order('question_number', { ascending: true });

  if (questionError) {
    console.error('Listening questions fetch error', questionError);
  }

  const durationSeconds =
    (testRow as any).duration_seconds ?? 1800;

  const test: ListeningTest = {
    id: testRow.id as string,
    slug: testRow.slug as string,
    title: (testRow as any).title ?? 'Listening Test',
    audioUrl: (testRow as any).audio_url ?? null,
    durationMinutes: Math.round(durationSeconds / 60),
    totalQuestions: (testRow as any).total_questions ?? 40,
  };

  const sections: ListeningSection[] = (sectionRows ?? []).map(
    (s: any, idx: number) => ({
      id: s.id as string,
      testId: s.test_id as string,
      order: s.order_no ?? idx + 1,
      audioUrl: s.audio_url ?? null,
      label: `Section ${s.order_no ?? idx + 1}`,
      startSec: s.start_sec ?? null,
      endSec: s.end_sec ?? null,
    })
  );

  const questions: ListeningQuestion[] = (questionRows ?? []).map(
    (q: any, idx: number) => ({
      id: q.id as string,
      testId: q.test_id as string,
      sectionId: (q.section_uuid as string) ?? '', // IMPORTANT: your schema
      questionNo: q.question_number ?? idx + 1,
      text: q.question_text ?? '',
      type: q.question_type ?? 'mcq',
      options: q.options ?? null, // stringified JSON, we parse in component
    })
  );

  return {
    props: {
      test,
      sections,
      questions,
    },
  };
};

export default ListeningExamPage;
