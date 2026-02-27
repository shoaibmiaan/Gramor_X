import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reading', href: '/dashboard/reading' },
  { label: 'Writing', href: '/dashboard/writing' },
  { label: 'Speaking', href: '/dashboard/speaking' },
  { label: 'AI Reports', href: '/dashboard/ai-reports' },
  { label: 'Study Plan', href: '/dashboard/progress' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Settings', href: '/settings' },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();

  return (
    <aside
      className={clsx(
        'sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white/90 px-3 py-6 transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/80 md:flex',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="mb-8 px-2 text-sm font-semibold tracking-wide text-indigo-600">
        GramorX AI
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex rounded-xl px-3 py-2 text-sm transition-colors',
              router.pathname === item.href
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {collapsed ? item.label.charAt(0) : item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
