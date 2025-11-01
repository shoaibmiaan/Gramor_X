// components/layouts/CommunityLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const CommunityLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <section className="border-b border-border bg-card/30">
        <Container className="flex flex-col gap-4 py-5 pt-safe sm:py-6">
          <div className="space-y-1">
            <h1 className="font-slab text-h3 sm:text-h2">Community</h1>
            <p className="text-small text-mutedText">
              Ask questions, chat, and get feedback from peers.
            </p>
          </div>
          <LayoutQuickNav
            ariaLabel="Community sections"
            defaultActiveClassName="bg-accent/10 text-accent"
            items={[
              { href: '/community', label: 'Feed' },
              { href: '/community/questions', label: 'Questions' },
              { href: '/community/chat', label: 'Chat' },
              { href: '/community/review', label: 'Peer Reviews' },
            ]}
          />
        </Container>
      </section>

      <Container className="py-6">
        <div className="card-surface rounded-ds-2xl p-4">{children}</div>
      </Container>
    </div>
  );
};

export default CommunityLayout;
export { CommunityLayout };
