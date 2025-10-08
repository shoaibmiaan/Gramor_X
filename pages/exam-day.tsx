import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';

const canonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/exam-day`
  : undefined;

export default function ExamDayPage() {
  return (
    <>
      <Head>
        <title>Exam day playbook</title>
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Checklists, warm-ups, and reminders to stay calm and organised on IELTS exam day."
        />
      </Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="mx-auto max-w-3xl space-y-6 rounded-ds-2xl p-6">
            <header className="space-y-3 text-center">
              <h1 className="font-slab text-h2">Exam day playbook</h1>
              <p className="text-body text-mutedText">
                Stay grounded, remember your strategies, and give yourself the best shot at the band you&apos;ve trained for.
              </p>
            </header>

            <div className="space-y-4 text-left">
              <section className="space-y-2">
                <h2 className="text-h4 font-semibold">Morning checklist</h2>
                <ul className="list-disc space-y-1 pl-5 text-body text-mutedText">
                  <li>Review your ID, confirmation email, and arrival time.</li>
                  <li>Eat and hydrate lightly so your energy stays steady.</li>
                  <li>Pack pencils, erasers, and a transparent water bottle.</li>
                  <li>Skim your favourite vocabulary bank for a quick confidence boost.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-h4 font-semibold">Warm-up in 15 minutes</h2>
                <ul className="list-disc space-y-1 pl-5 text-body text-mutedText">
                  <li>Read a short article out loud to loosen pronunciation.</li>
                  <li>Write a quick outline for a Task 2 prompt—intro, two points, conclusion.</li>
                  <li>Listen to a short podcast excerpt and summarise the main idea.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-h4 font-semibold">Mindset reset</h2>
                <ul className="list-disc space-y-1 pl-5 text-body text-mutedText">
                  <li>Arrive early so you can settle your breathing before the exam.</li>
                  <li>Remember your pacing benchmarks for each section.</li>
                  <li>Plan to pause briefly after each section to reset and avoid rushing.</li>
                </ul>
              </section>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/mock">Launch a mock exam</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/exam/rehearsal">Open the rehearsal checklist</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
