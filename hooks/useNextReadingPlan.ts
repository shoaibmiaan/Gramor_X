// hooks/useNextReadingPlan.ts
import { useEffect, useState } from 'react';

export type NextPlan = {
  difficulty: 'Easy'|'Medium'|'Hard';
  primaryType: 'tfng'|'mcq'|'matching'|'short';
  reason: string;
  href: string;
  minSecPerQ?: number;
};

export function useNextReadingPlan() {
  const [data, setData] = useState<NextPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/ai/next-item');
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const j = await r.json();
        if (!cancelled) { setData(j); setErr(null); }
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message || 'Could not fetch next plan'); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, err };
}
