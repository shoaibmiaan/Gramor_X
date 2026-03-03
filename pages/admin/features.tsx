import * as React from 'react';
import Head from 'next/head';

type FlagRow = { key: string; enabled: boolean; audience?: Record<string, unknown> | null; updated_at?: string | null };

export default function AdminFeaturesPage() {
  const [flags, setFlags] = React.useState<FlagRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/features');
    const json = await res.json();
    if (json?.ok) setFlags(json.flags ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const toggle = async (flag: FlagRow) => {
    await fetch('/api/admin/flags/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: flag.key, enabled: !flag.enabled, audience: flag.audience ?? null }),
    });
    await load();
  };

  return (
    <>
      <Head><title>Admin Feature Flags</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Admin • Feature Flags</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control global toggles, rollouts, and audience overrides.</p>
          {loading ? <p className="mt-4 text-sm">Loading…</p> : null}
          <div className="mt-4 space-y-3">
            {flags.map((flag) => (
              <article key={flag.key} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{flag.key}</p>
                    <p className="text-xs text-muted-foreground">Updated: {flag.updated_at ? new Date(flag.updated_at).toLocaleString() : '—'}</p>
                  </div>
                  <button onClick={() => void toggle(flag)} className="rounded border border-border px-3 py-1 text-xs">
                    {flag.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto rounded bg-muted/30 p-2 text-xs">{JSON.stringify(flag.audience ?? {}, null, 2)}</pre>
              </article>
            ))}
            {!loading && flags.length === 0 ? <p className="text-sm text-muted-foreground">No flags configured yet.</p> : null}
          </div>
        </div>
      </main>
    </>
  );
}
