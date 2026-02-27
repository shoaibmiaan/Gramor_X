import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

const practiceSkills = [
  {
    slug: 'listening',
    title: 'Listening',
    description: 'Timed papers, transcript review, and accent drills to sharpen comprehension.',
    stat: '4 full mocks',
  },
  {
    slug: 'reading',
    title: 'Reading',
    description: 'Focus on scanning, inference, and speed across academic + GT passages.',
    stat: '5 full mocks',
  },
  {
    slug: 'writing',
    title: 'Writing',
    description: 'Task 1 & 2 feedback, planning frameworks, and AI band insights.',
    stat: '15+ task sets',
  },
  {
    slug: 'speaking',
    title: 'Speaking',
    description: 'Interview simulator with auto transcripts and pronunciation analytics.',
    stat: 'Live recording',
  },
] as const;

const competitiveEdge = [
  {
    title: 'AI + human feedback loop',
    description: 'Combine instant band predictions with optional tutor reviews in a single workspace.',
  },
  {
    title: 'Skill-first analytics',
    description: 'Track progress by micro skill—detail matching, idea organisation, pronunciation—to prioritise practice.',
  },
  {
    title: 'Focus-friendly experience',
    description: 'Dark mode, distraction locks, and keyboard shortcuts keep you in exam flow.',
  },
];

export default function PracticeHomePage() {
  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <header className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Practice Lab</h1>
            <p className="text-grayish">
              Your command centre for IELTS prep. Choose a module to unlock drills, mock tests, and analytics crafted to outperform other prep platforms.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Smart scheduling</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">Adaptive</p>
              <p className="mt-1 text-xs text-muted-foreground">Daily plan adjusts to your results</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Review insights</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">Deep-dive</p>
              <p className="mt-1 text-xs text-muted-foreground">AI & tutor notes side-by-side</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Progress tracking</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">Skill heatmaps</p>
              <p className="mt-1 text-xs text-muted-foreground">Spot trends across attempts</p>
            </Card>
          </div>
        </header>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {practiceSkills.map((skill) => (
            <Card key={skill.slug} className="card-surface rounded-ds-2xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Badge variant="primary" size="sm">{skill.stat}</Badge>
                <Badge variant="outline" size="sm">Module</Badge>
              </div>
              <h2 className="mt-4 text-h4 font-semibold text-foreground">{skill.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{skill.description}</p>

              <Button href={`/practice/${skill.slug}`} variant="primary" className="mt-6 rounded-ds">
                Enter {skill.title}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">What gives you the edge</h2>
          <p className="mt-2 text-muted-foreground max-w-3xl">
            Built with insights from thousands of successful test-takers. Every workflow keeps you focused on high-impact tasks, not busywork.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {competitiveEdge.map((item) => (
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
