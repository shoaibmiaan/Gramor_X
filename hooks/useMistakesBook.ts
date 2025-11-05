import { useCallback, useEffect, useState } from 'react';
import type { Mistake } from '../types/innovation';
import { listMistakes, addMistake, toggleMistakeResolved } from '../services/mistakesService';

export function useMistakesBook(userId?: string | null) {
  const [items, setItems] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await listMistakes(userId ?? undefined);
      setItems(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load mistakes');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (type: string, excerpt: string, source?: string) => {
    // optimistic
    const temp: Mistake = { id: 'temp:' + Date.now(), user_id: userId ?? undefined, type, excerpt, created_at: new Date().toISOString(), resolved: false };
    setItems((s) => [temp, ...s]);
    try {
      const saved = await addMistake(userId ?? undefined, type, excerpt, source);
      setItems((s) => s.map((it) => (it.id === temp.id ? saved : it)));
      return saved;
    } catch (e: any) {
      // rollback
      setItems((s) => s.filter((it) => it.id !== temp.id));
      throw e;
    }
  }, [userId]);

  const toggleResolved = useCallback(async (id: string) => {
    // optimistic
    setItems((s) => s.map((it) => (it.id === id ? { ...it, resolved: !it.resolved } : it)));
    try {
      await toggleMistakeResolved(id);
    } catch (e) {
      // no-op; could reload
      void load();
    }
  }, [load]);

  return { items, loading, error, load, add, toggleResolved } as const;
}
