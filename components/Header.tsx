// components/Header.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';
import DesktopNav from '@/components/navigation/DesktopNav';
import MobileNav from '@/components/navigation/MobileNav';
import { useHeaderState } from '@/components/hooks/useHeaderState';
import { useUserContext } from '@/context/UserContext';
import { PremiumRoomManager } from '@/premium-ui/access/roomUtils';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/search/types';

export const Header: React.FC<{ streak?: number }> = ({ streak }) => {
  const [openDesktopModules, setOpenDesktopModules] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { user, role, loading } = useUserContext();
  const { streak: streakState, ready, signOut, subscriptionTier } = useHeaderState(streak);

  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [premiumRooms, setPremiumRooms] = useState<string[]>([]);

  const headerRef = useRef<HTMLElement>(null);
  const modulesRef = useRef<HTMLLIElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
    setSearchError(null);
  }, []);

  // Scroll → toggle solid header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Load premium access from local storage
  useEffect(() => {
    const sync = () => {
      const list = PremiumRoomManager.getAccessList();
      setHasPremiumAccess(list.length > 0);
      setPremiumRooms(list.map((r) => r.roomName));
    };
    sync();
    const onStorage = (e: StorageEvent) => e.key === 'premiumRooms' && sync();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Global ESC + click-away
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (modulesRef.current && !modulesRef.current.contains(t)) setOpenDesktopModules(false);
      if (showSearch && searchContainerRef.current && !searchContainerRef.current.contains(t)) {
        closeSearch();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDesktopModules(false);
        setMobileOpen(false);
        setMobileModulesOpen(false);
        closeSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [closeSearch, showSearch]);

  // Autofocus search
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [showSearch]);

  // Fetch search suggestions/results when query changes
  useEffect(() => {
    if (!showSearch) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const query = searchQuery.trim();
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = (await response.json()) as { results?: SearchResult[] };
        setSearchResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[Header] search request failed', err);
        setSearchResults([]);
        setSearchError('Unable to search right now. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, showSearch]);

  const clearPremium = () => {
    PremiumRoomManager.clearAllAccess();
    setHasPremiumAccess(false);
    setPremiumRooms([]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (searchResults[0]) {
        router.push(searchResults[0].href).catch((err) => {
          console.error('[Header] failed to navigate to search result', err);
        });
        closeSearch();
      }
      return;
    }

    const topResult = searchResults[0];
    if (topResult) {
      router.push(topResult.href).catch((err) => {
        console.error('[Header] failed to navigate to search result', err);
      });
      closeSearch();
    }
  };

  const handleResultSelect = useCallback(
    (href: string) => {
      router.push(href).catch((err) => {
        console.error('[Header] failed to navigate to search result', err);
      });
      closeSearch();
    },
    [closeSearch, router],
  );

  const typeLabels: Record<SearchResult['type'], string> = {
    module: 'Module',
    course: 'Course',
    lesson: 'Lesson',
    vocabulary: 'Vocabulary',
    resource: 'Resource',
  };

  const solidHeader = scrolled || openDesktopModules || mobileOpen;

  // Loading skeleton
  if (loading && !user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/90 backdrop-blur-lg">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-xl bg-border" />
              <div className="space-y-1">
                <div className="h-3 w-28 animate-pulse rounded bg-border" />
                <div className="h-2.5 w-20 animate-pulse rounded bg-border" />
              </div>
            </div>
            <div className="h-8 w-20 animate-pulse rounded-full bg-border" />
          </div>
        </Container>
      </header>
    );
  }

  return (
    <>
      {/* 🔎 SEARCH OVERLAY */}
      {showSearch && (
        <div className="fixed inset-0 z-[70] bg-surface/95 backdrop-blur-lg">
          <Container>
            <div ref={searchContainerRef} className="flex flex-col items-center gap-6 pt-4 pb-8">
              <div className="flex w-full max-w-3xl items-center gap-3">
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <Icon
                      name="Search"
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search vocabulary, grammar, or mock tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 pl-10 text-base shadow-sm outline-none transition focus:border-electricBlue focus:bg-background"
                    />
                  </div>
                </form>

                <button
                  type="button"
                  onClick={closeSearch}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Close search"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-xl">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {searchQuery.trim() ? `Results for “${searchQuery.trim()}”` : 'Recommended destinations'}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Press Esc to close</span>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {searchLoading ? (
                    <div className="flex flex-col gap-3 px-6 py-6">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="animate-pulse rounded-xl border border-border/40 bg-muted/30 p-4">
                          <div className="h-4 w-32 rounded bg-border/80" />
                          <div className="mt-2 h-3 w-3/4 rounded bg-border/60" />
                        </div>
                      ))}
                    </div>
                  ) : searchError ? (
                    <div className="px-6 py-10 text-center text-sm text-danger">{searchError}</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                      {searchQuery.trim()
                        ? 'No results matched your search. Try a different keyword.'
                        : 'Type to discover lessons, modules, and vocabulary instantly.'}
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/40" role="list">
                      {searchResults.map((result) => (
                        <li key={result.id}>
                          <button
                            type="button"
                            onClick={() => handleResultSelect(result.href)}
                            className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left transition hover:bg-primary/10"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="info" size="xs">
                                  {typeLabels[result.type] || 'Result'}
                                </Badge>
                                <span className="font-medium text-sm text-foreground line-clamp-1">
                                  {result.title}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {result.description}
                              </p>
                              {result.snippet ? (
                                <p className="mt-2 line-clamp-1 text-[11px] text-muted-foreground/80">
                                  {result.snippet}
                                </p>
                              ) : null}
                            </div>
                            <Icon name="ArrowUpRight" size={16} className="mt-1 text-muted-foreground/70" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* 🔥 MAIN HEADER */}
      <header
        ref={headerRef}
        role="banner"
        className={cn(
          'sticky top-0 z-50 w-full backdrop-blur-xl transition-all duration-300 border-b',
          solidHeader
            ? 'bg-lightBg/90 dark:bg-surface/90 border-border/60 shadow-sm'
            : 'bg-transparent border-transparent'
        )}
      >
        {/* Subtle streak bar */}
        {user?.id && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/40">
            <progress
              value={Math.min(streakState ?? 0, 10)}
              max={10}
              aria-label="Daily streak progress"
              className="block h-1 w-full appearance-none
                [&::-webkit-progress-bar]:bg-transparent
                [&::-webkit-progress-value]:bg-primary
                [&::-moz-progress-bar]:bg-primary"
            />
          </div>
        )}

        <Container>
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo */}
            <Link
              href={user?.id ? '/dashboard' : '/'}
              aria-label="Go to GramorX home"
              className="group flex items-center gap-2 transition-transform hover:scale-[1.01]"
            >
              <Image
                src="/brand/logo.png"
                alt="GramorX logo"
                width={36}
                height={36}
                className="rounded-xl"
              />

              <span className="flex flex-col leading-tight">
                <span className="bg-gradient-to-r from-electricBlue to-purpleVibe bg-clip-text font-slab text-base font-bold text-transparent md:text-lg">
                  GramorX
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  IELTS Mission Control
                </span>
              </span>

              <Badge
                variant="outline"
                size="sm"
                className="ml-1 border-electricBlue/30 text-electricBlue"
              >
                BETA
              </Badge>
            </Link>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-2">
              {/* Search button (desktop) */}
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="hidden items-center gap-2 rounded-full border border-border/60 bg-surface/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:border-border focus-visible:ring-2 focus-visible:ring-border md:flex"
              >
                <Icon name="Search" size={14} />
                <span>Search...</span>
                <kbd className="hidden rounded-full border border-border bg-muted px-2 py-[1px] text-[10px] uppercase tracking-wide text-muted-foreground lg:inline-flex">
                  ⌘K
                </kbd>
              </button>

              {/* Desktop nav */}
              <DesktopNav
                user={user}
                role={role ?? 'guest'}
                ready={ready}
                streak={streakState}
                openModules={openDesktopModules}
                setOpenModules={setOpenDesktopModules}
                modulesRef={modulesRef}
                signOut={signOut}
                className="hidden md:flex"
                showAdmin={false}
                hasPremiumAccess={hasPremiumAccess}
                premiumRooms={premiumRooms}
                onClearPremiumAccess={clearPremium}
                subscriptionTier={subscriptionTier}
              />

              {/* Mobile nav */}
              <MobileNav
                user={
                  user
                    ? {
                        id: user.id,
                        email: user.email ?? null,
                        name:
                          (user.user_metadata as any)?.full_name ??
                          (user.user_metadata as any)?.name ??
                          null,
                        avatarUrl:
                          (user.user_metadata as any)?.avatar_url ??
                          (user.user_metadata as any)?.avatar ??
                          null,
                      }
                    : null
                }
                role={role ?? 'guest'}
                ready={ready}
                streak={streakState ?? 0}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                mobileModulesOpen={mobileModulesOpen}
                setMobileModulesOpen={setMobileModulesOpen}
                signOut={signOut}
                showAdmin={false}
                className="md:hidden"
                hasPremiumAccess={hasPremiumAccess}
                premiumRooms={premiumRooms}
                onClearPremiumAccess={clearPremium}
                subscriptionTier={subscriptionTier}
              />
            </div>
          </div>
        </Container>
      </header>
    </>
  );
};

export default Header;
