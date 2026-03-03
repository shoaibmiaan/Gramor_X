import * as React from 'react';
import Head from 'next/head';

type AlertRow = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  user_email: string | null;
  details: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
};

type AlertResp = {
  ok: true;
  rows: AlertRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
} | {
  ok: false;
  error: string;
};

export default function AdminAlertsPage() {
  const [rows, setRows] = React.useState<AlertRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedFilter, setResolvedFilter] = React.useState('false');

  const fetchAlerts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ resolved: resolvedFilter, limit: '50' });
      const res = await fetch(`/api/admin/alerts?${params.toString()}`);
      const json = (await res.json()) as AlertResp;
      if (!json.ok) throw new Error(json.error || 'Failed to load alerts');
      setRows(json.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [resolvedFilter]);

  React.useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const toggleResolved = async (row: AlertRow) => {
    const res = await fetch('/api/admin/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, resolved: !row.resolved }),
    });

    if (res.ok) {
      await fetchAlerts();
    }
  };

  return (
    <>
      <Head><title>Admin Alerts</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Admin • Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suspicious activity detections and security alerts.</p>

          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm">Resolved:</label>
            <select value={resolvedFilter} onChange={(e) => setResolvedFilter(e.target.value)} className="rounded border border-border bg-card px-2 py-1 text-sm">
              <option value="false">Open</option>
              <option value="true">Resolved</option>
              <option value="">All</option>
            </select>
            <button onClick={() => void fetchAlerts()} className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">Refresh</button>
          </div>

          {loading ? <p className="mt-4 text-sm">Loading…</p> : null}
          {error ? <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-4 space-y-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{row.type} • <span className="uppercase">{row.severity}</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()} • {row.user_email || row.user_id || 'system'}</p>
                  </div>
                  <button onClick={() => void toggleResolved(row)} className="rounded border border-border px-3 py-1 text-xs">
                    {row.resolved ? 'Mark open' : 'Resolve'}
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto rounded bg-muted/30 p-2 text-xs">{JSON.stringify(row.details, null, 2)}</pre>
              </article>
            ))}
            {!loading && rows.length === 0 ? <p className="text-sm text-muted-foreground">No alerts found.</p> : null}
          </div>
        </div>
      </main>
    </>
  );
}
