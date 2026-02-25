import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

const mockQuestion = {
  word: 'Mitigate',
  question: 'Choose the best sentence that uses “mitigate” correctly:',
  options: [
    'The teacher mitigate the homework in the bin.',
    'They installed noise barriers to mitigate the impact of traffic.',
    'We mitigate to the park every evening.',
    'She was mitigate about the final score.',
  ],
  correctIndex: 1,
};

export default function TodayQuizPage() {
  return (
    <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-2">
            <h1 className="font-slab text-display">Today’s Vocab Quiz</h1>
            <p className="text-grayish">
              Quick check: can you actually use today’s word correctly in context?
            </p>
          </div>

          <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Word</p>
                <p className="text-lg font-semibold">{mockQuestion.word}</p>
              </div>
              <Badge size="sm" variant="soft" tone="primary">
                Daily word
              </Badge>
            </div>

            <p className="text-sm font-medium">{mockQuestion.question}</p>

            <div className="space-y-2">
              {mockQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full rounded-ds-xl border border-border/60 bg-muted/40 px-3 py-2 text-left text-sm hover:border-primary/60 hover:bg-primary/5 transition"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>1 question today. Keep it light.</span>
              <span>More detailed quizzes coming from practice history.</span>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" className="rounded-ds-xl">
              Finish
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
