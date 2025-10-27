import Head from 'next/head';
import type { GetServerSideProps } from 'next';

import { Container } from '@/components/design-system/Container';
import { serverEnabled } from '@/lib/flags';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type TaskSummary = {
  task: string;
  band: number;
  summary: string;
};

type PageProps = {
  attemptId: string;
  averageBand: number;
  submittedAt: string | null;
  studentName: string | null;
  tasks: TaskSummary[];
};

const WritingCertificatePage: React.FC<PageProps> = ({ attemptId, averageBand, submittedAt, studentName, tasks }) => {
  const issued = submittedAt ? new Date(submittedAt).toLocaleDateString() : 'Pending issue date';

  return (
    <div className="min-h-screen bg-neutral-50 py-16 print:bg-white print:py-8">
      <Head>
        <title>Writing certificate · Attempt {attemptId}</title>
      </Head>
      <Container className="mx-auto max-w-3xl">
        <article className="rounded-3xl border border-border/40 bg-white p-10 shadow-2xl print:shadow-none">
          <header className="text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">GramorX Writing Module</p>
            <h1 className="mt-4 text-4xl font-semibold text-foreground">Achievement Certificate</h1>
            <p className="mt-2 text-base text-muted-foreground">
              This certifies that {studentName ?? 'a GramorX learner'} completed a writing mock exam and received the
              following overall band score.
            </p>
          </header>

          <section className="mt-10 flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-10 py-12 text-center">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">Overall band</span>
            <span className="text-6xl font-semibold text-primary">{averageBand.toFixed(1)}</span>
            <p className="max-w-xl text-sm text-muted-foreground">
              Issued on {issued}. Bands shown below reflect the most recent evaluation for each task in this attempt.
            </p>
          </section>

          <section className="mt-12 space-y-6">
            {tasks.map((task) => (
              <div key={task.task} className="rounded-2xl border border-border/40 bg-muted/20 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h2 className="text-xl font-semibold text-foreground">Task {task.task.replace('task', '')}</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Band</span>
                    <span className="text-3xl font-semibold text-foreground">{task.band.toFixed(1)}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{task.summary}</p>
              </div>
            ))}
          </section>

          <footer className="mt-12 border-t border-border/30 pt-6 text-sm text-muted-foreground">
            <p>Attempt ID: {attemptId}</p>
            <p>Verified by the GramorX writing evaluation service.</p>
            <p className="mt-2 text-xs">For authenticity, cross-check this ID inside your GramorX dashboard.</p>
          </footer>
        </article>
      </Container>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (!(await serverEnabled('writingCertificates'))) {
    return { notFound: true };
  }

  if (!supabaseAdmin) {
    return { notFound: true };
  }

  const { attemptId } = ctx.params as { attemptId: string };

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('exam_attempts')
    .select('id, user_id, submitted_at, updated_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    return { notFound: true };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', attempt.user_id)
    .maybeSingle();

  const { data: responses } = await supabaseAdmin
    .from('writing_responses')
    .select('task, overall_band, feedback')
    .eq('exam_attempt_id', attemptId);

  const tasks: TaskSummary[] = (responses ?? [])
    .filter((row) => row.task === 'task1' || row.task === 'task2')
    .map((row) => ({
      task: row.task as string,
      band: Number(row.overall_band ?? 0),
      summary:
        ((row.feedback as { summary?: string } | null)?.summary ?? 'Feedback will appear once scoring is complete.')
          .slice(0, 280),
    }));

  if (tasks.length === 0) {
    return { notFound: true };
  }

  const averageBand = tasks.reduce((sum, task) => sum + task.band, 0) / tasks.length;

  return {
    props: {
      attemptId,
      averageBand,
      submittedAt: attempt.submitted_at ?? attempt.updated_at ?? null,
      studentName: (profile as { full_name?: string | null } | null)?.full_name ?? null,
      tasks,
    },
  };
};

export default WritingCertificatePage;

