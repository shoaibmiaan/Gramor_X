import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { GetStaticProps } from 'next';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { listeningPracticeList } from '@/data/listening/index';
import { mockSections } from '@/data/mockTests';

const formatMinutes = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Self-paced';
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const listeningHighlights = [
  {
    title: 'Band-aligned auto marking',
    description:
      'Instant answer checking calibrated with Cambridge descriptors, including paraphrase recognition and typo tolerance.',
  },
  {
    title: 'Smart review workspace',
    description:
      'Scrub through transcripts, tap vocabulary to see synonyms, and compare with model answers inside the same tab.',
  },
  {
    title: 'Focus & pacing tools',
    description:
      'Adaptive timers, double-speed playback, and note flags keep you on tempo during each section.',
  },
];

const examBreakdown = [
  {
    title: 'Part 1 · Everyday dialogue',
    focus: 'Form completion & short answers',
    description:
      'Slow-paced introductions with spelling-sensitive fields help you warm up while practicing active listening.',
  },
  {
    title: 'Part 2 · Monologue briefing',
    focus: 'Map/diagram labelling',
    description:
      'Campus and city contexts with interactive plans that mirror the computer-delivered IELTS layout.',
  },
  {
    title: 'Part 3 · Academic discussion',
    focus: 'Multiple-choice & matching',
    description:
      'Group conversations featuring varying accents and faster pace to refine detail tracking.',
  },
  {
    title: 'Part 4 · Lecture summary',
    focus: 'Sentence completion',
    description:
      'Extended talk with technical vocabulary, including AI hints for note-taking and signposting phrases.',
  },
];

export default function ListeningPracticeIndex() {
  const primaryPaper = listeningPracticeList[0];
  const totalQuestions = mockSections.listening.questions.length;
  const totalSets = listeningPracticeList.length;
  const durationMinutes = Math.round(mockSections.listening.duration / 60);

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Listening Mock Tests</h1>
            <p className="text-grayish">
              Train for band 9 comprehension with realistic audio quality, AI marking, and guided review flows. Every paper mirrors the official timing, navigation, and answer entry experience.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Official timing</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{durationMinutes} mins</p>
              <p className="mt-1 text-xs text-muted-foreground">Auto-paused between sections</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Question bank</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{totalSets} full sets</p>
              <p className="mt-1 text-xs text-muted-foreground">New releases each month</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Per test questions</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{totalQuestions}</p>
              <p className="mt-1 text-xs text-muted-foreground">Balanced across 4 parts</p>
            </Card>
          </div>

          {primaryPaper ? (
            <div className="flex flex-wrap items-center gap-4">
              <Button
                href={`/mock/listening/${primaryPaper.id}`}
                variant="primary"
                className="rounded-ds"
              >
                Start {primaryPaper.title}
              </Button>
              <Button
                href="#practice-sets"
                variant="ghost"
                className="rounded-ds"
              >
                Browse all sets
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {listeningHighlights.map((feature) => (
            <Card key={feature.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h2 className="text-h5 font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div id="practice-sets" className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Choose a listening paper</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Timed mock tests cover all accents and question formats. Resume unfinished attempts anytime—your answers autosave on every change.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {listeningPracticeList.map((paper) => (
              <Card key={paper.id} className="card-surface h-full rounded-ds-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-h4 font-semibold text-foreground">{paper.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <Badge variant="info" size="sm">{formatMinutes(paper.durationSec)}</Badge>
                      <Badge variant="neutral" size="sm">{paper.sections} sections</Badge>
                      <Badge variant="secondary" size="sm">{paper.totalQuestions} questions</Badge>
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">Practice</Badge>
                </div>

                <div className="mt-6">
                  <Button href={`/mock/listening/${paper.id}`} variant="primary" className="w-full rounded-ds">
                    Start practice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Exam structure inside the simulator</h2>
          <p className="mt-2 text-muted-foreground max-w-3xl">
            Every mock replicates the live IELTS computer-delivered interface, so you build listening endurance and note-taking habits before test day.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {examBreakdown.map((section) => (
              <Card key={section.title} className="card-surface rounded-ds-2xl p-6 h-full">
                <Badge variant="info" size="sm">{section.focus}</Badge>
                <h3 className="mt-3 text-h5 font-semibold text-foreground">{section.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
