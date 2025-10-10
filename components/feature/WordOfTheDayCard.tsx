import * as React from 'react';
import { Button } from '@/components/design-system/Button';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type WordInfo = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  synonyms: string[];
  interest: string | null;
};

type WOD = {
  word: WordInfo;
  learnedToday: boolean;
  streakDays: number;
  longestStreak: number;
  streakValueUSD: number;
};

export function WordOfTheDayCard() {
  const [data, setData] = React.useState<WOD | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const { data: session } = await supabaseBrowser.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/words/today', {
        method: 'GET',
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        setError('Could not load Word of the Day.');
        setData(null);
        return null;
      }

      const json = (await res.json()) as WOD;
      setData(json);
      return json;
    } catch {
      setError('Network error. Please retry.');
      setData(null);
      return null;
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const mark = async () => {
    if (!data || data.learnedToday) return;
    setBusy(true);
    setError(null);
    try {
      const { data: session } = await supabaseBrowser.auth.getSession();
      const token = session?.session?.access_token;

      const r = await fetch('/api/words/learn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ wordId: data.word.id }),
      });

      if (!r.ok) throw new Error('mark-failed');
      const payload = (await r.json()) as {
        ok?: true;
        streakDays?: number;
        longestStreak?: number;
      };
      const updated = await load();
      const nextValue = (payload?.streakDays ?? updated?.streakDays) ?? 0;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('streak:changed', { detail: { value: nextValue } }));
      }
    } catch {
      setError('Could not update. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    // Lightweight placeholder (keeps layout stable)
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="h-4 w-40 rounded bg-muted/30" />
        <div className="mt-3 h-7 w-56 rounded bg-muted/30" />
        <div className="mt-2 h-4 w-full rounded bg-muted/20" />
        {error && <p className="mt-3 text-small text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-small text-muted-foreground mb-2">📘 Word of the Day</div>
      <div className="text-h2 font-semibold capitalize">{data.word.word}</div>
      <p className="mt-2 text-muted-foreground">{data.word.meaning}</p>
      {data.word.synonyms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {data.word.synonyms.map((synonym) => (
            <span
              key={synonym}
              className="rounded-full bg-muted/60 px-3 py-1 font-medium text-foreground/70"
            >
              {synonym}
            </span>
          ))}
        </div>
      )}
      {data.word.example && (
        <p className="mt-3 italic text-muted-foreground">&ldquo;{data.word.example}&rdquo;</p>
      )}
      {data.word.interest && (
        <p className="mt-3 text-small text-primary">{data.word.interest}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          variant={data.learnedToday ? 'secondary' : 'primary'}
          onClick={mark}
          disabled={busy || data.learnedToday}
        >
          {data.learnedToday ? 'Learned today' : busy ? 'Saving…' : 'Mark as Learned'}
        </Button>
        <div className="text-small text-muted-foreground space-y-1">
          <div>
            🔥 <span className="font-medium">{data.streakDays}</span> day
            {data.streakDays === 1 ? '' : 's'} &nbsp;•&nbsp; value $
            {Number.isFinite(data.streakValueUSD) ? data.streakValueUSD.toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-muted-foreground/80">
            Personal best: {Math.max(data.longestStreak, data.streakDays)} day
            {Math.max(data.longestStreak, data.streakDays) === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-small text-destructive">{error}</p>}
    </div>
  );
}
