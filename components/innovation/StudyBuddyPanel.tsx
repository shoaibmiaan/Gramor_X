import React, { useEffect, useMemo, useState } from 'react';

type SkillPick = { skill: string; durationMinutes: number };

export default function StudyBuddyPanel({ profile, onClose }: { profile?: any; onClose: () => void }) {
  const [skillInput, setSkillInput] = useState('Writing');
  const [duration, setDuration] = useState(20);
  const [building, setBuilding] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = useMemo(() => [
    { skill: 'Writing', minutes: 30 },
    { skill: 'Listening', minutes: 20 },
    { skill: 'Reading', minutes: 25 },
    { skill: 'Speaking', minutes: 20 },
  ], []);

  const createSession = async () => {
    setBuilding(true);
    setError(null);
    try {
      const payload = { userId: profile?.user_id ?? null, items: [{ skill: skillInput, minutes: duration }] };
      const res = await fetch('/api/study-buddy/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const json = await res.json();
      setSession(json);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected');
    } finally {
      setBuilding(false);
    }
  };

  const startLivePractice = async () => {
    if (!session) return;
    // In a real app we'd open a live practice flow; here we mark started
    try {
      await fetch(`/api/study-buddy/sessions/${session.id}/start`, { method: 'POST' });
      // refresh
      const r = await fetch(`/api/study-buddy/sessions/${session.id}`);
      const j = await r.json();
      setSession(j);
    } catch (_) {}
  };

  return (
    <div className="bg-card rounded-ds-2xl shadow-lg max-h-[80vh] overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-slab text-h3">Study Buddy</h3>
          <div className="text-sm text-muted-foreground">Build short focused sessions tailored to your weaknesses.</div>
        </div>
        <div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Skill</label>
            <input className="w-full mt-1 p-2 rounded border" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Duration (minutes)</label>
            <input type="number" className="w-full mt-1 p-2 rounded border" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="btn-primary" onClick={createSession} disabled={building}>{building ? 'Building…' : 'Build Session'}</button>
          <button className="btn-ghost" onClick={() => { setSkillInput('Writing'); setDuration(20); }}>Reset</button>
        </div>

        {error && <div className="mt-3 text-red-500">{error}</div>}

        {session ? (
          <div className="mt-4">
            <h4 className="font-medium">Session ready</h4>
            <div className="mt-2 p-3 rounded border">
              <div>ID: {session.id}</div>
              <div>Items: {session.items?.length ?? 0}</div>
              <div>State: {session.state}</div>
              <div className="mt-3 flex gap-2">
                <button className="btn" onClick={startLivePractice}>Start Practice</button>
                <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(window.location.href + `?session=${session.id}`)}>Share</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <h4 className="font-medium">Quick presets</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.skill} className="px-3 py-1 rounded border text-sm" onClick={() => { setSkillInput(p.skill); setDuration(p.minutes); }}>{p.skill} · {p.minutes}m</button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h4 className="font-medium">Mini practice</h4>
          <p className="text-sm text-muted-foreground">Try a 3-minute timed writing prompt to warm up.</p>
          <div className="mt-2">
            <button className="btn" onClick={async () => { alert('3-minute timed prompt: Describe a time you solved a problem.'); }}>Start 3-min</button>
          </div>
        </div>
      </div>
    </div>
  );
}
