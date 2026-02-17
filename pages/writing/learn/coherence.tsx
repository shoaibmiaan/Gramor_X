import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';

export default function CoherenceGuide() {
  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Coherence & Cohesion</h1>
        <p className="text-muted mt-1">
          Make your ideas easy to follow. Paragraphs carry one purpose; sentences hand information smoothly from old → new.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-lg font-semibold">Given → New principle</h2>
            <div className="mt-2 flex gap-2"><Badge variant="neutral">Cohesion</Badge><Badge variant="success">Flow</Badge></div>
            <p className="text-sm mt-2">
              Start each sentence with something the reader already knows, then add new info. This “thematic progression” creates natural flow.
            </p>
            <div className="mt-3 text-sm space-y-2">
              <p><strong>Choppy:</strong> “Bike lanes reduce congestion. Many drivers keep using cars. The lanes are poorly connected.”</p>
              <p><strong>Smoother:</strong> “Bike lanes can reduce congestion. <em>However, many drivers</em> still use cars, <em>partly because these lanes</em> are poorly connected.”</p>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Paragraphing that works</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li><strong>1 idea per paragraph:</strong> don’t split the same idea or mix two points.</li>
              <li><strong>Topic → support → mini-conclusion:</strong> stick to MEEL logic.</li>
              <li><strong>Length:</strong> 4–6 sentences is typical for Task 2 bodies.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Cohesive devices (use sparingly)</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li><strong>Reference:</strong> this/these/it/they/such a(n).</li>
              <li><strong>Substitution/Ellipsis:</strong> “do so”, “one(s)”, leaving out repeated parts.</li>
              <li><strong>Conjunctions:</strong> however, moreover, consequently, meanwhile.</li>
              <li><strong>Lexical cohesion:</strong> topic-specific words & collocations (public transit, dynamic pricing).</li>
            </ul>
            <Alert variant="info" className="mt-3">Over-linking sounds mechanical and can lower your band.</Alert>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Signposting without clutter</h2>
            <p className="text-sm mt-2">
              You don’t need “Firstly/Secondly” everywhere. Use them when they genuinely clarify order. Otherwise, let content carry the logic.
            </p>
            <div className="mt-3 text-sm space-y-2">
              <p><strong>Cluttered:</strong> “Firstly, secondly, thirdly…” in short paragraphs.</p>
              <p><strong>Clean:</strong> “A key benefit is… Another is…”</p>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Mini toolkit</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Reference words in action</p>
                <p className="mt-1">
                  “Car-free zones improve air quality. <em>These areas</em> also make shopping streets safer.”
                </p>
              </div>
              <div>
                <p className="font-medium">Given → New chaining</p>
                <p className="mt-1">
                  “Public transport is often crowded. <em>This congestion</em> discourages commuters, which <em>in turn</em> increases car use.”
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Common pitfalls</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li>Overusing linkers to force cohesion.</li>
              <li>Repeating the same noun unnecessarily.</li>
              <li>Jumping between ideas without transitions.</li>
              <li>Very long sentences that hide the logic.</li>
            </ul>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Practice now</h2>
            <p className="mt-2 text-sm">
              Insert exactly two natural linkers into: “Online learning is popular. Some learners still struggle to focus. A balanced approach is needed.”
            </p>
            <p className="mt-2 text-sm">
              Improve paragraph focus by writing a precise topic sentence for: “City parks receive little funding, yet residents want more green space and events.”
            </p>
          </Card>
        </div>

        <div className="mt-6 flex gap-2">
          <Link href="/writing/learn" className="inline-flex"><Button variant="ghost">← All guides</Button></Link>
          <Link href="/writing/resources" className="inline-flex"><Button variant="secondary">Back to Tips</Button></Link>
        </div>
      </Container>
    </Section>
  );
}
