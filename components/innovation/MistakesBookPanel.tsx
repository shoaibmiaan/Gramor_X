import React, { useEffect, useMemo, useState } from 'react';

type Mistake = {
  id: string;
  user_id?: string;
  type: string;
  source?: string;
  excerpt?: string;
  created_at?: string;
  resolved?: boolean;
  tags?: string[];
};

export default function MistakesBookPanel({ userId, onClose }: { userId?: string | null; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Mistake[]>([]);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState('Grammar');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mistakes/list?userId=${encodeURIComponent(userId ?? '')}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setItems(json || []);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected');
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    const payload = { userId, type: newType, excerpt: newText };
    // optimistic
    const temp: Mistake = { id: 'temp:' + Date.now(), user_id: userId ?? undefined, type: newType, excerpt: newText, created_at: new Date().toISOString(), resolved: false };
    setItems((s) => [temp, ...s]);
    setNewText('');
    try {
      const res = await fetch('/api/mistakes/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to add');
      const json = await res.json();
      setItems((s) => s.map((it) => (it.id === temp.id ? json : it)));
    } catch (e: any) {
      setError(e?.message ?? 'Could not add');
      // rollback
      setItems((s) => s.filter((it) => it.id !== temp.id));
    } finally {
      setAdding(false);
    }
  };

  const toggleResolved = async (id: string) => {
    setItems((s) => s.map((it) => (it.id === id ? { ...it, resolved: !it.resolved } : it)));
    try {
      await fetch('/api/mistakes/categorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_resolved' }) });
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="bg-card rounded-ds-2xl shadow-lg max-h-[80vh] overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-slab text-h3">Mistakes Book</h3>
          <div className="text-sm text-muted-foreground">Collect errors, auto-categorise, and generate remediation drills.</div>
        </div>
        <div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <label className="text-xs text-muted-foreground">New mistake</label>
          <textarea className="w-full mt-2 p-2 rounded border" value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Paste the sentence, mark the error, and add context..." />
          <div className="mt-2 flex gap-2">
            <select className="p-2 rounded border" value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option>Grammar</option>
              <option>Vocabulary</option>
              <option>Coherence</option>
              <option>Pronunciation</option>
            </select>
            <button className="btn-primary" onClick={add} disabled={adding}>{adding ? 'Adding…' : 'Add'}</button>
          </div>
        </div>

        <div>
          <h4 className="font-medium">Recent mistakes</h4>
          {loading ? (
            <div className="mt-2">Loading…</div>
          ) : error ? (
            <div className="mt-2 text-red-500">{error}</div>
          ) : items.length === 0 ? (
            <div className="mt-2 text-muted-foreground">No mistakes yet — add one above.</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {items.map((it) => (
                <li key={it.id} className="p-3 rounded border flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{it.type} {it.resolved ? '— Resolved' : ''}</div>
                    <div className="text-sm text-muted-foreground mt-1">{it.excerpt}</div>
                    <div className="text-xs text-muted-foreground mt-2">Source: {it.source ?? 'manual'} • {new Date(it.created_at ?? Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="btn" onClick={() => toggleResolved(it.id)}>{it.resolved ? 'Reopen' : 'Resolve'}</button>
                    <button className="btn-ghost" onClick={async () => { await navigator.clipboard?.writeText(it.excerpt ?? ''); }}>Copy</button>
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
