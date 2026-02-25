import React, { useState } from 'react';

export function TaskScheduler({ onSchedule }: { onSchedule: (iso: string) => void }) {
  const [iso, setIso] = useState('');
  return (
    <div className="flex gap-2 items-center">
      <input className="p-2 rounded border flex-1" placeholder="2025-11-10T09:00:00Z" value={iso} onChange={(e) => setIso(e.target.value)} />
      <button className="btn" onClick={() => onSchedule(iso)}>Schedule</button>
    </div>
  );
}
