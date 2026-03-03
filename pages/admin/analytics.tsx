import type { NextPage } from 'next';
import useSWR from 'swr';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('fetch_failed');
  return res.json();
};

const AdminAnalyticsPage: NextPage = () => {
  const { data, error, isLoading } = useSWR('/api/admin/analytics', fetcher);
  const metrics = (data?.metrics ?? []) as Array<any>;

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin Analytics</h1>
        <p className="text-sm text-muted-foreground">Daily KPIs for growth, revenue, engagement, and AI usage.</p>

        {error ? <p className="text-sm text-red-500">Failed to load analytics.</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2">Day</th>
                <th className="px-2 py-2">DAU</th>
                <th className="px-2 py-2">Signups</th>
                <th className="px-2 py-2">Conversion</th>
                <th className="px-2 py-2">Churn</th>
                <th className="px-2 py-2">MRR</th>
                <th className="px-2 py-2">AI Requests</th>
                <th className="px-2 py-2">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => (
                <tr key={row.day} className="border-t border-border/50">
                  <td className="px-2 py-2">{row.day}</td>
                  <td className="px-2 py-2">{row.dau}</td>
                  <td className="px-2 py-2">{row.new_signups}</td>
                  <td className="px-2 py-2">{Number(row.conversion_rate ?? 0).toFixed(2)}%</td>
                  <td className="px-2 py-2">{Number(row.churn_rate ?? 0).toFixed(2)}%</td>
                  <td className="px-2 py-2">${Number(row.mrr ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-2">{row.total_ai_requests}</td>
                  <td className="px-2 py-2">{Number(row.avg_test_score ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default AdminAnalyticsPage;
