import { useCallback, useEffect, useState } from 'react';
import type { WhatsAppTask } from '../types/innovation';
import { listWhatsAppTasks, createWhatsAppTask, sendWhatsAppNow } from '../lib/whatsappClient';

export function useWhatsAppTasks(userId?: string | null) {
  const [tasks, setTasks] = useState<WhatsAppTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await listWhatsAppTasks(userId ?? undefined);
      setTasks(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load tasks');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (text: string, scheduledAt?: string | null) => {
    // optimistic
    const temp: WhatsAppTask = { id: 'temp:' + Date.now(), user_id: userId ?? undefined, text, scheduled_at: scheduledAt ?? null, delivered: false };
    setTasks((s) => [temp, ...s]);
    try {
      const created = await createWhatsAppTask(userId ?? undefined, text, scheduledAt ?? undefined);
      setTasks((s) => s.map((t) => (t.id === temp.id ? created : t)));
      return created;
    } catch (e) {
      setTasks((s) => s.filter((t) => t.id !== temp.id));
      throw e;
    }
  }, [userId]);

  const sendNow = useCallback(async (id: string) => {
    try {
      await sendWhatsAppNow(id);
      setTasks((s) => s.map((t) => (t.id === id ? { ...t, delivered: true } : t)));
    } catch (e) {
      throw e;
    }
  }, []);

  return { tasks, loading, error, load, add, sendNow } as const;
}
