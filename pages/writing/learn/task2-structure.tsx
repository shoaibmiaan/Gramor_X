import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';

export default function Task2StructureGuide() {
  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Task 2: Rock-solid Structure</h1>
        <p className="text-muted mt-1">Plan fast. Write clean paragraphs. Finish with a decisive conclusion.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-lg font-semibold">60-second plan (MEEL)</h2>
            <div className="mt-2 flex gap-2">
              <Badge variant="neutral">Task Response</Badge>
              <Badge variant="success">Planning</Badge>
            </div>
            <ol className="mt-3 list-decimal pl-6 text-sm">
              <li><strong>Main idea 1</strong> (clear claim).</li>
              <li><strong>Explain</strong> (why/how it matters).</li>
              <li><strong>Evidence</strong> (example or scenario—brief).</li>
              <li><strong>Link</strong> back to question (mini-conclusion).</li>
            </ol>
            <Alert variant="info" className="mt-3">
              Write the MEEL bullets before you start the essay. It removes hesitation mid-paragraph.
            </Alert>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Flexible 4-paragraph template</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li><strong>Intro:</strong> Paraphrase question + direct thesis (answer clearly).</li>
              <li><strong>Body 1:</strong> MEEL for argument 1.</li>
              <li><strong>Body 2:</strong> MEEL for argument 2 (or concession → rebuttal).</li>
              <li><strong>Conclusion:</strong> Restate answer + strongest reason. No new ideas.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Adapting to question types</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li><strong>Opinion (agree/disagree):</strong> Thesis chooses a side; both bodies support it (or 1 body concession + rebuttal).</li>
              <li><strong>Discuss both views:</strong> One paragraph per view, conclusion gives your opinion.</li>
              <li><strong>Advantages/Disadvantages:</strong> Separate bodies; show which side is stronger in conclusion.</li>
              <li><strong>Problem/Solution:</strong> Body 1 → key causes; Body 2 → targeted solutions (feasible, specific).</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Topic sentences that steer</h2>
            <p className="text-sm mt-2">
              Good topic sentences preview the <em>point</em> of the paragraph. They’re not just “Firstly…”.
            </p>
            <div className="mt-3 text-sm space-y-2">
              <p><strong>Weak:</strong> “Firstly, there are many reasons for this.”</p>
              <p><strong>Better:</strong> “Firstly, making community service compulsory <em>cultivates civic responsibility</em> at an early age.”</p>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Counterargument + rebuttal (compact)</h2>
            <p className="text-sm mt-2">
              Use a <em>single</em> sentence concession and then shift to a stronger rebuttal—keeps balance without derailing your main stance.
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <strong>Example:</strong> “Although compulsory volunteering may limit students’ time for paid work, a well-structured programme <em>builds employable skills</em> that often matter more than short-term income.”
              </p>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Mini outline samples</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Opinion — Agree</p>
                <ul className="list-disc pl-6 mt-1">
                  <li><strong>Thesis:</strong> Support compulsory service (builds empathy, skills).</li>
                  <li><strong>Body 1:</strong> Empathy → exposure to community challenges → example: elderly care.</li>
                  <li><strong>Body 2:</strong> Skills → teamwork/time mgmt → example: event organisation.</li>
                  <li><strong>Conclusion:</strong> Clear benefit outweighs scheduling downsides.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Problem/Solution</p>
                <ul className="list-disc pl-6 mt-1">
                  <li><strong>Thesis:</strong> Urban congestion requires demand + supply fixes.</li>
                  <li><strong>Body 1:</strong> Causes: cheap parking, peak-hour habits.</li>
                  <li><strong>Body 2:</strong> Solutions: dynamic pricing, bus rapid transit; pilot first.</li>
                  <li><strong>Conclusion:</strong> Coordinated policies beat isolated measures.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Common pitfalls</h2>
            <ul className="mt-3 list-disc pl-6 text-sm">
              <li>Thesis that “sits on the fence”.</li>
              <li>Two ideas jammed in one paragraph (no depth).</li>
              <li>Example paragraphs—stories without analysis.</li>
              <li>New ideas in the conclusion.</li>
            </ul>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Practice now</h2>
            <p className="mt-2 text-sm">
              Draft a 4-line outline (Intro, B1, B2, Conclusion) for: “Cashless payments should replace cash entirely.” Include one concession + rebuttal in either body.
            </p>
            <p className="mt-2 text-sm">
              Turn this vague topic sentence into a precise one: “Secondly, there are disadvantages too.”
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
