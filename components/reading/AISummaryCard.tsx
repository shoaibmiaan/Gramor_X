// components/reading/AISummaryCard.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/design-system/Card';
import { Skeleton } from '@/components/design-system/Skeleton';
import { Icon } from '@/components/design-system/Icon';

export const AISummaryCard: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/ai/summary');
        const j = await r.json();
        if (!cancelled) setText(j.summary || '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
      <div className="text-sm font-semibold inline-flex items-center gap-2">
        <Icon name="Lightbulb" /> Recent Activity — AI Summary
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{text || 'No sessions yet.'}</p>
      )}
    </Card>
  );
};
