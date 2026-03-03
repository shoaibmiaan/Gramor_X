import * as React from 'react';
import Head from 'next/head';

type DashboardPayload = {
  success?: boolean;
  summary?: {
    totalUsers?: number;
    paidUsers?: number;
    activeUsers30d?: number;
    retention30?: number;
  };
};

export default function InvestorMetricsPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      setData(json);
    })();
  }, []);

  const totalUsers = data?.summary?.totalUsers ?? 0;
  const paidUsers = data?.summary?.paidUsers ?? 0;
  const mrrEstimate = paidUsers * 9.99;

  return (
    <>
      <Head><title>Investor Metrics</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Admin • Investor Metrics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Snapshot view of growth readiness metrics (MRR, users, retention).</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Total Users" value={String(totalUsers)} />
            <Metric label="Paid Users" value={String(paidUsers)} />
            <Metric label="Est. MRR (USD)" value={`$${mrrEstimate.toFixed(2)}`} />
            <Metric label="30d Retention" value={`${((data?.summary?.retention30 ?? 0) * 100).toFixed(1)}%`} />
          </div>
        </div>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
  );
}
