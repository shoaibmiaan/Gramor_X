import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { writingExamSummaries } from '@/data/writing/exam-index';

const writingHighlights = [
  {
    title: 'Band descriptor scoring',
    description:
      'AI examiners evaluate Task Achievement, Coherence, Lexical Resource, and Grammar against the official rubric within seconds.',
  },
  {
    title: 'Live typing analytics',
    description:
      'Word count, paragraph balance, and vocabulary diversity update as you write so you can adjust before time is up.',
  },
  {
    title: 'Model answer comparison',
    description:
      'Unlock high-band samples with annotated structures and phrase banks aligned to the same question.',
  },
];

const writingSupport = [
  {
    title: 'Planning frameworks',
    description: 'Task-specific outlines and brainstorming prompts keep introductions and body paragraphs sharp.',
  },
  {
    title: 'Feedback timeline',
    description: 'Replays show how your essay evolved and where you spent time editing, so you can refine your process.',
  },
  {
    title: 'Tutor escalation',
    description: 'Send your attempt to a certified IELTS tutor directly from the review screen for human insight.',
  },
];

const academicSets = writingExamSummaries.filter((item) => item.task1Type === 'Academic');
const generalSets = writingExamSummaries.filter((item) => item.task1Type === 'General Training');

const primarySet = writingExamSummaries[0];

export default function WritingMockTestsPage() {
  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Writing Mock Tests</h1>
            <p className="text-grayish">
              Sit the full 60-minute module with authentic prompts, structured planning tools, and AI scoring tuned to real examiner feedback.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Academic sets</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{academicSets.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Graphs, tables, maps & processes</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">General training sets</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{generalSets.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Letter + essay combinations</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">60 mins</p>
              <p className="mt-1 text-xs text-muted-foreground">Task 1 + Task 2 in one sitting</p>
            </Card>
          </div>

          {primarySet ? (
            <div className="flex flex-wrap items-center gap-4">
              <Button href={`/mock/writing/${primarySet.id}`} variant="primary" className="rounded-ds">
                Start {primarySet.title}
              </Button>
              <Button href="#writing-sets" variant="ghost" className="rounded-ds">
                Explore all sets
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {writingHighlights.map((feature) => (
            <Card key={feature.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h2 className="text-h5 font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div id="writing-sets" className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Choose a writing paper</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Every set pairs a Task 1 visual with a Task 2 essay. Your answers are scored instantly with full band breakdowns and upgrade suggestions.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {writingExamSummaries.map((paper) => (
              <Card key={paper.id} className="card-surface h-full rounded-ds-2xl p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-h4 font-semibold text-foreground">{paper.title}</h2>
                      <Badge variant="info" size="sm">{paper.task1Type}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{paper.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="neutral" size="sm">Task 1: {paper.task1Focus}</Badge>
                    <Badge variant="secondary" size="sm">Task 2: {paper.task2Focus}</Badge>
                    <Badge variant="ghost" size="sm">{paper.durationMinutes} minutes</Badge>
                    {paper.register ? <Badge variant="outline" size="sm">{paper.register}</Badge> : null}
                  </div>

                  <Button href={`/mock/writing/${paper.id}`} variant="primary" className="rounded-ds">
                    Start practice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Polish your writing workflow</h2>
          <p className="mt-2 text-muted-foreground max-w-3xl">
            Combine mock exams with micro-drills and tutor reviews to build a repeatable approach for band 7 and above.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {writingSupport.map((item) => (
              <Card key={item.title} className="card-surface rounded-ds-2xl p-6 h-full">
                <h3 className="text-h5 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
