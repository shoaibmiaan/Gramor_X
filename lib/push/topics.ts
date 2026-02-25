import { isBrowser } from '@/lib/env';

export const PUSH_TOPICS = [
  {
    id: 'general',
    label: 'General updates',
    description: 'Critical account alerts and onboarding nudges.',
  },
  {
    id: 'study-reminders',
    label: 'Study reminders',
    description: 'Daily practice prompts to stay on track.',
  },
  {
    id: 'product',
    label: 'Product updates',
    description: 'New feature announcements and changelog highlights.',
  },
] as const;

export type PushTopic = (typeof PUSH_TOPICS)[number]['id'];

export const DEFAULT_TOPICS: PushTopic[] = ['general'];

const STORAGE_KEY = 'gx:push:topics';

export function isValidTopic(topic: string | null | undefined): topic is PushTopic {
  if (!topic) return false;
  return PUSH_TOPICS.some((t) => t.id === topic);
}

export function normalizeTopic(topic: string | null | undefined): PushTopic | null {
  if (!topic) return null;
  const trimmed = topic.trim().toLowerCase();
  return isValidTopic(trimmed) ? (trimmed as PushTopic) : null;
}

export function sanitizeTopics(
  input: readonly (string | null | undefined)[] | null | undefined,
  opts: { fallbackToDefault?: boolean } = { fallbackToDefault: true },
): PushTopic[] {
  const seen = new Set<PushTopic>();
  for (const raw of input ?? []) {
    const normalized = normalizeTopic(raw);
    if (normalized) seen.add(normalized);
  }

  if (seen.size === 0 && opts.fallbackToDefault !== false) {
    DEFAULT_TOPICS.forEach((topic) => seen.add(topic));
  }

  return Array.from(seen.values());
}

export function getStoredTopics(): PushTopic[] {
  if (!isBrowser) return DEFAULT_TOPICS.slice();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TOPICS.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TOPICS.slice();
    return sanitizeTopics(parsed);
  } catch {
    return DEFAULT_TOPICS.slice();
  }
}

export function persistTopics(topics: PushTopic[]): void {
  if (!isBrowser) return;
  try {
    const clean = sanitizeTopics(topics);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // no-op: storage might be unavailable (private browsing / SSR)
  }
}

export function diffTopics(current: PushTopic[], next: PushTopic[]) {
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  const added: PushTopic[] = [];
  const removed: PushTopic[] = [];

  for (const topic of nextSet) {
    if (!currentSet.has(topic)) added.push(topic);
  }
  for (const topic of currentSet) {
    if (!nextSet.has(topic)) removed.push(topic);
  }

  return { added, removed };
}
