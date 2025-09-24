import * as React from 'react';
import Link from 'next/link'; // ✅ Use Link for internal navigation
import Image from 'next/image';

export type UserMenuItem = {
  id: string;
  label: string;
  href?: string;        // internal or external
  onSelect?: () => void;
};

export type UserMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  userId?: string | null;
  items?: UserMenuItem[];
  onSignOut?: () => void;

  /** NEW: when true, shows "Admin Panel" in the dropdown */
  isAdmin?: boolean;
  /** NEW: href for the admin link (defaults to /admin) */
  adminHref?: string;
};

export function UserMenu({
  avatarUrl = null,
  email = null,
  userId = null,
  items = [],
  onSignOut,
  isAdmin = false,
  adminHref = '/admin',
}: UserMenuProps) {
  const [open, setOpen] = React.useState(false);

  const initials = React.useMemo(() => {
    if (!email && !userId) return 'U';
    const [name] = (email ?? userId).split('@');
    if (!name) return 'U';
    return (
      name
        .split(/[._-]/)
        .filter(Boolean)
        .map((s) => s[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'U'
    );
  }, [email, userId]);

  // Build final menu items: caller items + conditional Admin Panel
  const safeItems: UserMenuItem[] = Array.isArray(items) ? items : [];
  const finalItems: UserMenuItem[] = React.useMemo(() => {
    const base = [...safeItems];
    if (isAdmin) {
      const adminItem: UserMenuItem = { id: 'admin', label: 'Admin Panel', href: adminHref };
      if (base.length >= 1) base.splice(1, 0, adminItem);
      else base.unshift(adminItem);
    }
    return base;
  }, [safeItems, isAdmin, adminHref]);

  // Helper: internal link detection
  const isInternal = (href?: string) => !!href && href.startsWith('/');

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-ds-xl border border-white/10 px-3 py-2 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="User Avatar"
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="h-8 w-8 rounded-full bg-primary/20 text-primary grid place-items-center text-small font-semibold"
          >
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-ds-xl border border-white/10 bg-background/95 backdrop-blur-lg shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3 py-2 border-b border-white/10">
            <div className="text-small font-medium">{email ?? 'User'}</div>
            {userId && <div className="text-caption opacity-70">{userId}</div>}
          </div>

          <ul className="py-1">
            {finalItems.map((it) => (
              <li key={it.id}>
                {it.href ? (
                  isInternal(it.href) ? (
                    <Link
                      href={it.href}
                      className="block px-3 py-2 text-small hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      {it.label}
                    </Link>
                  ) : (
                    <a
                      href={it.href}
                      className="block px-3 py-2 text-small hover:bg-white/5"
                      onClick={() => setOpen(false)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {it.label}
                    </a>
                  )
                ) : (
                  <button
                    type="button"
                    className="w-full text-left block px-3 py-2 text-small hover:bg-white/5"
                    onClick={() => {
                      setOpen(false);
                      it.onSelect?.();
                    }}
                  >
                    {it.label}
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10">
            <button
              type="button"
              className="w-full text-left block px-3 py-2 text-small text-danger hover:bg-danger/10"
              onClick={() => {
                setOpen(false);
                onSignOut?.();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
