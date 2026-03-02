import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Sidebar, DASHBOARD_NAV_ITEMS } from '@/components/dashboard/Sidebar';
import { TopNavbar } from '@/components/dashboard/TopNavbar';

export function DashboardLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar
            onToggleSidebar={() => setCollapsed((prev) => !prev)}
            onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
            sidebarCollapsed={collapsed}
          />

          {mobileNavOpen ? (
            <nav className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
              <ul className="grid gap-2">
                {DASHBOARD_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                      )}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <main className="space-y-6 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
