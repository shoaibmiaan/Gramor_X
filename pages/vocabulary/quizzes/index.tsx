import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

export default function VocabularyQuizHome() {
  return (
    <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-2">
            <h1 className="font-slab text-display">Vocabulary Quiz</h1>
            <p className="text-grayish">
              Pick a mode and test how well your words are sticking. Short, fast, and to
              the point.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="rounded-ds-2xl p-5 flex flex-col gap-3">
              <Icon name="ListChecks" size={24} />
              <h3 className="font-semibold">Meaning MCQ</h3>
              <p className="text-xs text-muted-foreground">
                Choose the correct meaning for each word.
              </p>
              <Button asChild size="sm" variant="primary" className="mt-auto rounded-ds-xl">
                <Link href="/vocabulary/quiz/today">Start</Link>
              </Button>
            </Card>

            <Card className="rounded-ds-2xl p-5 flex flex-col gap-3">
              <Icon name="Edit3" size={24} />
              <h3 className="font-semibold">Fill the blank</h3>
              <p className="text-xs text-muted-foreground">
                Use the right word inside IELTS-style sentences.
              </p>
              <Button asChild size="sm" variant="secondary" className="mt-auto rounded-ds-xl">
                <Link href="/vocabulary/quiz/today">Start</Link>
              </Button>
            </Card>

            <Card className="rounded-ds-2xl p-5 flex flex-col gap-3">
              <Icon name="RefreshCw" size={24} />
              <h3 className="font-semibold">Review saved words</h3>
              <p className="text-xs text-muted-foreground">
                Quiz only on words from your “My Words” list.
              </p>
              <Button asChild size="sm" variant="accent" className="mt-auto rounded-ds-xl">
                <Link href="/vocabulary/quiz/today">Start</Link>
              </Button>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
