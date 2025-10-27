import * as React from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';
import { getPartnerSummary, type PartnerSummary } from '@/lib/api/partners';
import { getReferralStats, type ReferralStats } from '@/lib/api/referrals';

const AdminPartnersPage: NextPage = () => {
  const [summary, setSummary] = React.useState<PartnerSummary | null>(null);
  const [stats, setStats] = React.useState<ReferralStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([getPartnerSummary(), getReferralStats()]);
        if (!('ok' in s) || !s.ok) throw new Error((s as any).error || 'Summary load failed');
        if (!('ok' in r) || !r.ok) throw new Error((r as any).error || 'Stats load failed');
        setSummary(s.summary);
        setStats(r.stats);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Head><title>Admin — Partners</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-h1 font-semibold">Admin • Partners</h1>
          <p className="text-small text-muted-foreground">Internal snapshot for your partner performance.</p>

          {loading ? (
            <div className="mt-6 rounded-lg border border-border p-4">Loading…</div>
          ) : err ? (
            <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <p className="font-medium">Couldn’t load data</p>
              <p className="text-small opacity-90">{err}</p>
            </div>
          ) : (
            <>
              <section className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-small text-muted-foreground">Total signups</p>
                  <p className="text-h2 font-semibold">{summary?.totalSignups ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-small text-muted-foreground">Approved</p>
                  <p className="text-h2 font-semibold">{summary?.totalApproved ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-small text-muted-foreground">Clicks</p>
                  <p className="text-h2 font-semibold">{summary?.totalClicks ?? 0}</p>
                </div>
              </section>

              <section className="mt-8 rounded-xl border border-border p-4">
                <h2 className="text-h4 font-medium">Top Codes</h2>
                {summary && summary.topCodes.length > 0 ? (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full border-collapse text-small">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-2 pr-4">Code</th>
                          <th className="py-2 pr-4">Approved</th>
                          <th className="py-2 pr-4">Pending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.topCodes.map((row) => (
                          <tr key={row.code} className="border-b border-border/60">
                            <td className="py-2 pr-4 font-mono">{row.code}</td>
                            <td className="py-2 pr-4">{row.approved}</td>
                            <td className="py-2 pr-4">{row.pending}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-small text-muted-foreground">No redemptions yet.</p>
                )}
              </section>

              <section className="mt-8 rounded-xl border border-border p-4">
                <h2 className="text-h4 font-medium">Your latest code</h2>
                {stats?.code ? (
                  <code className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-small">
                    {stats.code}
                  </code>
                ) : (
                  <p className="text-small text-muted-foreground">No active code. Generate one on the Referrals page.</p>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default AdminPartnersPage;
