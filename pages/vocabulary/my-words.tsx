import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

// TODO: Replace with real data from Supabase
const mockSavedWords = [
  { word: 'Mitigate', note: 'Task 2: problem–solution', reviewed: false },
  { word: 'Substantial', note: 'Charts / data description', reviewed: true },
  { word: 'Pivotal', note: 'Speaking Part 3 opinion', reviewed: false },
];

export default function MyWordsPage() {
  return (
    <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-2">
            <h1 className="font-slab text-display">My Words</h1>
            <p className="text-grayish">
              Words you saved from dashboard, practice, and mocks. Review them until they
              feel natural.
            </p>
          </div>

          <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-4 space-y-3">
            {mockSavedWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved words yet. Start by adding words from the dashboard or
                Vocabulary Lab.
              </p>
            ) : (
              <ul className="space-y-2">
                {mockSavedWords.map((item) => (
                  <li
                    key={item.word}
                    className="flex items-center justify-between gap-3 rounded-ds-xl bg-muted/40 px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">{item.word}</p>
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.reviewed ? (
                        <Badge size="xs" variant="success">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge size="xs" variant="accent">
                          To review
                        </Badge>
                      )}
                      <Button size="xs" variant="ghost" className="rounded-ds-xl">
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" className="rounded-ds-xl">
              Start review quiz
            </Button>
            <Button variant="ghost" size="sm" className="rounded-ds-xl">
              Export list
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
