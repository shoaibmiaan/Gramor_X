import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

export default function WritingLearnHub() {
  const items = [
    { href: '/writing/learn/task1-overview', title: 'Task 1 (Academic): Writing the Overview', tag: 'Task Achievement' },
    { href: '/writing/learn/task2-structure', title: 'Task 2: Rock-solid Structure', tag: 'Task Response' },
    { href: '/writing/learn/coherence', title: 'Coherence & Cohesion in practice', tag: 'Cohesion' },
    { href: '/writing/learn/lexical', title: 'Lexical Resource: precise, natural, varied', tag: 'Vocabulary' },
    { href: '/writing/learn/grammar', title: 'Grammar Range & Accuracy: clean complexity', tag: 'Grammar' },
  ] as const;

  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Writing • Learn (Guides)</h1>
        <p className="text-muted mt-1">Text-only stubs. Practical, no fluff. Jump in.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.href} className="p-4">
              <h3 className="text-lg font-semibold">{it.title}</h3>
              <div className="mt-1"><Badge variant="neutral">{it.tag}</Badge></div>
              <div className="mt-4">
                <Link href={it.href} className="inline-flex"><Button variant="primary">Open</Button></Link>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/writing/resources" className="inline-flex"><Button variant="ghost">← Back to Tips & Resources</Button></Link>
        </div>
      </Container>
    </Section>
  );
}
