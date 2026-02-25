import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

const mockLists = [
  {
    id: 'academic-core',
    title: 'Academic Core (AWL Basics)',
    description: 'High-frequency academic words that show up across IELTS topics.',
    size: 60,
    bestFor: 'Writing Task 2 • Band 6.5+',
  },
  {
    id: 'linking-words',
    title: 'Linking Words & Phrases',
    description: 'Cohesive devices for contrast, cause, result, concession, and examples.',
    size: 40,
    bestFor: 'Writing & Speaking coherence',
  },
  {
    id: 'topic-education',
    title: 'Topic: Education',
    description: 'Strong vocabulary for school, university, funding, and literacy.',
    size: 50,
    bestFor: 'Writing & Speaking • Education',
  },
];

export default function VocabularyListsPage() {
  return (
    <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="font-slab text-display">Vocabulary Lists</h1>
            <p className="text-grayish">
              Structured sets of words grouped by purpose and topic. Start with one list,
              finish it, then move to the next.
            </p>
          </div>

          <div className="grid gap-6">
            {mockLists.map((list) => (
              <Card
                key={list.id}
                className="rounded-ds-2xl border border-border/60 bg-card/70 p-6 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-slab text-h2">{list.title}</h2>
                  <Badge size="sm" variant="soft" tone="primary">
                    {list.bestFor}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{list.description}</p>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{list.size} words</span>
                  <span>Recommended: 10–15 words per day</span>
                </div>
                <div className="mt-3">
                  <Button variant="primary" size="sm" className="rounded-ds-xl">
                    View list
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
