// lib/mistakes.ts
// Client helpers for the Mistakes Book experience.

export type MistakeTag = { key: string; value: string };

export type MistakeRecord = {
  id: string;
  prompt: string;
  correction: string | null;
  skill: string;
  repetitions: number;
  nextReview: string | null;
  createdAt: string;
  lastSeenAt: string;
  retryPath: string | null;
  tags?: MistakeTag[];
};

export type MistakePage = {
  items: MistakeRecord[];
  nextCursor: string | null;
};

function toQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchMistakePage({
  cursor,
  limit,
  signal,
}: {
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
} = {}): Promise<MistakePage> {
  const query = toQuery({
    cursor: cursor ?? undefined,
    limit: limit ? String(limit) : undefined,
  });
  const res = await fetch(`/api/mistakes${query}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to load mistakes: ${res.status}`);
  }
  return (await res.json()) as MistakePage;
}

export async function recordMistakeReview({
  id,
  repetitions,
}: {
  id: string;
  repetitions: number;
}): Promise<MistakeRecord> {
  const res = await fetch('/api/mistakes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      repetitions,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update mistake ${id}`);
  }
  return (await res.json()) as MistakeRecord;
}

export async function resolveMistake(id: string): Promise<void> {
  const res = await fetch('/api/mistakes', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, resolved: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve mistake ${id}`);
  }
}

export async function unresolveMistake(id: string): Promise<MistakeRecord | null> {
  const res = await fetch('/api/mistakes', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, resolved: false }),
  });
  if (!res.ok) {
    throw new Error(`Failed to restore mistake ${id}`);
  }
  const payload = (await res.json()) as { item: MistakeRecord | null };
  return payload.item ?? null;
}
