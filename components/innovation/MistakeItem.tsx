import React from 'react';

export function MistakeItem({ item, onResolve, onCopy }: { item: any; onResolve?: (id: string) => void; onCopy?: (text: string) => void }) {
  return (
    <div className="p-3 rounded border flex items-start justify-between gap-3">
      <div>
        <div className="font-medium">{item.type}{item.resolved ? ' — Resolved' : ''}</div>
        <div className="text-sm text-muted-foreground mt-1">{item.excerpt}</div>
        <div className="text-xs text-muted-foreground mt-2">{new Date(item.created_at ?? Date.now()).toLocaleString()}</div>
      </div>
      <div className="flex flex-col gap-2">
        <button className="btn" onClick={() => onResolve?.(item.id)}>{item.resolved ? 'Reopen' : 'Resolve'}</button>
        <button className="btn-ghost" onClick={() => onCopy?.(item.excerpt)}>Copy</button>
      </div>
    </div>
  );
}
