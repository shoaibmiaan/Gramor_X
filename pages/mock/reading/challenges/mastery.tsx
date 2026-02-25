// pages/mock/reading/challenges/mastery.tsx
import * as React from 'react';
import type { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';

type Props = {
  isAuthed: boolean;
};

const QUESTION_TYPES = [
  { id: 'tfng', label: 'True / False / Not Given' },
  { id: 'heading', label: 'Match the Headings' },
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'match', label: 'Matching Information' }
];

const MasteryChallengePage: NextPage<Props> = () => {
  return (
    <>
      <Head>
        <title>Mastery Challenge · Reading · GramorX</title>
      </Head>

      <Container className="py-10 max-w-3xl space-y-6">
        <Card className="p-6 space-y-2">
          <Badge size="xs" variant="outline">Mastery Challenge</Badge>
          <h1 className="text-xl font-semibold">Train One Question Type at a Time</h1>
          <p className="text-sm text-muted-foreground">
            Choose a question type. You’ll get 8–12 handpicked questions of ONLY that type.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {QUESTION_TYPES.map((t) => (
            <Card key={t.id} className="p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">{t.label}</h2>
                <p className="text-xs text-muted-foreground">Master {t.label} with focused drills.</p>
              </div>
              <Button asChild size="sm" className="mt-4 rounded-ds-xl">
                <Link href={`/mock/reading/drill/question-type?type=${t.id}`}>
                  <Icon name="layers" className="mr-2 h-4 w-4" />
                  Start {t.label}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl),
        permanent: false
      }
    };
  }

  return { props: { isAuthed: true } };
};

export default MasteryChallengePage;
