import * as React from 'react';

export type MediaItem = { id: string; type: 'audio' | 'video'; src: string; title?: string };
export function MediaDock({ items = [] as MediaItem[] }: { items?: MediaItem[] }) {
  return (
    <div>
      {items.map((m) => (
        <div key={m.id}>{m.title ?? m.id}</div>
      ))}
    </div>
  );
}
export default MediaDock;
