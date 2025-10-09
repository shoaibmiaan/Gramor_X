'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import type { ModuleLink } from './constants';
import { MODULE_LINKS } from './constants';

interface ModuleMenuProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  modulesRef: React.RefObject<HTMLLIElement>;
  label?: string;
}

const toneStyles: Record<NonNullable<ModuleLink['tone']>, string> = {
  blue: 'bg-electricBlue/10 text-electricBlue ring-electricBlue/20 group-hover:bg-electricBlue group-hover:text-white group-hover:ring-electricBlue/40',
  purple: 'bg-purpleVibe/10 text-purpleVibe ring-purpleVibe/20 group-hover:bg-purpleVibe group-hover:text-white group-hover:ring-purpleVibe/40',
  orange: 'bg-orange-500/10 text-orange-500 ring-orange-500/20 group-hover:bg-orange-500 group-hover:text-white group-hover:ring-orange-500/40',
  green: 'bg-neonGreen/15 text-neonGreen ring-neonGreen/25 group-hover:bg-neonGreen group-hover:text-dark group-hover:ring-neonGreen/50',
};

const getToneClass = (tone?: ModuleLink['tone']) =>
  tone
    ? toneStyles[tone]
    : 'bg-primary/10 text-primary ring-primary/15 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/40';

export function ModuleMenu({ open, setOpen, modulesRef, label = 'Practice' }: ModuleMenuProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), [setOpen]);

  const TRIGGER_ID = 'desktop-modules-trigger';
  const MENU_ID = 'desktop-modules-menu';

  // Focus mgmt
  React.useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('a,button')?.focus();
  }, [open]);
  const wasOpen = React.useRef(open);
  React.useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Outside click + ESC + simple focus trap
  React.useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t) && !modulesRef.current?.contains(t)) {
        close();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !menuRef.current) return;

      const focusables = menuRef.current.querySelectorAll<HTMLElement>('a,button,[tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!menuRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, modulesRef]);

  // Desktop overlay (prevents clicks through)
  const desktopOverlay =
    typeof document !== 'undefined' && open
      ? createPortal(
          <div className="fixed inset-0 z-40 hidden md:block bg-transparent" aria-hidden="true" onClick={close} />,
          document.body
        )
      : null;

  return (
    <li className="relative" ref={modulesRef}>
      {/* Trigger */}
      <button
        id={TRIGGER_ID}
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={MENU_ID}
        className={`nav-pill gap-2 text-small font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background ${open ? 'is-active' : ''}`}
      >
        <span>{label}</span>
        <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </svg>
      </button>

      {/* ===================== Desktop dropdown ===================== */}
      {open && (
        <div
          id={MENU_ID}
          role="menu"
          aria-labelledby={TRIGGER_ID}
          ref={menuRef}
          className="absolute left-1/2 top-full z-50 mt-4 hidden w-[720px] max-w-[98vw] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl ring-1 ring-black/5 backdrop-blur md:block lg:w-[860px] xl:w-[960px] dark:bg-dark/95"
        >
          <div className="grid grid-cols-12 divide-y divide-border/60 md:divide-y-0 md:divide-x">
            <div className="col-span-8 bg-card/90 p-6 lg:p-8">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-slab text-h4">Practice modules</h3>
                  <p className="text-small text-muted-foreground">
                    Choose the room that matches your next focus and preview what you&apos;ll sharpen inside.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-electricBlue/15 text-electricBlue">●</span>
                  Guided flow
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MODULE_LINKS.map(({ href, label: moduleLabel, desc, Icon, badge, tone, kbd }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={close}
                    className="group relative flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-transparent hover:bg-primary/10 hover:shadow-glow dark:bg-dark/60"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-2 transition-all duration-200 ${getToneClass(tone)}`}
                      aria-hidden="true"
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                    </span>

                    <span className="min-w-0 space-y-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{moduleLabel}</span>
                        {badge && (
                          <span className="inline-flex items-center rounded-full bg-electricBlue/10 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-electricBlue">
                            {badge}
                          </span>
                        )}
                      </span>
                      {desc && <span className="text-small text-muted-foreground">{desc}</span>}
                      {kbd && (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground/80">
                          <span className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-semibold">{kbd}</span>
                          shortcut
                        </span>
                      )}
                    </span>

                    <svg className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-electricBlue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>

                    <span
                      aria-hidden="true"
                      className="absolute left-4 right-4 bottom-2 h-[3px] rounded-full bg-electricBlue/70 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 dark:bg-neonGreen/70"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: CTA rail */}
            <div className="col-span-4 bg-muted/60 p-6 lg:p-7 dark:bg-purpleVibe/20">
              <div>
                <h4 className="font-slab text-h4 mb-1">New here?</h4>
                <p className="text-small text-muted-foreground">
                  Take a quick placement to get a personalised sequence of drills that adapts every week.
                </p>
              </div>

              <Link
                href="/placement"
                role="menuitem"
                onClick={close}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl btn btn-primary btn--fx px-4 py-2"
              >
                Start placement
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>

              <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-4 text-left shadow-sm">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">What&apos;s inside</div>
                <ul className="space-y-2 text-small text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-electricBlue/15 text-electricBlue">•</span>
                    Smart spacing that balances weak skills.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purpleVibe/15 text-purpleVibe">•</span>
                    Instant scoring with human-reviewed escalations.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neonGreen/15 text-neonGreen">•</span>
                    Daily rituals that keep your streak alive.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {desktopOverlay}

      {/* ===================== Mobile sheet ===================== */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-x-0 top-0 z-50 md:hidden border-b border-border bg-card shadow-xl animate-in slide-in-from-top-2 duration-150 dark:bg-dark"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            ref={menuRef}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="font-slab text-h4">{label}</h3>
              <button onClick={close} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-4 pb-4">
              <div className="rounded-xl border border-border bg-card p-3 dark:bg-darker">
                <div className="mb-3">
                  <div className="font-medium">Practice modules</div>
                  <div className="text-small text-muted-foreground">Tap a room to jump straight into focused drills.</div>
                </div>

                <ul className="space-y-1">
                  {MODULE_LINKS.map(({ href, label: moduleLabel, desc, Icon, tone }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={close}
                        className="group relative flex items-start gap-3 rounded-lg px-3 py-3 transition hover:bg-primary/10 hover:shadow-glow dark:hover:bg-purpleVibe/20"
                      >
                        <span
                          className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-2 transition ${getToneClass(tone)}`}
                          aria-hidden="true"
                        >
                          {Icon ? <Icon className="h-5 w-5" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">{moduleLabel}</span>
                          {desc && <span className="text-small text-muted-foreground">{desc}</span>}
                        </span>
                        <span
                          aria-hidden="true"
                          className="absolute left-4 right-4 bottom-1.5 h-[3px] rounded-full bg-electricBlue/70 opacity-0 translate-y-1 transition group-hover:translate-y-0 group-hover:opacity-100 dark:bg-neonGreen/70"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3 dark:bg-purpleVibe/20">
                <div className="mb-2">
                  <div className="font-slab text-h4">New here?</div>
                  <div className="text-small text-muted-foreground">Take a quick placement to get a personalised start.</div>
                </div>
                <Link href="/placement" onClick={close} className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn btn-primary btn--fx px-4 py-3">
                  Start placement
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </li>
  );
}

export default ModuleMenu;
