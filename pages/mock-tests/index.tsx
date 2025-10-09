// pages/mock-tests/index.tsx
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { mockTests } from '@/data/mock-tests';

export default function MockTestsIndex() {
  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <h1 className="font-slab text-display mb-3 text-gradient-primary">Mock Tests</h1>
        <p className="text-grayish max-w-2xl">
          Full-length exams and section-wise practice with AI scoring, analytics, and review.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockTests.map((m) => (
            <Card key={m.slug} className="card-surface p-6 rounded-ds-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 font-semibold">{m.title}</h3>
                <Badge variant="info" size="sm">{m.skill}</Badge>
              </div>

              <p className="mt-2 text-body opacity-90">{m.description}</p>

              <div className="mt-6">
                <Button
                  as="a"
                  href={m.href}
                  variant="primary"
                  className="rounded-ds"
                >
                  {m.skill === 'Full' ? 'Start full mock' : 'Open practice'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
