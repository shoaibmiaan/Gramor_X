import Link from 'next/link';

const sidebarItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Performance', href: '#performance' },
  { label: 'Practice', href: '#practice' },
  { label: 'Goals', href: '#goals' },
  { label: 'Settings', href: '/settings' },
];

const Sidebar = () => {
  return (
    <aside className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Navigation
      </p>
      <nav>
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
