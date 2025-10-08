import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';

type QuickPageProps = Record<string, never>;

const canonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/quick`
  : undefined;

export const getServerSideProps: GetServerSideProps<QuickPageProps> = async () => {
  if (!flags.enabled('quickTen')) {
    return {
      redirect: {
        destination: '/study-plan',
        permanent: false,
      },
    };
  }

  return { props: {} };
};

export default function QuickTenLanding() {
  return (
    <>
      <Head>
        <title>Quick 10 drills (private beta)</title>
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Quick 10 gives you a focused micro-drill in under ten minutes. We&apos;re polishing the beta before opening it up."
        />
      </Head>

      <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="mx-auto max-w-3xl space-y-6 rounded-ds-2xl p-6 text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-small font-medium text-primary">
              Private beta
            </span>
            <h1 className="font-slab text-h2">Quick 10 is in final prep</h1>
            <p className="text-body text-mutedText">
              Quick 10 serves a personalised ten-minute micro-drill built from your weakest skills. Early testers are
              helping us tune the difficulty and instant feedback right now.
            </p>
            <p className="text-body text-mutedText">
              Keep momentum going with your study plan while we finish the experience. We&apos;ll notify you the moment it
              switches on for your account.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/study-plan">Open study plan</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard#tasks">Check today&apos;s tasks</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}

