// pages/saved/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { useToast } from '@/components/design-system/Toaster';

type SavedType = 'listening' | 'reading' | 'writing' | 'speaking' | 'other';

type SavedItem = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  type: SavedType;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function SavedItemsPage() {
  const toast = useToast();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SavedType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          if (active) {
            setUserId(null);
            setItems([]);
            setLoading(false);
          }
          return;
        }
        if (active) setUserId(user.id);
      } catch (e) {
        console.error('[saved] auth lookup failed', e);
        if (active) setUserId(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const load = useCallback(async (uid: string, pageIndex: number, kind: SavedType | 'all') => {
    setLoading(true);
    try {
      const q = supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error } = kind === 'all' ? await q : await q.eq('type', kind);
      if (error) throw error;
      setItems((data as SavedItem[]) || []);
      setSelected({});
    } catch (e) {
      console.error('[saved] load failed', e);
      toast.error('Could not load saved items', e instanceof Error ? e.message : 'Unknown error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userId) return;
    load(userId, page, filter);
  }, [userId, page, filter, load]);

  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectAll = useCallback(() => {
    const map: Record<string, boolean> = {};
    items.forEach(i => { map[i.id] = true; });
    setSelected(map);
  }, [items]);

  const clearSelection = useCallback(() => setSelected({}), []);

  const removeOne = useCallback(async (id: string) => {
    const prev = items;
    setItems(items.filter(i => i.id !== id));
    try {
      const { error } = await supabase.from('saved_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Removed from saved');
    } catch (e) {
      toast.error('Failed to remove item');
      setItems(prev); // rollback
    }
  }, [items, toast]);

  const removeSelected = useCallback(async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    const prev = items;
    setItems(items.filter(i => !ids.includes(i.id)));
    try {
      const { error } = await supabase.from('saved_items').delete().in('id', ids);
      if (error) throw error;
      toast.success(`Removed ${ids.length} item(s)`);
      setSelected({});
    } catch (e) {
      toast.error('Failed to remove selected');
      setItems(prev); // rollback
    }
  }, [items, selected, toast]);

  const openTarget = (item: SavedItem) => {
    if (item.url) {
      // client-side open; rely on rel attributes for safety
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-h1 font-bold">Saved Items</h1>
          <Link
            href="/onboarding"
            className="text-small underline decoration-2 underline-offset-4"
          >
            Onboarding
          </Link>
        </header>

        <section className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="filter" className="text-small text-muted-foreground">Filter</label>
            <select
              id="filter"
              className="rounded-lg border border-border bg-background px-3 py-2 text-small"
              value={filter}
              onChange={(e) => { setPage(0); setFilter(e.target.value as any); }}
            >
              <option value="all">All</option>
              <option value="listening">Listening</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-lg border border-border px-3 py-2 text-small hover:border-primary"
              onClick={selectAll}
              aria-label="Select all on this page"
            >
              Select all
            </button>
            <button
              className="rounded-lg border border-border px-3 py-2 text-small hover:border-primary disabled:opacity-50"
              onClick={clearSelection}
              disabled={!anySelected}
            >
              Clear selection
            </button>
            <button
              className="rounded-lg bg-destructive px-3 py-2 text-small text-destructive-foreground disabled:opacity-50"
              onClick={removeSelected}
              disabled={!anySelected}
            >
              Remove selected
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-border p-4 text-small text-muted-foreground" role="status" aria-live="polite">
            Loading your saved items…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border p-6 text-small text-muted-foreground">
            Nothing saved yet. Browse modules and tap “Save” on lessons, questions, or articles to see them here.
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/listening" className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Listening</Link>
              <Link href="/reading" className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Reading</Link>
              <Link href="/writing" className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Writing</Link>
              <Link href="/speaking/simulator" className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Speaking</Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card/60 p-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    aria-label={`Select ${item.title}`}
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={!!selected[item.id]}
                    onChange={() => toggleSelect(item.id)}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-small font-medium">{item.title || item.url}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.type} • {new Date(item.created_at).toLocaleString()}
                    </div>
                    <button
                      className="mt-2 truncate text-left text-xs underline decoration-2 underline-offset-4"
                      onClick={() => openTarget(item)}
                    >
                      {item.url}
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary"
                    onClick={() => openTarget(item)}
                    aria-label="Open"
                  >
                    Open
                  </button>
                  <button
                    className="rounded-lg bg-destructive px-3 py-1 text-small text-destructive-foreground"
                    onClick={() => removeOne(item.id)}
                    aria-label="Remove"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <nav className="mt-6 flex items-center justify-between">
          <button
            className="rounded-lg border border-border px-3 py-2 text-small hover:border-primary disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            Previous
          </button>
          <div className="text-small text-muted-foreground">Page {page + 1}</div>
          <button
            className="rounded-lg border border-border px-3 py-2 text-small hover:border-primary disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || items.length < PAGE_SIZE}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}
