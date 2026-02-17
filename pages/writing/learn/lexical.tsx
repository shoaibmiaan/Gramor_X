import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

export default function LexicalGuide() {
  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Lexical Resource</h1>
        <p className="text-muted mt-1">Be precise, natural, and correct—no forced fancy words.</p>

        <Card className="mt-6 p-4">
          <h2 className="text-lg font-semibold">Core ideas</h2>
          <div className="mt-2 flex gap-2"><Badge variant="neutral">Vocabulary</Badge><Badge variant="warning">Advanced</Badge></div>
          <ul className="mt-3 list-disc pl-6 text-sm">
            <li>Use topic-specific collocations; avoid repetition by paraphrasing.</li>
            <li>Don’t risk accuracy for rare words—errors cost marks.</li>
            <li>Check spelling; keep tone academic for Task 2.</li>
          </ul>
        </Card>

        <Card className="mt-4 p-4">
          <h2 className="text-lg font-semibold">Practice now</h2>
          <p className="mt-2 text-sm">Upgrade: “a lot of people”, “very important”, “big problem” in a 2-sentence climate opinion.</p>
        </Card>

        <div className="mt-6 flex gap-2">
          <Link href="/writing/learn" className="inline-flex"><Button variant="ghost">← All guides</Button></Link>
          <Link href="/writing/resources" className="inline-flex"><Button variant="secondary">Back to Tips</Button></Link>
        </div>
      </Container>
    </Section>
  );
}
