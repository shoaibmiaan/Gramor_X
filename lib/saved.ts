export type SavedItem = {
  id?: string;
  resource_id: string;
  type: string | null;
  category: string | null;
  created_at: string;
};

export type SavedItemsPage = {
  items: SavedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const SAVED_PAGE_SIZE = 20;

export class HttpError extends Error {
  status: number;
  info?: unknown;

  constructor(status: number, message: string, info?: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

export async function fetchSavedPage(url: string): Promise<SavedItemsPage> {
  const res = await fetch(url);
  if (!res.ok) {
    const info = await res.json().catch(() => undefined);
    throw new HttpError(res.status, res.statusText, info);
  }
  const body = await res.json();
  if (Array.isArray(body)) {
    return {
      items: (body as Record<string, unknown>[]).map((item) => ({
        id: typeof item.id === 'string' ? item.id : undefined,
        resource_id: String(item.resource_id ?? ''),
        type: typeof item.type === 'string' ? item.type : null,
        category: typeof item.category === 'string' ? item.category : null,
        created_at: String(item.created_at ?? ''),
      })),
      nextCursor: null,
      hasMore: false,
    };
  }
  return body as SavedItemsPage;
}

export const MODULE_LABELS: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  flagged: 'Flagged',
  retake: 'Retake queue',
  bookmark: 'Bookmarks',
  other: 'Other',
};

export function deriveModule(item: SavedItem): { id: string; label: string } {
  const moduleKey = (item.type || item.category || 'other').toLowerCase();
  const label = MODULE_LABELS[moduleKey] ?? MODULE_LABELS.other;
  return { id: moduleKey, label };
}

export function buildSavedLink(item: SavedItem): string {
  const moduleKey = (item.type || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const id = item.resource_id;

  if (category === 'vocabulary') return `/vocabulary/${id}?from=saved`;
  if (category === 'grammar') return `/grammar/${id}?from=saved`;
  if (moduleKey === 'reading') return `/reading/${id}?from=saved`;
  if (moduleKey === 'listening') return `/listening/${id}?from=saved`;
  if (moduleKey === 'writing') return `/writing/${id}?from=saved`;
  if (moduleKey === 'speaking') return `/speaking/${id}?from=saved`;
  return `/${moduleKey || category || 'content'}/${id}?from=saved`;
}

export async function removeSavedItem(item: SavedItem): Promise<void> {
  if (item.id) {
    const res = await fetch(`/api/saved/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const info = await res.json().catch(() => undefined);
      throw new HttpError(res.status, res.statusText, info);
    }
    return;
  }

  if (!item.category) return;
  const res = await fetch(`/api/saved/by-category/${item.category}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_id: item.resource_id, type: item.type ?? undefined }),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => undefined);
    throw new HttpError(res.status, res.statusText, info);
  }
}

export async function removeSavedItems(items: SavedItem[]): Promise<void> {
  const tasks = items
    .filter((item) => item.category)
    .map((item) => removeSavedItem(item));

  if (tasks.length === 0) return;

  const results = await Promise.allSettled(tasks);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed && failed.status === 'rejected') {
    throw failed.reason;
  }
}
