// pages/ai/mistakes-book/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Separator } from '@/components/design-system/Separator';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Container } from '@/components/design-system/Container';
import { ProgressBar } from '@/components/design-system/ProgressBar';

type MistakeItem = {
  id: string;
  prompt: string;
  correction: string | null;
  skill: string;
  repetitions: number;
  nextReview: string | null;
  retryPath: string | null;
  createdAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  tags: { key: string; value: string }[];
};

type GetResp = { items: MistakeItem[]; nextCursor: string | null };

const PAGE_LIMIT = 12;

export default function MistakesBookPage() {
  const [items, setItems] = useState<MistakeItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeTag) return items;
    return items.filter((m) => m.tags.some((t) => `${t.key}:${t.value}`.toLowerCase() === activeTag.toLowerCase()));
  }, [items, activeTag]);

  const unresolvedCount = useMemo(() => items.filter((i) => !i.resolvedAt).length, [items]);

  const loadPage = useCallback(async (initial = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_LIMIT));
      if (!initial && cursor) qs.set('cursor', cursor);
      const res = await fetch(`/api/mistakes?${qs.toString()}`);
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const data: GetResp = await res.json();
      setItems((prev) => (initial ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleResolved = useCallback(async (id: string, resolved: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, resolvedAt: resolved ? new Date().toISOString() : null } : m)),
    );
    const res = await fetch('/api/mistakes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolved }),
    });
    if (!res.ok) {
      // rollback
      setItems((prev) =>
        prev.map((m) => (m.id === id ? { ...m, resolvedAt: resolved ? null : m.resolvedAt } : m)),
      );
    }
  }, []);

  const bumpReps = useCallback(async (id: string, next: number) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, repetitions: next } : m)));
    const res = await fetch('/api/mistakes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, repetitions: next }),
    });
    if (!res.ok) {
      // rollback unknown: simply refetch minimal
      await loadPage(true);
    } else {
      const updated = await res.json();
      setItems((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  }, [loadPage]);

  const remove = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch('/api/mistakes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      // ignore; show subtle error could be added
    } finally {
      setDeleting(null);
    }
  }, []);

  const allTags = useMemo(() => {
    const bag = new Map<string, number>();
    items.forEach((m) =>
      m.tags.forEach((t) => {
        const key = `${t.key}:${t.value}`;
        bag.set(key, (bag.get(key) ?? 0) + 1);
      }),
    );
    return Array.from(bag.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [items]);

  return (
    <>
      <Head>
        <title>Mistakes Book · Gramor_X</title>
      </Head>

      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Mistakes Book</h1>
            <p className="text-muted/70">Review, resolve, and revisit your recent mistakes.</p>
          </div>
          <div className="min-w-[220px]">
            <ProgressBar value={items.length ? ((items.length - unresolvedCount) / items.length) * 100 : 0} />
            <p className="text-xs mt-1">
              Resolved {items.length - unresolvedCount}/{items.length}
            </p>
          </div>
        </div>

        {/* Tag filter row */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <Badge
              variant={activeTag ? 'outline' : 'solid'}
              onClick={() => setActiveTag(null)}
            >
              All
            </Badge>
            {allTags.map(([t, n]) => (
              <Badge
                key={t}
                variant={activeTag === t ? 'solid' : 'outline'}
                onClick={() => setActiveTag(t === activeTag ? null : t)}
              >
                {t} · {n}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {error && (
          <Card className="p-4 my-4">
            <p className="text-danger">{error}</p>
          </Card>
        )}

        {!loading && filtered.length === 0 ? (
          <EmptyState
            title="No mistakes to show"
            description="When you practice, we’ll capture your errors here with smart retry links."
            actions={
              <Link href="/practice" passHref legacyBehavior>
                <Button as="a" variant="primary">Go to Practice Hub</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
            {filtered.map((m) => (
              <Card key={m.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge>{m.skill}</Badge>
                      {m.resolvedAt ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-medium">{m.prompt}</h3>
                    {m.correction && (
                      <p className="text-sm text-muted/80 mt-1">
                        <span className="font-semibold">Correction:</span> {m.correction}
                      </p>
                    )}
                  </div>
                </div>

                {m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.tags.map((t, i) => (
                      <Badge
                        key={`${m.id}-tag-${i}`}
                        variant="outline"
                        onClick={() => setActiveTag(`${t.key}:${t.value}`)}
                      >
                        {t.key}: {t.value}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-muted/70">
                    Seen: {new Date(m.lastSeenAt).toLocaleDateString()} •
                    {m.nextReview ? ` Next: ${new Date(m.nextReview).toLocaleDateString()}` : '  No schedule'}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.retryPath ? (
                      <Link href={m.retryPath} passHref legacyBehavior>
                        <Button as="a" size="sm" variant="secondary">Retry</Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>Retry</Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => bumpReps(m.id, Math.max(0, m.repetitions - 1))}>-</Button>
                    <Badge>{m.repetitions} reps</Badge>
                    <Button size="sm" onClick={() => bumpReps(m.id, m.repetitions + 1)}>+</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.resolvedAt ? (
                      <Button size="sm" variant="outline" onClick={() => toggleResolved(m.id, false)}>
                        Mark Unresolved
                      </Button>
                    ) : (
                      <Button size="sm" variant="success" onClick={() => toggleResolved(m.id, true)}>
                        Mark Resolved
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove(m.id)}
                      disabled={deleting === m.id}
                    >
                      {deleting === m.id ? 'Removing…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load more */}
        <div className="flex justify-center my-8">
          <Button
            variant="secondary"
            onClick={() => loadPage(false)}
            disabled={loading || !cursor}
          >
            {cursor ? (loading ? 'Loading…' : 'Load more') : 'No more'}
          </Button>
        </div>
      </Container>
    </>
  );
}
