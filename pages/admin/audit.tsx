import * as React from 'react';
import Head from 'next/head';

type AuditRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type AuditResponse = {
  ok: true;
  rows: AuditRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
} | {
  ok: false;
  error: string;
};

export default function AdminAuditPage() {
  const [rows, setRows] = React.useState<AuditRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const [action, setAction] = React.useState('');
  const [resource, setResource] = React.useState('');
  const [userId, setUserId] = React.useState('');

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (action) params.set('action', action);
      if (resource) params.set('resource', resource);
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = (await res.json()) as AuditResponse;
      if (!json.ok) throw new Error(json.error || 'Failed to load audit logs');

      setRows(json.rows);
      setTotalPages(json.totalPages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, action, resource, userId]);

  React.useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <>
      <Head>
        <title>Admin Audit Logs</title>
      </Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Admin • Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search and inspect security and product events.</p>

          <section className="mt-4 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-4">
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action" className="rounded border border-border bg-card px-3 py-2 text-sm" />
            <input value={resource} onChange={(e) => setResource(e.target.value)} placeholder="Resource" className="rounded border border-border bg-card px-3 py-2 text-sm" />
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" className="rounded border border-border bg-card px-3 py-2 text-sm" />
            <button onClick={() => { setPage(1); void fetchLogs(); }} className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Apply Filters</button>
          </section>

          {loading ? <p className="mt-4 text-sm">Loading…</p> : null}
          {error ? <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className="border-t border-border/60">
                      <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{row.user_email || row.user_id || '—'}</td>
                      <td className="px-3 py-2 font-medium">{row.action}</td>
                      <td className="px-3 py-2">{row.resource || '—'}</td>
                      <td className="px-3 py-2">{row.ip_address || '—'}</td>
                      <td className="max-w-[240px] truncate px-3 py-2">{row.user_agent || '—'}</td>
                    </tr>
                    <tr className="border-t border-border/30 bg-muted/20">
                      <td colSpan={6} className="px-3 py-2">
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground">View JSON payload</summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-card p-2 text-xs">{JSON.stringify({ metadata: row.metadata, old_data: row.old_data, new_data: row.new_data }, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">No audit logs found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40">Previous</button>
            <span className="text-sm">Page {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      </main>
    </>
  );
}
