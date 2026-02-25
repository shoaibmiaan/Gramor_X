// pages/mock/speaking/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

import { speakingPracticeList } from '@/data/speaking'; // :contentReference[oaicite:3]{index=3}

type IconName = React.ComponentProps<typeof Icon>['name'];

const speakingHighlights = [
  {
    title: 'Studio-grade recordings',
    description:
      'Record inside the browser. Auto-saves. Export audio for deeper review.',
    icon: 'Mic',
  },
  {
    title: 'Instant transcript + analysis',
    description:
      'AI finds fillers, pauses, grammar slips, and pronunciation weaknesses.',
    icon: 'Sparkles',
  },
  {
    title: 'Follow-up coaching',
    description:
      'AI-generated follow-ups + vocabulary for the next attempt.',
    icon: 'Lightbulb',
  },
];

const speakingFlow = [
  {
    title: 'Part 1 · Warm-up',
    description: 'Short personal questions. Improve answer length and fluency.',
    icon: 'User',
  },
  {
    title: 'Part 2 · Cue Card',
    description: '1-minute prep + 2-minute performance. Real exam pressure.',
    icon: 'Clock',
  },
  {
    title: 'Part 3 · Discussion',
    description:
      'Higher-level questions with sample ideas, structures, and vocabulary.',
    icon: 'MessageSquare',
  },
];

const SpeakingMockIndexPage: React.FC = () => {
  const primaryScript = speakingPracticeList[0];
  const totalScripts = speakingPracticeList.length;
  const totalPrompts = speakingPracticeList.reduce(
    (sum, s) => sum + (s.totalPrompts ?? 0),
    0,
  );

  return (
    <>
      <Head>
        <title>Speaking Mock Tests · GramorX</title>
        <meta
          name="description"
          content="IELTS Speaking mocks with recording, transcripts, AI feedback, and realistic Part 1–3 flow."
        />
      </Head>

      <main className="bg-lightBg dark:bg-dark/90">

        {/* ------------------------------------------------------------- */}
        {/* HERO / COMMAND CENTER */}
        {/* ------------------------------------------------------------- */}
        <section className="py-10 md:py-14 border-b border-border/40 bg-card/70 backdrop-blur">
          <Container>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

              {/* LEFT */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-ds-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Icon name="Mic" size={14} />
                  <span>Speaking Mock Suite</span>
                </div>

                <h1 className="font-slab text-h2 leading-tight">
                  Full Speaking mocks with transcripts + AI feedback.
                </h1>

                <p className="text-sm text-muted-foreground max-w-xl">
                  Simulate the real interview: Part 1 warm-up, Part 2 cue card,
                  Part 3 follow-ups. AI gives instant transcripts, filler
                  detection, pacing metrics, and personalised improvement steps.
                </p>

                <div className="flex gap-3 pt-2">
                  {primaryScript && (
                    <Button
                      asChild
                      size="md"
                      variant="primary"
                      className="rounded-ds-xl"
                    >
                      <Link href={`/mock/speaking/${primaryScript.id}`}>
                        Start {primaryScript.title}
                      </Link>
                    </Button>
                  )}

                  <Button
                    asChild
                    size="md"
                    variant="secondary"
                    className="rounded-ds-xl"
                  >
                    <Link href="#speaking-library">Browse scripts</Link>
                  </Button>
                </div>
              </div>

              {/* RIGHT QUICK STATS */}
              <Card className="p-5 rounded-ds-2xl border border-border/60 bg-card/80 w-full max-w-xs shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">
                  Quick Stats
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Scripts</p>
                    <p className="text-lg font-semibold">{totalScripts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total prompts</p>
                    <p className="text-lg font-semibold">
                      {totalPrompts.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parts</p>
                    <p className="text-lg font-semibold">1–3</p>
                  </div>
                </div>
              </Card>

            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* SPEAKING FEATURES / HIGHLIGHTS */}
        {/* ------------------------------------------------------------- */}
        <section className="py-10">
          <Container>
            <div className="mb-6">
              <h2 className="font-slab text-h3">Why practise Speaking here?</h2>
              <p className="text-sm text-muted-foreground">
                Designed for solo learners — no partner required.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {speakingHighlights.map((item) => (
                <Card
                  key={item.title}
                  className="card-surface rounded-ds-2xl p-6 h-full"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name={item.icon as IconName} size={20} />
                    </span>
                    <h3 className="text-h5 font-semibold">{item.title}</h3>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* SPEAKING SCRIPTS LIBRARY */}
        {/* ------------------------------------------------------------- */}
        <section id="speaking-library" className="py-10 bg-muted/40">
          <Container>
            <div className="mb-6">
              <h2 className="font-slab text-h3">Speaking Scripts Library</h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Each script contains complete timing, cues, Part 2 prep,
                discussion follow-ups, and transcript-ready recording flow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {speakingPracticeList.map((script) => (
                <Card
                  key={script.id}
                  className="card-surface rounded-ds-2xl p-6 h-full transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex flex-col h-full gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-h4">{script.title}</h3>

                        <Badge variant="info" size="sm">
                          {script.totalPrompts} prompts
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {script.description}
                      </p>
                    </div>

                    <div className="mt-auto">
                      <Button
                        asChild
                        variant="primary"
                        className="rounded-ds-xl w-full"
                      >
                        <Link href={`/mock/speaking/${script.id}`}>
                          Start speaking mock
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* SPEAKING FLOW — PART 1 / 2 / 3 */}
        {/* ------------------------------------------------------------- */}
        <section className="py-14">
          <Container>
            <h2 className="font-slab text-h3">Master the full interview flow</h2>
            <p className="text-sm text-muted-foreground max-w-xl mt-1">
              Train your stamina and fluency. Repeat each part until responses become natural.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {speakingFlow.map((item) => (
                <Card
                  key={item.title}
                  className="card-surface rounded-ds-2xl p-6 h-full"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name={item.icon as IconName} size={20} />
                    </span>
                    <h3 className="text-h5 font-semibold">{item.title}</h3>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* AI IMPROVEMENT CTA */}
        {/* ------------------------------------------------------------- */}
        <section className="bg-muted/40 pb-16 pt-10">
          <Container>
            <Card className="mx-auto max-w-4xl rounded-ds-2xl bg-card/90 p-6 border border-border/60">
              <div className="grid md:grid-cols-2 gap-6">

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Next smart move
                  </p>
                  <h3 className="font-slab text-h3">Fix your Speaking fillers and pacing.</h3>
                  <p className="text-sm text-muted-foreground">
                    Use AI Lab to analyse your transcript, highlight weak grammar,
                    catch hesitations, and practise smoother delivery.
                  </p>
                </div>

                <div className="space-y-3 rounded-ds-2xl bg-muted p-4 text-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Icon name="Sparkles" size={14} />
                    <span>Suggested flow</span>
                  </div>

                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li>1. Attempt a Speaking mock from the list.</li>
                    <li>2. Review your transcript + audio.</li>
                    <li>3. Send to AI Lab for detailed feedback.</li>
                    <li>4. Redo the same script and compare progress.</li>
                  </ol>

                  <div className="flex gap-2">
                    <Button asChild variant="secondary" size="sm" className="w-full rounded-ds-xl">
                      <Link href="/ai">Open AI Lab</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="w-full rounded-ds-xl">
                      <Link href="/mock/speaking/history">View attempts</Link>
                    </Button>
                  </div>
                </div>

              </div>
            </Card>
          </Container>
        </section>

      </main>
    </>
  );
};

export default SpeakingMockIndexPage;
