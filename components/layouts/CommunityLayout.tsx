// components/layouts/CommunityLayout.tsx
import * as React from 'react';
import { UsersRound, MessageCircle, MessagesSquare, Handshake, Megaphone } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const CommunityLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="accent">Live now</Badge>
        <span className="text-sm font-medium">Speaking circle · 48 learners</span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">New answers today</span>
          <span className="text-2xl font-bold text-gradient-accent">132</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Peer reviews pending</span>
          <span className="text-sm font-semibold">5 drafts</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-accent/10 via-background to-background text-foreground">
      <LayoutHero
        accent="community"
        eyebrow="Community & Support"
        title="Ask, share, and grow with peers pursuing the same IELTS goal"
        description="Join live chats, crowdsource answers, and get thoughtful feedback from mentors and fellow learners."
        actions={(
          <>
            <Button href="/community/chat" size="lg">
              Jump into chat
            </Button>
            <Button href="/community/review" variant="soft" tone="accent" size="lg">
              Request peer review
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Community sections"
          defaultActiveClassName="is-active border-transparent bg-accent/20 text-accent ring-1 ring-accent/30 shadow-md"
          items={[
            { href: '/community', label: 'Feed', icon: <UsersRound className="h-4 w-4" /> },
            { href: '/community/questions', label: 'Questions', icon: <MessageCircle className="h-4 w-4" /> },
            { href: '/community/chat', label: 'Chat', icon: <MessagesSquare className="h-4 w-4" /> },
            { href: '/community/review', label: 'Peer Reviews', icon: <Handshake className="h-4 w-4" /> },
            { href: '/community/announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="community">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default CommunityLayout;
export { CommunityLayout };
