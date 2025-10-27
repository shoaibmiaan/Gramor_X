import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { writingExamSummaries } from '@/data/writing/exam-index';

const quickActions = [
  {
    title: 'Mock exam room',
    description: 'Sit the full 60-minute module with planner, timer, and distraction controls.',
    href: '/mock-tests/writing',
  },
  {
    title: 'Essay bank',
    description: 'Browse prompts, sample answers, and vocabulary by topic.',
    href: '/writing',
  },
  {
    title: 'Band tracker',
    description: 'Monitor AI band estimates, lexical range, and grammar accuracy over time.',
    href: '/progress',
  },
];

const writingSystems = [
  {
    title: 'Blueprint planning',
    description: 'Generate outlines tailored to task types and save them for future reference.',
  },
  {
    title: 'Language coaching',
    description: 'Get phrase suggestions, collocations, and paraphrase alternatives as you review.',
  },
  {
    title: 'Tutor escalation',
    description: 'Send your draft to a certified coach and receive annotated feedback inside the app.',
  },
];

const featuredSets = writingExamSummaries.slice(0, 4);

export default function WritingPracticePage() {
  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Writing Practice</h1>
            <p className="text-grayish">
              Upgrade your Task 1 visuals and Task 2 essays with guided planning, AI feedback, and optional tutor reviews.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Card key={action.title} className="card-surface rounded-ds-2xl p-4 flex flex-col">
                <h2 className="text-h5 font-semibold text-foreground">{action.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{action.description}</p>
                <Button href={action.href} variant="ghost" className="mt-4 rounded-ds self-start">
                  Open
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Featured writing sets</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Alternate between Academic and General Training tasks. Every submission receives band-aligned scoring with action steps for your next attempt.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredSets.map((paper) => (
              <Card key={paper.id} className="card-surface rounded-ds-2xl p-6 h-full flex flex-col">
                <div>
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <h3 className="text-h5 font-semibold text-foreground">{paper.title}</h3>
                    <Badge variant="info" size="sm">{paper.task1Type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Task 1: {paper.task1Focus}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Task 2: {paper.task2Focus}</p>
                </div>
                <Button href={`/mock/writing/${paper.id}`} variant="primary" className="mt-6 rounded-ds">
                  Start now
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {writingSystems.map((item) => (
            <Card key={item.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h3 className="text-h5 font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <Card className="card-surface rounded-ds-2xl p-6 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">Transform essays with actionable feedback</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Track sentence variety, lexical richness, and coherence markers. Set improvement goals and watch your band score climb.
              </p>
            </div>
            <Button href="/mock-tests/writing" variant="primary" className="mt-4 rounded-ds md:mt-0">
              Browse mock tests
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
