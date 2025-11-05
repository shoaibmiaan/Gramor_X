export async function listMistakes(userId?: string | null) {
  const q = new URLSearchParams();
  if (userId) q.set('userId', userId);
  const res = await fetch('/api/mistakes/list?' + q.toString());
  if (!res.ok) throw new Error('Failed to load mistakes');
  return (await res.json()) as Mistake[];
}

export async function addMistake(userId: string | null | undefined, type: string, excerpt: string, source?: string) {
  const payload = { userId, type, excerpt, source };
  const res = await fetch('/api/mistakes/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Failed to add mistake');
  }
  return (await res.json()) as Mistake;
}

export async function toggleMistakeResolved(id: string) {
  const res = await fetch('/api/mistakes/categorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_resolved' }) });
  if (!res.ok) throw new Error('Failed to toggle');
  return (await res.json()) as { success: boolean };
}
