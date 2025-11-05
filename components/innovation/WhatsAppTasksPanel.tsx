import React, { useEffect, useState } from 'react';

type WTask = { id: string; user_id?: string; text: string; scheduled_at?: string | null; delivered?: boolean };

export default function WhatsAppTasksPanel({ userId, onClose }: { userId?: string | null; onClose: () => void }) {
  const [tasks, setTasks] = useState<WTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [sched, setSched] = useState('');

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/whatsapp/tasks?userId=${encodeURIComponent(userId ?? '')}`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const json = await res.json(); setTasks(json || []);
    } catch (e: any) { setError(e?.message ?? 'Unexpected'); } finally { setLoading(false); }
  };

  const add = async () => {
    if (!newText.trim()) return;
    const payload = { userId, text: newText, scheduled_at: sched || null };
    // optimistic
    const temp: WTask = { id: 'temp:' + Date.now(), user_id: userId ?? undefined, text: newText, scheduled_at: sched || null, delivered: false };
    setTasks((s) => [temp, ...s]); setNewText(''); setSched('');
    try {
      const res = await fetch('/api/whatsapp/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to save task');
      const json = await res.json(); setTasks((s) => s.map((t) => (t.id === temp.id ? json : t)));
    } catch (e) { setError((e as any)?.message ?? 'Could not add'); setTasks((s) => s.filter((t) => t.id !== temp.id)); }
  };

  const sendNow = async (id: string) => {
    try {
      await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setTasks((s) => s.map((t) => (t.id === id ? { ...t, delivered: true } : t)));
    } catch (_) {}
  };

  return (
    <div className="bg-card rounded-ds-2xl shadow-lg max-h-[80vh] overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-slab text-h3">WhatsApp Tasks</h3>
          <div className="text-sm text-muted-foreground">Receive daily micro-tasks and reminders via WhatsApp.</div>
        </div>
        <div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="p-4">
        <label className="text-xs text-muted-foreground">Task text</label>
        <input className="w-full mt-2 p-2 rounded border" value={newText} onChange={(e) => setNewText(e.target.value)} />
        <label className="text-xs text-muted-foreground mt-2 block">Schedule (optional ISO)</label>
        <input className="w-full mt-2 p-2 rounded border" value={sched} onChange={(e) => setSched(e.target.value)} placeholder="2025-11-10T09:00:00Z" />
        <div className="mt-2 flex gap-2">
          <button className="btn-primary" onClick={add}>Add Task</button>
          <button className="btn-ghost" onClick={() => { setNewText(''); setSched(''); }}>Clear</button>
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Upcoming & recent</h4>
          {loading ? <div>Loading…</div> : error ? <div className="text-red-500">{error}</div> : (
            <ul className="mt-2 space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="p-3 rounded border flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{t.text}</div>
                    <div className="text-xs text-muted-foreground">Scheduled: {t.scheduled_at ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">Delivered: {t.delivered ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={() => sendNow(t.id)} disabled={t.delivered}>Send now</button>
                    <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(t.text)}>Copy</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
