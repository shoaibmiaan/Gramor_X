// components/layouts/LearningLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';

const LearningLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useRouter();
  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`nav-pill shrink-0 whitespace-nowrap ${active ? 'bg-primary/10 text-primary' : ''}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <section className="border-b border-border bg-card/30">
        <Container className="flex flex-col gap-4 py-5 pt-safe sm:py-6">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Learning & Studio</h1>
            <p className="text-small text-mutedText">
              Lessons, drills, strategies — and your content studio.
            </p>
          </div>
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto pb-1"
            aria-label="Learning sections"
          >
            <div className="flex gap-2 px-1">
              <Item href="/learning" label="Overview" />
              <Item href="/learning/skills" label="Skills" />
              <Item href="/learning/skills/lessons" label="Lessons" />
              <Item href="/learning/strategies" label="Strategies" />
              <Item href="/content/studio" label="Studio" />
            </div>
          </nav>
        </Container>
      </section>

      <Container className="py-6">
        <div className="card-surface rounded-ds-2xl p-4">{children}</div>
      </Container>
    </div>
  );
};

export default LearningLayout;
export { LearningLayout };
