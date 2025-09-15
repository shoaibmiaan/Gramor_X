import * as React from 'react';

export type UserMenuItem = {
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void;
};

export type UserMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  userId?: string | null;
  items?: UserMenuItem[];
  onSignOut?: () => void;
};

export function UserMenu({
  avatarUrl = null,
  email = null,
  userId = null,
  items = [],
  onSignOut,
}: UserMenuProps) {
  const [open, setOpen] = React.useState(false);

  const initials = React.useMemo(() => {
    if (!email) return 'U';
    const [name] = email.split('@');
    if (!name) return 'U';
    return name
      .split(/[._-]/)
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'U';
  }, [email]);

  const safeItems: UserMenuItem[] = Array.isArray(items) ? items : [];

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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="h-8 w-8 rounded-full bg-primary/20 text-primary grid place-items-center text-small font-semibold"
          >
            {initials}
          </span>
        )}
        <span className="text-small text-foreground/80">
          {email ?? userId ?? 'User'}
        </span>
        <svg
          className="h-4 w-4 opacity-70"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
            clipRule="evenodd"
          />
        </svg>
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
            {safeItems.map((it) => (
              <li key={it.id}>
                {it.href ? (
                  <a
                    href={it.href}
                    className="block px-3 py-2 text-small hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    {it.label}
                  </a>
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
