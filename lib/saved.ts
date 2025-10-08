export type SavedItem = {
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
    return { items: body as SavedItem[], nextCursor: null, hasMore: false };
  }
  return body as SavedItemsPage;
}

const MODULE_LABELS: Record<string, string> = {
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
  const module = (item.type || item.category || 'other').toLowerCase();
  const label = MODULE_LABELS[module] ?? MODULE_LABELS.other;
  return { id: module, label };
}

export function buildSavedLink(item: SavedItem): string {
  const module = (item.type || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const id = item.resource_id;

  if (category === 'vocabulary') return `/vocabulary/${id}?from=saved`;
  if (category === 'grammar') return `/grammar/${id}?from=saved`;
  if (module === 'reading') return `/reading/${id}?from=saved`;
  if (module === 'listening') return `/listening/${id}?from=saved`;
  if (module === 'writing') return `/writing/${id}?from=saved`;
  if (module === 'speaking') return `/speaking/${id}?from=saved`;
  return `/${module || category || 'content'}/${id}?from=saved`;
}

export async function removeSavedItem(item: SavedItem): Promise<void> {
  if (!item.category) return;
  await fetch(`/api/saved/${item.category}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_id: item.resource_id, type: item.type ?? undefined }),
  });
}
