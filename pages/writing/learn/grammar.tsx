import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

export default function GrammarGuide() {
  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Grammar Range & Accuracy</h1>
        <p className="text-muted mt-1">Mix simple/complex sentences, but keep them clean.</p>

        <Card className="mt-6 p-4">
          <h2 className="text-lg font-semibold">Core ideas</h2>
          <div className="mt-2 flex gap-2"><Badge variant="neutral">Grammar</Badge><Badge variant="success">Beginner</Badge></div>
          <ul className="mt-3 list-disc pl-6 text-sm">
            <li>1 complex sentence per paragraph is enough at first.</li>
            <li>Common traps: articles, subject-verb agreement, run-ons.</li>
            <li>Accuracy beats variety when in doubt.</li>
          </ul>
        </Card>

        <Card className="mt-4 p-4">
          <h2 className="text-lg font-semibold">Practice now</h2>
          <p className="mt-2 text-sm">Combine: “Many people work remotely.” + “They save commuting time.” into one precise complex sentence.</p>
        </Card>

        <div className="mt-6 flex gap-2">
          <Link href="/writing/learn" className="inline-flex"><Button variant="ghost">← All guides</Button></Link>
          <Link href="/writing/resources" className="inline-flex"><Button variant="secondary">Back to Tips</Button></Link>
        </div>
      </Container>
    </Section>
  );
}
