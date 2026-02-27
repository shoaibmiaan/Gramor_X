// components/layouts/SupportLayout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';

interface SupportLayoutProps {
  children: ReactNode;
  userRole?: string;
}

export function SupportLayout({ children, userRole }: SupportLayoutProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const isActive = (path: string) => currentPath.startsWith(path);

  const supportLinks = [
    { href: '/support', label: 'Help Center', icon: '❓' },
    { href: '/support/contact', label: 'Contact Support', icon: '📞' },
    { href: '/support/tickets', label: 'My Tickets', icon: '🎫' },
    { href: '/faq', label: 'FAQ', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl">
        <div className="border-b p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Support Center</h1>
              <p className="text-muted-foreground">Get help and find answers to your questions</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/support/contact">Contact Us</Link>
            </Button>
          </div>

          {/* Navigation tabs */}
          <nav className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
            {supportLinks.map((link) => (
              <Button key={link.href} variant={isActive(link.href) ? 'secondary' : 'ghost'} size="sm" asChild>
                <Link href={link.href}>
                  <span className="flex items-center gap-2">
                    <span>{link.icon}</span>
                    {link.label}
                  </span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export default SupportLayout;
