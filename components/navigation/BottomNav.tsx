'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/design-system/Icon';
import { NavLink } from '@/components/design-system/NavLink';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; icon: IconName; exact?: boolean }> = [
  { href: '/', label: 'Home', icon: 'Home', exact: true },
  { href: '/learning', label: 'Courses', icon: 'BookOpen' },
  { href: '/mock-tests', label: 'Tests', icon: 'PencilLine' },
  { href: '/profile', label: 'Profile', icon: 'User' },
];

export const BottomNav: React.FC = () => {
  const router = useRouter();
  const [hasSession, setHasSession] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to get session:', error);
          return;
        }
        if (mounted) {
          setHasSession(Boolean(session));
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const gate = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasSession) {
      e.preventDefault();
      router.push('/login?next=' + encodeURIComponent(href));
    }
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40 md:hidden
        border-t border-border
        bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70
      "
      aria-label="Bottom navigation"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon, exact }) => (
          <li key={href} className="contents">
            <NavLink
              href={href}
              exact={exact}
              onClick={gate(href)}
              className="
                group flex flex-col items-center gap-1 py-2.5
                text-caption text-muted-foreground transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background
                [&.is-active]:text-primary
              "
              aria-label={label}
            >
              <span
                className="
                  inline-flex h-9 w-9 items-center justify-center rounded-full transition
                  group-[.is-active]:bg-primary/15 group-hover:bg-primary/10
                "
                aria-hidden="true"
              >
                <Icon name={icon} className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;