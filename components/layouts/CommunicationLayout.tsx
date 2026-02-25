// components/layouts/CommunicationLayout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';

interface CommunicationLayoutProps {
  children: ReactNode;
  userRole?: string;
}

export function CommunicationLayout({ children }: CommunicationLayoutProps) {
  const router = useRouter();
  const currentPath = router.pathname;
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-80 flex-col border-r bg-card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Stay connected with your community
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          <Button
            variant={isActive('/messages') ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href="/messages">
              <span className="flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4" />
                Direct Messages
              </span>
            </Link>
          </Button>

          <Button
            variant={isActive('/chat') ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href="/chat">
              <span className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Group Chats
              </span>
            </Link>
          </Button>

          <Button
            variant={isActive('/inbox') ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href="/inbox">
              <span className="flex items-center gap-2">
                <InboxIcon className="h-4 w-4" />
                Inbox
              </span>
            </Link>
          </Button>
        </nav>

        {/* Recent conversations placeholder */}
        <div className="border-t p-4">
          <h3 className="mb-2 text-sm font-medium">Recent Conversations</h3>
          <div className="space-y-2">
            <Card className="cursor-pointer p-3 hover:bg-accent">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs font-medium">JD</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">John Doe</p>
                  <p className="truncate text-xs text-muted-foreground">
                    See you in class!
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

// Minimal inline icons (keeps deps simple)
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );
}
function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

export default CommunicationLayout;
