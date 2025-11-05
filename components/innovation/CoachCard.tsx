import React from 'react';

export function CoachCard({ title, summary, onOpen }: { title: string; summary?: string; onOpen?: () => void }) {
  return (
    <div className="p-3 rounded border bg-white/5 flex items-start justify-between">
      <div>
        <div className="font-medium">{title}</div>
        {summary && <div className="text-sm text-muted-foreground mt-1">{summary}</div>}
      </div>
      <div>
        <button className="btn" onClick={onOpen}>Open</button>
      </div>
    </div>
  );
}
