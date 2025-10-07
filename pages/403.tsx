// pages/403.tsx
import type { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';

type Props = { reason: string | null };

const jokes = [
  "403: Even AI tutors need permission slips.",
  "Access denied — unlike IELTS, you can’t guess the answer here.",
  "You’re not lost, just unauthorized. Happens to the best of us!",
  "This page is like Task 2 without preparation: inaccessible.",
  "403: The band score for access is 9.0 — you got a solid 0.",
];

const ForbiddenPage: NextPage<Props> = ({ reason }) => {
  const joke = useMemo(
    () => jokes[Math.floor(Math.random() * jokes.length)],
    []
  );

  return (
    <>
      <Head>
        <title>403 — Forbidden</title>
      </Head>
      <main
        id="main"
        aria-labelledby="forbidden-title"
        className="flex min-h-[100dvh] items-center bg-background py-12 text-foreground"
      >
        <Container className="flex justify-center px-6">
          <Card className="max-w-xl text-center" padding="lg">
            <div className="space-y-6">
              <p className="text-caption uppercase tracking-[0.2em] text-muted-foreground">Restricted area</p>
              <h1 id="forbidden-title" className="text-display font-semibold text-primary">
                403
              </h1>
              <p className="text-h4 text-muted-foreground">
                You don’t have permission to access this page
                {reason ? `: ${reason}` : '.'}
              </p>
              <p className="text-body italic text-accent">{joke}</p>
              <div className="flex justify-center">
                <Button asChild size="lg" variant="primary">
                  <Link href="/">Back to dashboard</Link>
                </Button>
              </div>
            </div>
          </Card>
        </Container>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  // Explicitly return null instead of undefined to avoid Next.js serialization error
  return { props: { reason: null } };
};

export default ForbiddenPage;
