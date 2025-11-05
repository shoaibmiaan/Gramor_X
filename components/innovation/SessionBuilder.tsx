import React, { useState } from 'react';

export function SessionBuilder({ onCreate }: { onCreate: (items: { skill: string; minutes: number }[]) => void }) {
  const [rows, setRows] = useState<{ skill: string; minutes: number }[]>([{ skill: 'Writing', minutes: 20 }]);

  const updateRow = (index: number, key: 'skill' | 'minutes', value: any) => {
    setRows((s) => s.map((r, i) => (i === index ? { ...r, [key]: key === 'minutes' ? Number(value) : value } : r)));
  };

  const addRow = () => setRows((s) => [...s, { skill: 'Practice', minutes: 10 }]);
  const removeRow = (i: number) => setRows((s) => s.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className="p-2 rounded border flex-1" value={r.skill} onChange={(e) => updateRow(i, 'skill', e.target.value)} />
            <input type="number" className="p-2 rounded border w-24" value={r.minutes} onChange={(e) => updateRow(i, 'minutes', e.target.value)} />
            <button className="btn-ghost" onClick={() => removeRow(i)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button className="btn" onClick={addRow}>Add</button>
        <button className="btn-primary" onClick={() => onCreate(rows)}>Create</button>
      </div>
    </div>
  );
}
