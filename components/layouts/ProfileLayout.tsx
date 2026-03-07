// components/layouts/ProfileLayout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';

interface ProfileLayoutProps {
  children: ReactNode;
  userRole?: string;
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Button asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start" size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
  const router = useRouter();
  const path = router.pathname;
  const { t } = useLocale();
  const { error: toastError } = useToast();

  const isActive = (basePath: string, exact = false) => {
    if (exact) return path === basePath;
    return path === basePath || path.startsWith(`${basePath}/`);
  };

  const handleLogout = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      router.push('/login');
    } catch (err) {
      toastError(t('common.logoutError', 'Failed to log out. Please try again.'));
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 flex-1">
          <div className="px-2 pb-3 text-sm font-medium text-muted-foreground">
            {t('profile.sidebar.title', 'Profile')}
          </div>
          <nav className="space-y-1">
            <NavItem href="/profile" label={t('profile.sidebar.overview', 'Overview')} active={isActive('/profile')} />
            <NavItem href="/account" label={t('profile.sidebar.account', 'Account')} active={isActive('/account')} />
            <NavItem href="/settings/security" label={t('profile.sidebar.security', 'Security')} active={isActive('/settings/security')} />
            <NavItem href="/settings/notifications" label={t('profile.sidebar.notifications', 'Notifications')} active={isActive('/settings/notifications')} />
            <NavItem href="/settings" label={t('profile.sidebar.preferences', 'Preferences')} active={isActive('/settings', true)} />
          </nav>
        </div>

        {/* Bottom utility section */}
        <div className="p-4 border-t border-border space-y-1">
          <NavItem href="/support" label={t('profile.sidebar.help', 'Help & Support')} active={isActive('/support')} />
          <Button variant="ghost" className="w-full justify-start" size="sm" onClick={handleLogout}>
            {t('profile.sidebar.logout', 'Logout')}
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export default ProfileLayout;