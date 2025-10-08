'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { NavLink } from '@/components/design-system/NavLink';
import { SocialIconLink } from '@/components/design-system/SocialIconLink';
import { Icon } from '@/components/design-system/Icon';
import { Twitter, Facebook, Instagram, Youtube } from 'lucide-react';
import { navigationSchema } from '@/config/navigation';
import { filterNavSections } from '@/lib/navigation/utils';

const year = new Date().getFullYear();

export const Footer: React.FC = () => {
  const columns = React.useMemo(() => filterNavSections(navigationSchema.footer, { isAuthenticated: false, tier: 'free' }), []);

  return (
    <footer className="relative mt-16 border-t border-border bg-background">
      <div
        className="h-1 w-full bg-gradient-to-r from-vibrantPurple via-electricBlue to-neonGreen opacity-80"
        aria-hidden="true"
      />
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-slab text-h2">Ready to boost your IELTS score?</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Unlock AI-powered practice, weekly challenges, and personalised coaching in one workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-muted"
            >
              View pricing
            </Link>
          </div>
        </div>

        <div className="grid gap-10 border-t border-border py-12 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="font-slab text-h3 font-bold">
                <span className="text-gradient-primary">GramorX</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-small text-muted-foreground">
              AI-powered IELTS prep built by educators and engineers to help you improve faster with clarity and confidence.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <SocialIconLink
                href="https://x.com/gramor_x"
                icon={<Twitter aria-hidden className="h-5 w-5" />}
                label="X (Twitter)"
              />
              <SocialIconLink
                href="https://facebook.com/gramor_x"
                icon={<Facebook aria-hidden className="h-5 w-5" />}
                label="Facebook"
              />
              <SocialIconLink
                href="https://instagram.com/gramor_x"
                icon={<Instagram aria-hidden className="h-5 w-5" />}
                label="Instagram"
              />
              <SocialIconLink
                href="https://youtube.com/@gramor_x"
                icon={<Youtube aria-hidden className="h-5 w-5" />}
                label="YouTube"
              />
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.id}>
              <h3 className="mb-3 font-slab text-h4">{column.label}</h3>
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item.id}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target={item.target ?? '_blank'}
                        rel="noreferrer"
                        className="text-small text-muted-foreground transition hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <NavLink
                        href={item.href}
                        className="text-small text-muted-foreground transition hover:text-foreground"
                      >
                        {item.label}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-6 text-small text-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} GramorX — Built by Solvio Advisors | Global Edition (🇺🇸 / 🇵🇰)</p>
          <div className="flex flex-wrap items-center gap-4">
            <NavLink href="/legal/terms" className="hover:text-foreground">
              Terms
            </NavLink>
            <NavLink href="/legal/privacy" className="hover:text-foreground">
              Privacy
            </NavLink>
            <NavLink href="/legal/terms#refunds" className="hover:text-foreground">
              Refund Policy
            </NavLink>
            <a
              href="#top"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:bg-muted"
              aria-label="Back to top"
            >
              <Icon name="ArrowUp" className="h-3.5 w-3.5" />
              <span>Back to top</span>
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
