import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

const EFFECTIVE_DATE = 'May 28, 2024';

const SECTIONS: Array<{
  id: string;
  title: string;
  content: ReactNode;
}> = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: (
      <p className="text-body text-muted-foreground">
        By accessing or using GramorX you agree to these Terms, the Privacy Notice, and any policies referenced
        here. If you are accepting on behalf of an organization, you represent that you have authority to bind
        that organization. If you do not agree, you may not use the service.
      </p>
    ),
  },
  {
    id: 'service',
    title: '2. Service Overview',
    content: (
      <p className="text-body text-muted-foreground">
        GramorX provides IELTS preparation tools, content, and analytics across web and mobile apps. We may
        enhance, modify, or discontinue features with notice where practical. Certain capabilities may be offered
        as beta or preview features and are provided as-is.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: '3. Eligibility &amp; Registration',
    content: (
      <ul className="list-disc space-y-2 pl-6 text-body text-muted-foreground">
        <li>You must be at least 13 years old or the minimum age required in your jurisdiction.</li>
        <li>Provide accurate registration details and keep them current.</li>
        <li>Institutional or guardian-managed accounts must ensure appropriate consent is in place.</li>
      </ul>
    ),
  },
  {
    id: 'account-security',
    title: '4. Account Security',
    content: (
      <p className="text-body text-muted-foreground">
        You are responsible for safeguarding login credentials and for activities that occur under your account.
        Notify us immediately at security@gramorx.com if you suspect unauthorized access. We may suspend accounts
        to protect you, other users, or the platform.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable Use',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          You agree not to misuse the service. Prohibited activities include:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-body text-muted-foreground">
          <li>Cheating, plagiarism, or using GramorX to violate exam policies.</li>
          <li>Reverse engineering, automated scraping, or attempts to access non-public areas.</li>
          <li>Uploading unlawful, defamatory, or infringing content.</li>
          <li>Harassing other users or interfering with platform security.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-content',
    title: '6. User Content &amp; License',
    content: (
      <p className="text-body text-muted-foreground">
        You retain ownership of content you upload. You grant GramorX a worldwide, non-exclusive license to host,
        process, adapt, and display that content solely to operate, secure, and improve the service. You are
        responsible for ensuring you have rights to the material you submit.
      </p>
    ),
  },
  {
    id: 'ai-features',
    title: '7. AI Guidance',
    content: (
      <p className="text-body text-muted-foreground">
        AI-generated scores and recommendations are predictive guidance, not official IELTS scoring. You should
        review suggestions critically and combine them with human instruction. We may use de-identified insights
        derived from your usage to improve models while protecting your privacy.
      </p>
    ),
  },
  {
    id: 'fees',
    title: '8. Plans, Fees &amp; Billing',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          Paid plans, credit packs, or institutional contracts may apply. You agree to pay listed prices and
          applicable taxes. Unless stated otherwise, subscriptions renew automatically until cancelled.
        </p>
        <p className="mt-3 text-body text-muted-foreground">
          If a payment fails we may suspend access to paid functionality. Billing support is available through the
          in-product help desk or by contacting finance@gramorx.com.
        </p>
      </>
    ),
  },
  {
    id: 'cancellations',
    title: '9. Cancellations &amp; Refunds',
    content: (
      <p className="text-body text-muted-foreground">
        You can cancel a subscription at any time to stop future charges. Refund eligibility follows local law and
        any specific promises stated at purchase. Where refunds are not required, we may issue goodwill credits at
        our discretion.
      </p>
    ),
  },
  {
    id: 'privacy',
    title: '10. Privacy',
    content: (
      <p className="text-body text-muted-foreground">
        Our use of personal information is described in the{' '}
        <Link href="/legal/privacy" className="underline">
          Privacy Notice
        </Link>
        . We process data to deliver the service, meet legal obligations, and keep the platform secure.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: '11. Third-Party Services',
    content: (
      <p className="text-body text-muted-foreground">
        Certain features rely on third-party providers (for example: authentication, file storage, payments,
        communications). Their terms may apply when you interact with them. GramorX is not responsible for third
        parties that it does not control.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: '12. Intellectual Property',
    content: (
      <p className="text-body text-muted-foreground">
        The GramorX platform, trademarks, and content we supply are owned by GramorX or its licensors. Except as
        permitted by these Terms, you may not copy, modify, or create derivative works from our materials without
        prior written consent.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: '13. Disclaimers',
    content: (
      <p className="text-body text-muted-foreground">
        The service is provided &ldquo;as is&rdquo; without warranties of any kind, whether express, implied, or
        statutory. We do not guarantee exam outcomes, uninterrupted availability, or error-free operation.
      </p>
    ),
  },
  {
    id: 'liability',
    title: '14. Limitation of Liability',
    content: (
      <p className="text-body text-muted-foreground">
        To the fullest extent permitted by law, GramorX will not be liable for indirect, incidental, or
        consequential damages, loss of profits, or data loss. Our aggregate liability for claims arising out of
        these Terms will not exceed the fees paid by you in the three months preceding the claim.
      </p>
    ),
  },
  {
    id: 'indemnity',
    title: '15. Indemnification',
    content: (
      <p className="text-body text-muted-foreground">
        You agree to indemnify and hold GramorX, its affiliates, and personnel harmless from claims, damages, or
        expenses arising from your misuse of the service or violation of these Terms or applicable laws.
      </p>
    ),
  },
  {
    id: 'termination',
    title: '16. Suspension &amp; Termination',
    content: (
      <p className="text-body text-muted-foreground">
        You may stop using the service at any time. We may suspend or terminate access for breach, non-payment,
        unlawful activity, or risk to users. Sections that by their nature should survive termination (including
        ownership, disclaimers, and limitations) will continue in effect.
      </p>
    ),
  },
  {
    id: 'law',
    title: '17. Governing Law &amp; Dispute Resolution',
    content: (
      <p className="text-body text-muted-foreground">
        These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law
        principles. Disputes will be resolved exclusively in the state or federal courts located in Wilmington,
        Delaware, unless your local law requires otherwise.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '18. Changes to Terms',
    content: (
      <p className="text-body text-muted-foreground">
        We may update these Terms when we launch new features or when legal requirements change. We will provide
        notice of material updates through the product or by email. Continued use of the service after the notice
        takes effect constitutes acceptance of the revised Terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '19. Contact',
    content: (
      <>
        <p className="text-body text-muted-foreground">
          Questions about these Terms can be directed to legal@gramorx.com. Billing or account support is available
          via the help desk.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/support?topic=billing">
            <Button variant="primary" size="sm" className="rounded-ds">
              Contact support
            </Button>
          </Link>
          <a href="mailto:legal@gramorx.com" className="inline-block">
            <Button variant="secondary" size="sm" className="rounded-ds">
              legal@gramorx.com
            </Button>
          </a>
        </div>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service • GramorX</title>
        <meta
          name="description"
          content="Review the Terms of Service that govern access to GramorX IELTS Prep with AI."
        />
      </Head>

      <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <header className="mb-12 space-y-4">
            <p className="text-caption uppercase tracking-[0.18em] text-muted-foreground">Legal · Terms</p>
            <h1 className="font-slab text-display text-gradient-primary">Terms of Service</h1>
            <p className="max-w-2xl text-body text-muted-foreground">
              These Terms set the rules for using GramorX. They describe your responsibilities, how subscriptions
              and credits work, and what to expect from our AI-powered learning tools.
            </p>
            <p className="text-small text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
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
