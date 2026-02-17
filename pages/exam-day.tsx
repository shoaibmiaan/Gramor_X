import Head from 'next/head';
import Link from 'next/link';
import ExamResourceLayout from '@/components/layouts/ExamResourceLayout';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';

const canonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/exam-day`
  : undefined;

const morningChecklist = [
  'Review your ID, admission confirmation, arrival time, and transport route.',
  'Eat something light and hydrate—steady energy beats a sugar spike.',
  'Pack pencils, erasers, a transparent water bottle, and a light sweater just in case.',
  'Skim your favourite vocabulary bank to get your brain into English mode.',
];

const warmupIdeas = [
  'Read a short news paragraph aloud to loosen pronunciation and pacing.',
  'Draft a Task 2 outline: thesis, two main points with examples, and a concise close.',
  'Listen to a 2–3 minute podcast clip and summarise the main idea plus two details.',
  'Flip through three tricky question types and remind yourself of the strategy cues.',
];

const mindsetPrompts = [
  'Arrive 30 minutes early so you can breathe, settle in, and avoid last-minute stress.',
  'Remind yourself of pacing benchmarks for each section and trust the plan you practised.',
  'Pause for one slow breath between sections—letting go of the previous task resets your focus.',
  'If you blank, outline the question, underline key words, and move—momentum beats perfection.',
];

export default function ExamDayPage() {
  return (
    <>
      <Head>
        <title>Exam day playbook</title>
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="A calm, design-system styled playbook for exam day: checklists, warm-ups, and reminders with a direct link to launch a mock exam."
        />
      </Head>

      <ExamResourceLayout title="Exam day playbook">
        <section className="bg-lightBg py-0 dark:bg-transparent">
          <Container>
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <article className="space-y-6 rounded-ds-2xl bg-card/70 p-6 shadow-lg shadow-black/5 backdrop-blur">
              <header className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-small font-medium text-primary">
                  IELTS exam readiness
                </span>
                <h1 className="font-slab text-h2">Exam day playbook</h1>
                <p className="text-body text-mutedText">
                  Use this focused checklist to keep exam morning calm, intentional, and aligned with how you practised.
                  You&apos;ve already put in the work—today is about execution.
                </p>
              </header>

              <Section title="Morning checklist" items={morningChecklist} />
              <Section title="15-minute warm-up" items={warmupIdeas} />
              <Section title="Mindset resets" items={mindsetPrompts} />
            </article>

            <aside className="space-y-4">
              <Card className="space-y-4 rounded-ds-2xl p-6">
                <h2 className="font-slab text-h4">Launch a final mock</h2>
                <p className="text-small text-mutedText">
                  A quick mock keeps pacing sharp and reminds you of the timing rhythm before the real thing.
                </p>
                <Button asChild size="lg" fullWidth>
                  <Link href="/mock">Start a mock exam</Link>
                </Button>
                <Button asChild variant="outline" size="sm" fullWidth>
                  <Link href="/exam/rehearsal">Open the rehearsal checklist</Link>
                </Button>
              </Card>

              <Card className="space-y-3 rounded-ds-2xl p-6">
                <h3 className="text-h5 font-semibold">Quick calm cues</h3>
                <ul className="space-y-2 text-small text-mutedText">
                  <li>• Box-breathe for four counts in, hold for four, exhale for four.</li>
                  <li>• Visualise finishing the test strong rather than chasing perfection.</li>
                  <li>• Keep water sips tiny and steady to avoid energy dips.</li>
                </ul>
              </Card>
            </aside>
            </div>
          </Container>
        </section>
      </ExamResourceLayout>
    </>
  );
}

type SectionProps = {
  title: string;
  items: string[];
};

function Section({ title, items }: SectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-h4 font-semibold">{title}</h2>
      <ul className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-4 text-small text-mutedText">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
