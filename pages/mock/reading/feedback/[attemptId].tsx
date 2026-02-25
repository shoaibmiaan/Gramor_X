// pages/mock/reading/feedback/[attemptId].tsx
import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';

import { getServerClient } from '@/lib/supabaseServer';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Textarea } from '@/components/design-system/Textarea';
import Icon from '@/components/design-system/Icon';

import { supabase } from '@/lib/supabaseClient';

type PageProps = {
  attemptId: string | null;
  allowed: boolean;
};

const ReadingFeedbackPage: NextPage<PageProps> = ({ attemptId, allowed }) => {
  const router = useRouter();
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  if (!allowed || !attemptId) {
    return (
      <>
        <Head>
          <title>Reading Feedback · GramorX</title>
        </Head>
        <Container className="py-10">
          <Card className="mx-auto max-w-xl p-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
              <Icon name="lock" className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">Feedback not available</p>
            <p className="text-xs text-muted-foreground">
              Either this attempt does not exist, or you are not allowed to attach feedback to it.
            </p>
          </Card>
        </Container>
      </>
    );
  }

  const handleSubmit = async () => {
    if (!note.trim()) {
      alert('Please enter some feedback before submitting.');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to submit feedback.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('reading_notes').insert({
      user_id: user.id,
      attempt_id: attemptId,
      note,
    });
    setSubmitting(false);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('note insert error', error);
      alert('Could not save feedback. Please try again.');
      return;
    }
    setNote('');
    alert('Feedback saved. Your coach can see this on your Reading report.');
    router.push(`/mock/reading/result/${attemptId}`);
  };

  return (
    <>
      <Head>
        <title>Attach feedback · Reading · GramorX</title>
      </Head>
      <Container className="py-10 max-w-xl">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Reading feedback
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight">
                Add a note for this attempt
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                This is for you and your coach. Summarise what felt hard, what mistakes you keep
                repeating, and anything you want to remember for next time.
              </p>
            </div>
            <Icon name="message-circle" className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Your feedback
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              placeholder="Example: I kept misreading the TF/NG questions on Passage 2. I also guessed on 3 matching headings..."
            />
            <p className="text-[11px] text-muted-foreground">
              Your note is private to your account and your assigned coach/teacher (if any).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save feedback'}
            </Button>
          </div>
        </Card>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const attemptIdParam = ctx.params?.attemptId;
  if (typeof attemptIdParam !== 'string') {
    return { notFound: true };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: { destination: '/login?role=student', permanent: false },
    };
  }
  // Fetch attempt, ensure belongs to user
  const { data: attemptRow } = await supabase
    .from('attempts_reading')
    .select('id, user_id')
    .eq('id', attemptIdParam)
    .maybeSingle();

  if (!attemptRow || attemptRow.user_id !== user.id) {
    return {
      props: {
        attemptId: null,
        allowed: false,
      },
    };
  }

  return {
    props: {
      attemptId: attemptRow.id,
      allowed: true,
    },
  };
};

export default ReadingFeedbackPage;
