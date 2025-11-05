// components/layouts/CommunityLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

const CommunityLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <LayoutHero
        accent="community"
        icon={Users}
        eyebrow="Community Hub"
        title="Connect & Collaborate"
        subtitle="Ask questions, join live chats, and exchange peer feedback to level up faster together."
        actions={
          <Button asChild variant="soft" tone="accent" elevateOnHover>
            <Link href="/community/post">Start a discussion</Link>
          </Button>
        }
        quickNav={{
          ariaLabel: 'Community sections',
          items: [
            { href: '/community', label: 'Feed' },
            { href: '/community/questions', label: 'Questions' },
            { href: '/community/chat', label: 'Chat' },
            { href: '/community/review', label: 'Peer Reviews' },
          ],
        }}
      >
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-rose-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-rose-100/90">
          Hot today: Share your writing Task 2 for instant peer critique.
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-rose-900/80 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-rose-100/80">
          Pro tip: mention @Coach to invite mentors into your thread.
        </div>
      </LayoutHero>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-4 shadow-[0_25px_55px_rgba(244,114,182,0.18)] dark:shadow-none">{children}</div>
      </Container>
    </div>
  );
};

export default CommunityLayout;
export { CommunityLayout };
