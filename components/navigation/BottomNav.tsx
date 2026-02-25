// File: components/layout/BottomNav.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/design-system/Icon';
import { NavLink } from '@/components/design-system/NavLink';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion'; // Added for slide-up animation on scroll

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; icon: IconName; exact?: boolean }> = [
  { href: '/', label: 'Home', icon: 'Home', exact: true },
  { href: '/learning', label: 'Courses', icon: 'BookOpen' },
  { href: '/mock', label: 'Tests', icon: 'PencilLine' },
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
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="
        fixed bottom-0 left-0 right-0 z-40 md:hidden
        border-t border-border dark:border-border-dark
        bg-card/90 dark:bg-card-dark/90 backdrop-blur supports-[backdrop-filter]:bg-card/70
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
                text-caption text-muted-foreground dark:text-muted-foreground-dark transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border dark:focus-visible:ring-border-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background
                [&.is-active]:text-primary dark:[&.is-active]:text-primary-dark
              "
              aria-label={label}
            >
              <span
                className="
                  inline-flex h-9 w-9 items-center justify-center rounded-full transition
                  group-[.is-active]:bg-primary/15 dark:group-[.is-active]:bg-primary-dark/15 group-hover:bg-primary/10 dark:group-hover:bg-primary-dark/10
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
    </motion.nav>
  );
};

export default BottomNav;