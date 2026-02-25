// components/layouts/ProfileLayout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';

interface ProfileLayoutProps {
  children: ReactNode;
  userRole?: string;
}

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Button
      asChild
      variant={active ? 'secondary' : 'ghost'}
      className="w-full justify-start"
      size="sm"
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
  const router = useRouter();
  const path = router.pathname;

  const isActive = (p: string) => path === p || path.startsWith(`${p}/`);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <div className="p-4">
          <div className="px-2 pb-3 text-sm font-medium text-muted-foreground">
            Profile
          </div>
          <nav className="space-y-1">
            <NavItem href="/profile" label="Overview" active={isActive('/profile')} />
            <NavItem href="/account" label="Account" active={isActive('/profile/account')} />
            <NavItem href="/profile/security" label="Security" active={isActive('/profile/security')} />
            <NavItem href="/profile/notifications" label="Notifications" active={isActive('/profile/notifications')} />
            <NavItem href="/profile/preferences" label="Preferences" active={isActive('/profile/preferences')} />
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export default ProfileLayout;
