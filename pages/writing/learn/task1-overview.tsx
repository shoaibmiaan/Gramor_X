import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';

export default function Task1OverviewGuide() {
  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Task 1 (Academic): The Overview</h1>
        <p className="text-muted mt-1">
          One or two sentences that capture the <em>big picture</em>—no numbers, no micro-details. Examiners expect it; it’s a Band 7+ behaviour.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-lg font-semibold">Why the overview matters</h2>
            <div className="mt-2 flex gap-2">
              <Badge variant="neutral">Task Achievement</Badge>
              <Badge variant="success">Core skill</Badge>
            </div>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li>Shows you understand the <strong>main trends/contrasts</strong>, not just numbers.</li>
              <li>Stops you from wasting time listing figures in the intro.</li>
              <li>Gives your body paragraphs a clear direction.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">What to look for</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li><strong>Trends:</strong> rising, falling, stable, fluctuating.</li>
              <li><strong>Extremes:</strong> highest, lowest, peak, trough.</li>
              <li><strong>Contrasts:</strong> A far exceeds B; C lags behind.</li>
              <li><strong>Time windows:</strong> slow/fast growth; a surge after a date.</li>
              <li><strong>Groups:</strong> categories that behave similarly/differently.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Sentence frames (use naturally)</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li>
                <em>Overall,</em> X <strong>increased steadily</strong> while Y <strong>remained relatively flat</strong>, and Z <strong>rose sharply</strong> in the later period.
              </li>
              <li>
                <em>In broad terms,</em> A <strong>consistently outperformed</strong> B, whereas C <strong>caught up</strong> towards the end.
              </li>
              <li>
                <em>Generally,</em> the largest shares belonged to …, with … <strong>trailing behind</strong>.
              </li>
            </ul>
            <Alert variant="info" className="mt-3">
              Avoid numbers here. Details come later.
            </Alert>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Chart-type quick cues</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li><strong>Line/Bar over time:</strong> growth/decline, turning points, relative ranking.</li>
              <li><strong>Pie:</strong> largest/smallest slices, dominant categories.</li>
              <li><strong>Table:</strong> group patterns; don’t read every cell.</li>
              <li><strong>Process/Map:</strong> stages or key changes; directionality (before/after).</li>
            </ul>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Model overviews (no numbers)</h2>
            <div className="mt-3 space-y-3 text-sm">
              <p>
                <strong>Line graph:</strong> Overall, internet use in A <em>rose steadily</em>, B <em>hovered</em> at a modest level, and C <em>accelerated markedly</em> in the second decade.
              </p>
              <p>
                <strong>Two pies:</strong> In broad terms, services <em>dominated</em> national spending, while agriculture accounted for the <em>smallest share</em> in both years.
              </p>
              <p>
                <strong>Process:</strong> Generally, the manufacture proceeds <em>from raw intake</em> to <em>filtration</em> and finally <em>packaging</em>, with quality checks at each stage.
              </p>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Common pitfalls</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li>Including numbers in the overview.</li>
              <li>Listing every category instead of summarising groups.</li>
              <li>Writing a mini-body paragraph as an “overview”.</li>
              <li>Copying the task prompt wording → paraphrase instead.</li>
            </ul>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Practice now</h2>
            <p className="mt-2 text-sm">
              Data (table): “Four products, 2000→2020; A and D rise strongly, B stays low, C dips then recovers.” Write a <strong>single overview sentence</strong>.
            </p>
            <p className="mt-2 text-sm">
              Data (maps): “Town before/after redevelopment; new pedestrian zone; relocated bus station; added green areas.” Write a <strong>two-sentence</strong> overview (no directions like north/south).
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
