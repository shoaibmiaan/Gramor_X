import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

const UPDATED_ON = 'May 28, 2024';

const SECTIONS: Array<{
  id: string;
  title: string;
  content: ReactNode;
}> = [
  {
    id: 'scope',
    title: '1. Scope',
    content: (
      <p className="text-body text-muted-foreground">
        This Privacy Notice explains how GramorX (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, stores, and shares
        personal information when you access any web, mobile, or API experience branded as IELTS Prep with
        AI. It applies to learners, guardians, educators, institutions, and visitors worldwide.
      </p>
    ),
  },
  {
    id: 'data-we-collect',
    title: '2. Information We Collect',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          We collect the minimum information required to deliver the product, operate securely, and comply with
          the law. Depending on how you use GramorX we may process:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-body text-muted-foreground">
          <li>
            <strong>Account details</strong> such as name, email, phone number, language preference, role, and goal band.
          </li>
          <li>
            <strong>Learning records</strong> including practice attempts, scores, feedback, streaks, and coaching notes.
          </li>
          <li>
            <strong>Content uploads</strong> you provide, such as essays, speaking recordings, documents, and support tickets.
          </li>
          <li>
            <strong>Payment data</strong> processed by our billing providers (card type, country, transaction history).
          </li>
          <li>
            <strong>Technical data</strong> like device identifiers, browser type, session telemetry, and cookies to protect the
            service and measure performance.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-data',
    title: '3. How We Use Information',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          Information is processed to deliver and improve the service, including to:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-body text-muted-foreground">
          <li>Authenticate users, maintain accounts, and personalize study plans.</li>
          <li>Score attempts, surface analytics, and power AI feedback features.</li>
          <li>Provide support, safety notifications, marketing opt-ins, and transactional updates.</li>
          <li>Monitor availability, prevent fraud or abuse, and enforce legal or policy requirements.</li>
          <li>Generate de-identified analytics that guide product, curriculum, and infrastructure investments.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'legal-bases',
    title: '4. Legal Bases',
    content: (
      <p className="text-body text-muted-foreground">
        We rely on contract performance, legitimate interests in securing and improving the platform, compliance
        with legal obligations, and (where required) your consent. We will request explicit consent before
        sending promotional email or SMS in jurisdictions that require it.
      </p>
    ),
  },
  {
    id: 'sharing',
    title: '5. Sharing &amp; Processors',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          We do not sell personal information. Access is limited to vetted employees, contractors, and service
          providers bound by confidentiality obligations. Key processors include authentication, file storage,
          analytics, messaging, and payment vendors. Institutions that sponsor seats may receive aggregated
          progress reports according to their agreement.
        </p>
        <p className="mt-3 text-body text-muted-foreground">
          We may disclose information if required by law or to protect users, the public, or GramorX from harm.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: '6. Cookies &amp; Tracking',
    content: (
      <p className="text-body text-muted-foreground">
        Cookies and similar technologies keep you signed in, remember preferences, and help us understand which
        features are working. You can manage cookies through your browser settings. Some functionality (such as
        secure session handling) requires essential cookies and may not operate if disabled.
      </p>
    ),
  },
  {
    id: 'international',
    title: '7. International Transfers',
    content: (
      <p className="text-body text-muted-foreground">
        We operate globally using cloud infrastructure primarily located in the United States and European Union.
        When information is transferred across borders we implement safeguards such as Standard Contractual
        Clauses or comparable mechanisms and limit access to personnel with a legitimate need.
      </p>
    ),
  },
  {
    id: 'retention',
    title: '8. Retention &amp; Deletion',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          Personal information is retained for as long as your account is active and for a reasonable period
          afterward to comply with legal, accounting, or audit requirements. You can request deletion at any time
          via the in-product request or by emailing privacy@gramorx.com. Learn more on our{' '}
          <Link href="/data-deletion" className="underline">
            Data Deletion
          </Link>{' '}
          page.
        </p>
        <p className="mt-3 text-body text-muted-foreground">
          Backup systems roll off within 90 days. Aggregated or de-identified insights that no longer identify an
          individual may be retained indefinitely.
        </p>
      </>
    ),
  },
  {
    id: 'childrens-privacy',
    title: "9. Children's Privacy",
    content: (
      <p className="text-body text-muted-foreground">
        GramorX is intended for learners 13 years of age or older (or the minimum age in your jurisdiction). We do
        not knowingly collect personal information from children below this threshold. Parents or guardians who
        believe a child has provided information should contact us so we can investigate and delete the data.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: '10. Your Rights',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          Subject to regional laws, you may have the right to access, correct, delete, restrict, or object to the
          processing of your data, as well as the right to portability and to withdraw consent. We respond to
          verified requests within applicable timeframes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/support?topic=privacy">
            <Button variant="primary" size="sm" className="rounded-ds">
              Submit a request
            </Button>
          </Link>
          <a href="mailto:privacy@gramorx.com" className="inline-block">
            <Button variant="secondary" size="sm" className="rounded-ds">
              privacy@gramorx.com
            </Button>
          </a>
        </div>
      </>
    ),
  },
  {
    id: 'changes',
    title: '11. Updates',
    content: (
      <p className="text-body text-muted-foreground">
        We will update this notice when practices change or when required by law. Material changes will be
        communicated through the product or by email, and the &ldquo;Last updated&rdquo; date below will reflect the
        current version.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: (
      <p className="text-body text-muted-foreground">
        Questions or concerns about privacy can be directed to privacy@gramorx.com. If you believe we have not
        addressed an issue, you may contact your local data protection authority.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Notice • GramorX</title>
        <meta
          name="description"
          content="Learn how GramorX collects, uses, and protects personal information for IELTS Prep with AI users."
        />
      </Head>

      <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <header className="mb-12 space-y-4">
            <p className="text-caption uppercase tracking-[0.18em] text-muted-foreground">Legal · Privacy</p>
            <h1 className="font-slab text-display text-gradient-primary">Privacy Notice</h1>
            <p className="max-w-2xl text-body text-muted-foreground">
              Transparency and control are core to the learning experience. This page outlines what data we collect,
              why we process it, and how you can exercise your rights wherever you are located.
            </p>
            <p className="text-small text-muted-foreground">Last updated: {UPDATED_ON}</p>
          </header>

          <Card className="mb-10 rounded-ds-2xl p-6">
            <h2 className="font-slab text-h4">Contents</h2>
            <nav className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-ds border border-lightBorder p-3 text-small transition-colors hover:bg-purpleVibe/10 dark:border-white/10 dark:hover:bg-white/5"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </Card>

          <div className="space-y-8">
            {SECTIONS.map((section) => (
              <Card key={section.id} id={section.id} className="rounded-ds-2xl p-6 scroll-mt-28">
                <h2 className="font-slab text-h3">{section.title}</h2>
                <div className="mt-3 space-y-3">{section.content}</div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
