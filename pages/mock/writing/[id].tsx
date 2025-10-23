import React from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

import WritingExamRoom from '@/components/writing/WritingExamRoom';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingExamPrompts } from '@/types/writing';

type PageProps = {
  attemptId: string;
  durationSeconds: number;
  prompts: WritingExamPrompts;
  initialDraft: {
    task1?: { essay: string; wordCount: number };
    task2?: { essay: string; wordCount: number };
    updatedAt?: string | null;
  } | null;
};

const mapPrompt = (row: any) => ({
  id: row.id,
  slug: row.slug ?? row.id,
  title: row.title,
  promptText: row.prompt_text,
  taskType: row.task_type ?? 'task2',
  module: row.module ?? 'academic',
  difficulty: row.difficulty ?? 'medium',
  source: row.source ?? undefined,
  tags: row.tags ?? undefined,
  estimatedMinutes: row.estimated_minutes ?? undefined,
  wordTarget: row.word_target ?? undefined,
  metadata: row.metadata ?? undefined,
});

const WritingMockPage: React.FC<PageProps> = ({ attemptId, prompts, durationSeconds, initialDraft }) => {
  const router = useRouter();
  return (
    <WritingExamRoom
      attemptId={attemptId}
      prompts={prompts}
      durationSeconds={durationSeconds}
      initialDraft={initialDraft ?? undefined}
      onSubmitSuccess={(result) => {
        void router.push(`/mock/writing/results/${result.attemptId}`);
      }}
    />
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: {
        destination: '/welcome',
        permanent: false,
      },
    };
  }

  const { id } = ctx.params as { id: string };

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !attempt || attempt.user_id !== user.id) {
    return { notFound: true };
  }

  const metadata = (attempt.metadata as any) ?? {};
  const promptIds = metadata.promptIds ?? {};

  const promptRows = await supabase
    .from('writing_prompts')
    .select('*')
    .in('id', [promptIds.task1, promptIds.task2].filter(Boolean));

  const task1Row = promptRows.data?.find((row) => row.id === promptIds.task1);
  const task2Row = promptRows.data?.find((row) => row.id === promptIds.task2);

  if (!task1Row || !task2Row) {
    return { notFound: true };
  }

  const prompts: WritingExamPrompts = {
    task1: mapPrompt(task1Row),
    task2: mapPrompt(task2Row),
  };

  const { data: autosaveEvent } = await supabase
    .from('exam_events')
    .select('payload, occurred_at')
    .eq('attempt_id', id)
    .eq('event_type', 'autosave')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialDraft: PageProps['initialDraft'] = null;

  if (autosaveEvent?.payload) {
    const payload = autosaveEvent.payload as any;
    initialDraft = {
      updatedAt: autosaveEvent.occurred_at,
      task1: payload.tasks?.task1
        ? { essay: payload.tasks.task1.content ?? '', wordCount: payload.tasks.task1.wordCount ?? 0 }
        : undefined,
      task2: payload.tasks?.task2
        ? { essay: payload.tasks.task2.content ?? '', wordCount: payload.tasks.task2.wordCount ?? 0 }
        : undefined,
    };
  } else {
    const { data: responseRows } = await supabase
      .from('writing_responses')
      .select('task, answer_text, word_count')
      .eq('exam_attempt_id', id);

    if (responseRows && responseRows.length > 0) {
      const draft: Record<string, { essay: string; wordCount: number }> = {};
      responseRows.forEach((row) => {
        if (row.task === 'task1' || row.task === 'task2') {
          draft[row.task] = {
            essay: row.answer_text ?? '',
            wordCount: row.word_count ?? 0,
          };
        }
      });
      if (Object.keys(draft).length > 0) {
        initialDraft = {
          task1: draft.task1,
          task2: draft.task2,
          updatedAt: attempt.updated_at ?? attempt.created_at,
        };
      }
    }
  }

  return {
    props: {
      attemptId: id,
      durationSeconds: attempt.duration_seconds ?? 60 * 60,
      prompts,
      initialDraft: initialDraft ?? null,
    },
  };
};

export default WritingMockPage;
