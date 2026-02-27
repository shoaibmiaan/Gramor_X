// pages/admin/reports/writing-activity.tsx
import * as React from 'react';
import type { GetServerSideProps } from 'next';

import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { getServerClient } from '@/lib/supabaseServer';

type Row = {
  user_id: string;
  full_name?: string | null;
  total: number;
  tip_count: number;
  micro_count: number;
  last_at: string;
};

type Props = {
  ok: boolean;
  role?: string | null;
};

export default function WritingActivityReport(_props: Props) {
  const [days, setDays] = React.useState(30);
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [totalEvents, setTotalEvents] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function load(d = days) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/writing-activity?days=${d}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { users: Row[]; totalEvents: number };
      setRows(data.users);
      setTotalEvents(data.totalEvents);
      setDays(d);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load report');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <h1 className="text-2xl font-semibold tracking-tight">Admin • Writing Activity</h1>
        <p className="text-muted mt-1">
          Completions of Tips & Micro-practice (last {days} days). Total events: {totalEvents}.
        </p>

        <div className="mt-4 flex gap-2">
          <Button variant={days === 7 ? 'primary' : 'ghost'} onClick={() => load(7)}>7d</Button>
          <Button variant={days === 30 ? 'primary' : 'ghost'} onClick={() => load(30)}>30d</Button>
          <Button variant={days === 90 ? 'primary' : 'ghost'} onClick={() => load(90)}>90d</Button>
        </div>

        {err && (
          <div className="mt-4">
            <Alert variant="warning">{err}</Alert>
          </div>
        )}

        <Card className="mt-6 p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Tips</th>
                <th className="px-4 py-3">Micro</th>
                <th className="px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {!rows && (
                <tr>
                  <td className="px-4 py-4" colSpan={6}>{loading ? 'Loading…' : 'No data'}</td>
                </tr>
              )}
              {rows?.map((r) => (
                <tr key={r.user_id} className="border-t">
                  <td className="px-4 py-2">
                    {r.full_name || <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <code className="text-xs">{r.user_id}</code>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="neutral">{r.total}</Badge>
                  </td>
                  <td className="px-4 py-2">{r.tip_count}</td>
                  <td className="px-4 py-2">{r.micro_count}</td>
                  <td className="px-4 py-2">
                    {new Date(r.last_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Container>
    </Section>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { redirect: { destination: '/auth/login?from=/admin/reports/writing-activity', permanent: false }, props: { ok: false } };
  }

  // Check role
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  const role = (prof?.role as string) ?? null;
  const allowed = role === 'admin' || role === 'teacher';
  if (!allowed) {
    return { redirect: { destination: '/', permanent: false }, props: { ok: false } };
  }

  return { props: { ok: true, role } };
};
