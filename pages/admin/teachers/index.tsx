// pages/admin/teachers/index.tsx
// Static route (wins over /admin/[tab].tsx). CSR to avoid SSR redirect loops.

import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

// DS components (adjust paths if your DS lives elsewhere)
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';

// Optional: a tiny hook to read the current user's role from your session API
async function fetchMyRole(): Promise<'admin' | 'teacher' | 'user' | null> {
  try {
    const r = await fetch('/api/auth/me');
    if (!r.ok) return null;
    const j = (await r.json()) as { role?: string | null };
    return (j.role as any) ?? null;
  } catch {
    return null;
  }
}

type TeacherRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  teacher_onboarding_completed: boolean | null;
  teacher_approved: boolean | null;
  teacher_subjects: string[] | null;
  created_at?: string | null;
};

// This page loads on the client, then hits API routes for data/actions.
// That keeps the service role key on the server and avoids SSR redirects.
export default function AdminTeachersPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<'admin' | 'teacher' | 'user' | null>(null);
  const [rows, setRows] = React.useState<TeacherRow[]>([]);
  const [approvedCount, setApprovedCount] = React.useState<number>(0);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) role gate on client (no SSR bounce)
      const r = await fetchMyRole();
      if (!mounted) return;
      setRole(r);

      if (r !== 'admin') {
        setErrorMsg('Admins only. You do not have access to this page.');
        setLoading(false);
        return;
      }

      // 2) fetch data from secure API
      try {
        const res = await fetch('/api/admin/teachers/list');
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Failed to load teacher requests');
        }
        const j = (await res.json()) as { pending: TeacherRow[]; approvedCount: number };
        if (!mounted) return;
        setRows(j.pending || []);
        setApprovedCount(j.approvedCount || 0);
      } catch (e: any) {
        if (!mounted) return;
        setErrorMsg(e?.message || 'Failed to load teacher requests');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function setApproval(userId: string, approved: boolean) {
    setBusyId(userId);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/teachers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approved }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Request failed');

      // optimistic UI
      setRows((prev) => prev.filter((r) => r.id !== userId));
      if (approved) setApprovedCount((c) => c + 1);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to update teacher status');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Head><title>Admin • Teacher Requests</title></Head>
      <Container className="py-6 space-y-6">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Teacher Requests</h1>
            <p className="text-small text-muted-foreground">
              Review pending teacher registrations and approve or reject.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>Pending: {rows.length}</Badge>
            <Badge variant="secondary">Approved: {approvedCount}</Badge>
            <Link href="/admin" className="underline text-small">Back to Admin</Link>
          </div>
        </div>

        {role !== 'admin' && !loading && (
          <Alert variant="destructive">
            {errorMsg || 'Admins only. You do not have access to this page.'}
          </Alert>
        )}

        {errorMsg && role === 'admin' && <Alert variant="destructive">{errorMsg}</Alert>}

        <Card className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-muted-foreground">No pending teacher requests 🎉</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b">
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Subjects</th>
                  <th className="p-3">Onboarding</th>
                  <th className="p-3">Applied</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{r.full_name || '—'}</td>
                    <td className="p-3">{r.email || '—'}</td>
                    <td className="p-3">{(r.teacher_subjects ?? []).join(', ') || '—'}</td>
                    <td className="p-3">
                      {r.teacher_onboarding_completed
                        ? <Badge>Complete</Badge>
                        : <Badge variant="secondary">Incomplete</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          disabled={busyId === r.id}
                          onClick={() => setApproval(r.id, true)}
                        >
                          {busyId === r.id ? 'Approving…' : 'Approve'}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busyId === r.id}
                          onClick={() => setApproval(r.id, false)}
                        >
                          {busyId === r.id ? 'Rejecting…' : 'Reject'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Container>
    </>
  );
}
