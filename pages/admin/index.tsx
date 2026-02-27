// pages/admin/index.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { getCurrentRole } from '@/lib/roles';
import type { AppRole } from '@/lib/roles';
import { useToast } from '@/components/design-system/Toaster';

// ---------- Types ----------
type KPI = { label: string; value: string; sub?: string; href?: string };
type Signup = { id: string; name: string; email: string; joinedAt: string };
type QueueRow = {
  id: string;
  type: 'writing' | 'speaking';
  status: 'pending' | 'scored' | 'error';
  provider: 'openai' | 'gemini' | 'groq' | 'vertex';
  submittedAt: string;
};
type ModulePerf = {
  module: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  attempts: number;
  avgBand: number;
  trend: 'up' | 'down' | 'flat';
};
type BlogQueueItem = {
  slug: string;
  title: string;
  author?: string | null;
  category: 'Listening' | 'Reading' | 'Writing' | 'Speaking' | 'Study Plan' | 'Product';
  submittedAt: string;
  tags: string[];
};
type SupportTicket = {
  ticketId: string;
  email: string;
  subject: string;
  category: 'account' | 'billing' | 'modules' | 'ai' | 'technical' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
};
type ProviderStatus = {
  name: 'Supabase' | 'SMTP' | 'OpenAI' | 'Gemini' | 'Groq' | 'Vertex' | 'Storage' | 'Realtime';
  state: 'ok' | 'degraded' | 'down';
  last: string;
  href?: string;
};

// API response type from /api/admin/users
type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'student' | 'teacher' | 'admin' | string;
  subscription: {
    plan_id: string | null;
    status: string | null;
    current_period_end: string | null;
  } | null;
};

// ---------- Small hooks/util ----------
function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function csvDownload(filename: string, rows: string[][]) {
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clsBadgeTone(tone: 'success' | 'warning' | 'danger' | 'muted') {
  switch (tone) {
    case 'success':
      return 'border-success text-success dark:text-success';
    case 'warning':
      return 'border-warning text-warning dark:text-warning';
    case 'danger':
      return 'border-danger text-danger dark:text-danger';
    default:
      return 'border-muted-foreground text-muted-foreground';
  }
}

// ---------- Page ----------
export default function AdminIndex() {
  // gate & UX
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const { success, error: toastError } = useToast();

  // toolbar
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [module, setModule] = useState<'all' | 'listening' | 'reading' | 'writing' | 'speaking'>('all');
  const [q, setQ] = useState('');
  const qRef = useRef<HTMLInputElement | null>(null);
  const qDebounced = useDebounced(q, 250);

  // users (admin)
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersErr, setUsersErr] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'starter' | 'booster' | 'master'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // demo data kept (can be wired later)
  const kpis: KPI[] = useMemo(
    () => [
      { label: 'Active Students', value: '1,284', sub: 'last 7 days', href: '/admin/students?active=1' },
      { label: 'Weekly Attempts', value: '3,942', sub: 'all modules', href: `/admin/reports?range=last-7d` },
      { label: 'Avg Band (All)', value: '6.4', sub: '±0.2 vs prev', href: `/admin/reports?range=last-7d&module=${module}` },
      { label: 'AI Queue Pending', value: '37', sub: 'writing/speaking', href: '/admin/ai-queue?status=pending' },
      { label: 'New Blog Submissions', value: '5', sub: 'awaiting review', href: '/admin/blog/moderation' },
      { label: 'Open Support Tickets', value: '12', sub: 'last 24h', href: '/admin/support' },
    ],
    [module]
  );

  const signups: Signup[] = [
    { id: 'u1', name: 'Ayesha Khan', email: 'ayesha@example.com', joinedAt: '2025-08-21 15:12' },
    { id: 'u2', name: 'Bilal Ahmed', email: 'bilal@example.com', joinedAt: '2025-08-21 13:47' },
    { id: 'u3', name: 'Chen Wei', email: 'chen@example.com', joinedAt: '2025-08-21 11:05' },
  ];

  const queue: QueueRow[] = [
    { id: 'q101', type: 'speaking', status: 'pending', provider: 'groq', submittedAt: '2025-08-22 22:11' },
    { id: 'q102', type: 'writing', status: 'pending', provider: 'vertex', submittedAt: '2025-08-22 21:58' },
    { id: 'q103', type: 'speaking', status: 'error', provider: 'gemini', submittedAt: '2025-08-22 21:50' },
  ];

  const perf: ModulePerf[] = [
    { module: 'Listening', attempts: 1094, avgBand: 6.7, trend: 'up' },
    { module: 'Reading', attempts: 986, avgBand: 6.5, trend: 'flat' },
    { module: 'Writing', attempts: 934, avgBand: 6.0, trend: 'up' },
    { module: 'Speaking', attempts: 928, avgBand: 6.2, trend: 'down' },
  ];

  const blogQueue: BlogQueueItem[] = [
    {
      slug: 'speaking-part-3-follow-up-mastery',
      title: 'Speaking Part 3: Follow-up Mastery',
      author: 'teacher_ali',
      category: 'Speaking',
      submittedAt: '2025-08-22 20:31',
      tags: ['speaking', 'band-7'],
    },
    {
      slug: 'reading-matching-headings-quick-scan',
      title: 'Reading: Matching Headings with Quick Scan',
      author: 'coach_mina',
      category: 'Reading',
      submittedAt: '2025-08-22 18:04',
      tags: ['reading', 'scan', 'tactics'],
    },
    {
      slug: 'writing-task-1-trends-phrasing',
      title: 'Writing Task 1: Trends & Phrasing Pack',
      author: 'mentor_omar',
      category: 'Writing',
      submittedAt: '2025-08-22 16:49',
      tags: ['writing', 'task1'],
    },
  ];

  const tickets: SupportTicket[] = [
    {
      ticketId: 'GX-20250823-AB12CD',
      email: 'sara@example.com',
      subject: 'Mic not working in Speaking',
      category: 'technical',
      status: 'open',
      createdAt: '2025-08-23 09:22',
    },
    {
      ticketId: 'GX-20250823-EF34GH',
      email: 'omer@example.com',
      subject: 'Upgrade to Booster failed',
      category: 'billing',
      status: 'in_progress',
      createdAt: '2025-08-23 08:11',
    },
    {
      ticketId: 'GX-20250822-IJ56KL',
      email: 'nida@example.com',
      subject: 'How to submit Writing Task 2?',
      category: 'modules',
      status: 'resolved',
      createdAt: '2025-08-22 21:42',
    },
  ];

  const providers: ProviderStatus[] = [
    { name: 'Supabase', state: 'ok', last: 'now', href: '/admin/system/supabase' },
    { name: 'SMTP', state: 'ok', last: '5m ago', href: '/admin/system/email' },
    { name: 'OpenAI', state: 'ok', last: 'now', href: '/admin/ai-usage?provider=openai' },
    { name: 'Gemini', state: 'degraded', last: '12m ago', href: '/admin/ai-usage?provider=gemini' },
    { name: 'Groq', state: 'ok', last: '2m ago', href: '/admin/ai-usage?provider=groq' },
    { name: 'Vertex', state: 'ok', last: '3m ago', href: '/admin/ai-usage?provider=vertex' },
    { name: 'Storage', state: 'ok', last: 'now', href: '/admin/system/storage' },
    { name: 'Realtime', state: 'ok', last: 'now', href: '/admin/system/realtime' },
  ];

  // effects
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    getCurrentRole().then((r) => setRole(r));
  }, []);

  useEffect(() => {
    let abort = false;
    setUsersLoading(true);
    setUsersErr(null);
    fetch('/api/admin/users')
      .then(async (r) => {
        const json = await r.json().catch(() => ([] as AdminUser[]));
        if (!abort) {
          if (!r.ok) {
            setUsersErr((json as any)?.error || 'Failed to load users');
            setUsers([]);
          } else {
            setUsers(json as AdminUser[]);
          }
        }
      })
      .catch((e: unknown) => {
        if (!abort) setUsersErr(e instanceof Error ? e.message : 'Failed to load users');
      })
      .finally(() => !abort && setUsersLoading(false));
    return () => {
      abort = true;
    };
  }, []);

  // search & filters
  const filteredUsers = useMemo(() => {
    const text = qDebounced.trim().toLowerCase();
    const byRole = roleFilter === 'all' ? (u: AdminUser) => true : (u: AdminUser) => u.role === roleFilter;
    const byPlan =
      planFilter === 'all'
        ? (u: AdminUser) => true
        : (u: AdminUser) => (u.subscription?.plan_id ?? 'free') === planFilter;

    return users
      .filter((u) => byRole(u) && byPlan(u))
      .filter((u) => {
        if (!text) return true;
        const hay = `${u.email ?? ''} ${u.full_name ?? ''} ${u.role} ${u.subscription?.plan_id ?? ''}`.toLowerCase();
        return hay.includes(text);
      });
  }, [users, qDebounced, roleFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pagedUsers = useMemo(
    () => filteredUsers.slice((pageSafe - 1) * pageSize, pageSafe * pageSize),
    [filteredUsers, pageSafe]
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        qRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        exportUsersCSV();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // actions
  const exportPerfCSV = () => {
    const rows = [['module', 'attempts', 'avgBand'], ...perf.map((r) => [r.module, String(r.attempts), String(r.avgBand)])];
    csvDownload(`module-performance-${range}.csv`, rows);
  };

  const exportUsersCSV = () => {
    const rows: string[][] = [
      ['id', 'email', 'full_name', 'role', 'plan_id', 'status', 'current_period_end'],
      ...filteredUsers.map((u) => [
        u.id,
        u.email ?? '',
        u.full_name ?? '',
        u.role,
        u.subscription?.plan_id ?? '',
        u.subscription?.status ?? '',
        u.subscription?.current_period_end ?? '',
      ]),
    ];
    csvDownload('users-roles-plans.csv', rows);
    success('Exported users CSV');
  };

  const moderatePost = async (slug: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/blog/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        success(data?.message || `Post ${action === 'approve' ? 'approved' : 'rejected'}`);
      } else {
        toastError(data?.error || 'Moderation failed');
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Moderation failed');
    }
  };

  const approvePost = (slug: string) => moderatePost(slug, 'approve');
  const rejectPost = (slug: string) => moderatePost(slug, 'reject');

  const filteredSignups = useMemo(
    () => signups.filter((s) => (qDebounced ? (s.name + s.email).toLowerCase().includes(qDebounced.toLowerCase()) : true)),
    [signups, qDebounced]
  );
  const filteredTickets = useMemo(
    () =>
      tickets.filter((t) =>
        qDebounced ? (t.ticketId + t.email + t.subject).toLowerCase().includes(qDebounced.toLowerCase()) : true
      ),
    [tickets, qDebounced]
  );

  return (
    <RoleGuard allow={['admin'] as any}>
      <Head>
        <title>Admin • Overview</title>
      </Head>

      <Container as="main" className="py-6 md:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-h2 md:text-h1 font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-small text-muted-foreground mt-1">
              Users & roles, subscriptions, IELTS modules, AI ops, and support — all in one place.
            </p>
          </div>

          {/* Top toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="h-9 rounded-xl border bg-transparent px-3 text-small"
              aria-label="Date Range"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>

            <select
              value={module}
              onChange={(e) => setModule(e.target.value as any)}
              className="h-9 rounded-xl border bg-transparent px-3 text-small"
              aria-label="Module"
            >
              <option value="all">All Modules</option>
              <option value="listening">Listening</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>

            <input
              ref={qRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Press / to search…"
              className="h-9 rounded-xl border bg-transparent px-3 text-small w-56"
              aria-label="Global search"
            />
            <button
              onClick={exportPerfCSV}
              className="h-9 rounded-xl border px-3 text-small hover:bg-muted"
              aria-label="Export Module CSV"
            >
              Export Modules CSV
            </button>
          </div>
        </div>

        {/* ===== Users & Roles (primary admin block) ===== */}
        <section className="mt-8 rounded-2xl border overflow-hidden bg-card">
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-h4 font-semibold">Users • Roles • Subscriptions</h2>
              <p className="text-caption text-muted-foreground">Sourced from /api/admin/users</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as typeof roleFilter);
                  setPage(1);
                }}
                className="h-9 rounded-xl border bg-transparent px-3 text-small"
                aria-label="Role filter"
              >
                <option value="all">All roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value as typeof planFilter);
                  setPage(1);
                }}
                className="h-9 rounded-xl border bg-transparent px-3 text-small"
                aria-label="Plan filter"
              >
                <option value="all">All plans</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="booster">Booster</option>
                <option value="master">Master</option>
              </select>
              <button
                onClick={exportUsersCSV}
                className="h-9 rounded-xl border px-3 text-small hover:bg-muted"
                aria-label="Export Users CSV"
                title="⌘/Ctrl + E"
              >
                Export Users CSV
              </button>
            </div>
          </div>

          <div className="border-t">
            {usersLoading ? (
              <SkeletonRows rows={6} />
            ) : usersErr ? (
              <div className="p-4 text-danger">{usersErr}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-small text-muted-foreground">No users match your filters.</div>
            ) : (
              <table className="w-full text-small">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Period End</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => {
                    const plan = u.subscription?.plan_id ?? 'free';
                    const status = u.subscription?.status ?? '—';
                    const end = u.subscription?.current_period_end
                      ? new Date(u.subscription.current_period_end).toLocaleString()
                      : '—';
                    return (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="p-3">
                          <div className="font-medium">{u.full_name ?? '—'}</div>
                          <div className="text-caption text-muted-foreground font-mono">{u.id.slice(0, 8)}…</div>
                        </td>
                        <td className="p-3">
                          <div className="truncate max-w-[26ch]" title={u.email ?? '—'}>
                            {u.email ?? '—'}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-caption border ${clsBadgeTone(
                            u.role === 'admin' ? 'success' : u.role === 'teacher' ? 'warning' : 'muted'
                          )}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{plan}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-caption border ${clsBadgeTone(
                            status === 'active'
                              ? 'success'
                              : status === 'trialing' || status === 'past_due'
                              ? 'warning'
                              : status === 'canceled'
                              ? 'danger'
                              : 'muted'
                          )}`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-3 text-caption text-muted-foreground">{end}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Link className="text-caption underline" href={`/admin/students?id=${u.id}`}>
                              View →
                            </Link>
                            {u.email && (
                              <button
                                className="text-caption underline"
                                onClick={() => navigator.clipboard.writeText(u.email!).then(() => success('Email copied'))}
                                aria-label="Copy email"
                              >
                                Copy email
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* pagination */}
          {filteredUsers.length > pageSize && (
            <div className="flex items-center justify-between p-3 border-t">
              <div className="text-caption text-muted-foreground">
                Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filteredUsers.length)} of{' '}
                {filteredUsers.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 rounded-lg border px-2 text-caption hover:bg-muted disabled:opacity-50"
                  disabled={pageSafe === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <div className="text-caption">
                  Page {pageSafe} / {totalPages}
                </div>
                <button
                  className="h-8 rounded-lg border px-2 text-caption hover:bg-muted disabled:opacity-50"
                  disabled={pageSafe === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===== Quick Nav ===== */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {[
            { label: 'Students', href: '/admin/students?active=1', roles: ['admin', 'teacher'] },
            { label: 'Teachers', href: '/admin/teachers', roles: ['admin'] },
            { label: 'Reports', href: `/admin/reports?range=last-7d`, roles: ['admin', 'teacher'] },
            { label: 'Writing Prompts', href: '/admin/writing', roles: ['admin', 'teacher'] },
            { label: 'AI Queue', href: '/admin/ai-queue?status=pending', roles: ['admin'] },
            { label: 'Blog Moderation', href: '/admin/blog/moderation', roles: ['admin', 'teacher'] },
            { label: 'Support', href: '/admin/support', roles: ['admin', 'teacher'] },
            { label: 'Promo Usage', href: '/admin/premium/promo-usage', roles: ['admin'] },
          ]
            .filter((item) => !role || item.roles.includes(role))
            .map((item) => (
              <Link key={item.label} href={item.href} className="group rounded-2xl border p-3 hover:bg-muted transition">
                <div className="font-medium">{item.label}</div>
                <div className="text-caption text-muted-foreground group-hover:underline">Open →</div>
              </Link>
            ))}
        </div>

        {/* ===== KPI Cards ===== */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href || '#'}
              className="rounded-2xl border p-4 hover:shadow-sm hover:-translate-y-0.5 transition bg-card"
            >
              <div className="text-small text-muted-foreground">{k.label}</div>
              <div className="text-h2 font-semibold mt-1">{k.value}</div>
              {k.sub && <div className="text-caption text-muted-foreground mt-1">{k.sub}</div>}
            </Link>
          ))}
        </section>

        {/* ===== Module Health ===== */}
        <section className="mt-8">
          <h2 className="text-h4 font-semibold">IELTS Module Health</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {perf.map((m) => {
              const slug = m.module.toLowerCase();
              return (
                <Link
                  key={m.module}
                  href={`/admin/modules/${slug}?range=${range}`}
                  className="rounded-2xl border p-4 hover:bg-muted transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{m.module}</div>
                    <span
                      className={{
                        up: 'text-success dark:text-success',
                        down: 'text-danger dark:text-danger',
                        flat: 'text-muted-foreground',
                      }[m.trend]}
                    >
                      {m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '–'}
                    </span>
                  </div>
                  <div className="text-small text-muted-foreground mt-1">{m.attempts} attempts</div>
                  <div className="text-h3 font-semibold mt-1">Avg {m.avgBand.toFixed(1)}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ===== Three-up: AI Queue + Recent Signups + System Status ===== */}
        <section className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* AI Queue */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold">AI Evaluation Queue</h3>
              <Link className="text-small underline" href="/admin/ai-queue?status=pending">
                Open full queue
              </Link>
            </div>
            <div className="border-t">
              {loading ? (
                <SkeletonRows rows={3} />
              ) : (
                <table className="w-full text-small">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="p-3">ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="p-3 font-mono text-caption">{r.id}</td>
                        <td className="p-3 capitalize">{r.type}</td>
                        <td className="p-3 uppercase text-caption">{r.provider}</td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-caption border ${
                              r.status === 'pending'
                                ? 'border-warning text-warning dark:text-warning'
                                : r.status === 'scored'
                                ? 'border-success text-success dark:text-success'
                                : 'border-danger text-danger dark:text-danger'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-caption text-muted-foreground">{r.submittedAt}</td>
                        <td className="p-3">
                          <Link
                            href={`/admin/moderation?type=${r.type}&attempt=${r.id}`}
                            className="text-caption underline"
                          >
                            Review →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Signups */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold">Recent Signups</h3>
              <Link className="text-small underline" href="/admin/students?sort=joined_at.desc">
                View all
              </Link>
            </div>
            <div className="border-t">
              {loading ? (
                <SkeletonRows rows={3} />
              ) : (
                <table className="w-full text-small">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignups.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="p-3">{s.name}</td>
                        <td className="p-3 text-caption text-muted-foreground">{s.email}</td>
                        <td className="p-3 text-caption text-muted-foreground">{s.joinedAt}</td>
                        <td className="p-3">
                          <Link className="text-caption underline" href={`/admin/students?id=${s.id}`}>
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold">System Status</h3>
              <Link className="text-small underline" href="/admin/system">
                Status page
              </Link>
            </div>
            <div className="border-t divide-y">
              {providers.map((p) => (
                <Link
                  key={p.name}
                  href={p.href || '#'}
                  className="flex items-center justify-between p-3 hover:bg-muted transition"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot state={p.state} />
                    <div className="font-medium">{p.name}</div>
                  </div>
                  <div
                    className={
                      p.state === 'ok'
                        ? 'text-caption text-success dark:text-success'
                        : p.state === 'degraded'
                        ? 'text-caption text-warning dark:text-warning'
                        : 'text-caption text-danger dark:text-danger'
                    }
                  >
                    {p.state.toUpperCase()} • {p.last}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Two-up: Blog Moderation + Support Tickets ===== */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Blog Moderation Queue */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold">Blog Moderation Queue</h3>
              <div className="flex items-center gap-2">
                <Link className="text-small underline" href="/admin/blog/new">
                  New post
                </Link>
                <Link className="text-small underline" href="/admin/blog/moderation">
                  Open queue
                </Link>
              </div>
            </div>
            <div className="border-t">
              {loading ? (
                <SkeletonRows rows={3} />
              ) : blogQueue.length === 0 ? (
                <div className="p-4 text-small text-muted-foreground">No submissions — great!</div>
              ) : (
                <table className="w-full text-small">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="p-3">Title</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">Tags</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogQueue.map((b) => (
                      <tr key={b.slug} className="border-b last:border-0">
                        <td className="p-3">
                          <Link className="underline" href={`/blog/${b.slug}`}>
                            {b.title}
                          </Link>
                        </td>
                        <td className="p-3">{b.category}</td>
                        <td className="p-3 text-caption text-muted-foreground">{b.author ?? '—'}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {b.tags.map((t) => (
                              <span key={t} className="px-2 py-0.5 rounded-lg text-caption bg-white/60 dark:bg-white/10">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-caption text-muted-foreground">{b.submittedAt}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approvePost(b.slug)}
                              className="h-8 rounded-lg border px-2 text-caption hover:bg-success/10 dark:hover:bg-success/10"
                              aria-label="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectPost(b.slug)}
                              className="h-8 rounded-lg border px-2 text-caption hover:bg-danger/10 dark:hover:bg-danger/10"
                              aria-label="Reject"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Support Tickets */}
          <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold">Support Tickets (24h)</h3>
              <Link className="text-small underline" href="/admin/support">
                Open Support
              </Link>
            </div>
            <div className="border-t">
              {loading ? (
                <SkeletonRows rows={3} />
              ) : filteredTickets.length === 0 ? (
                <div className="p-4 text-small text-muted-foreground">No tickets match your search.</div>
              ) : (
                <table className="w-full text-small">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="p-3">Ticket</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr key={t.ticketId} className="border-b last:border-0">
                        <td className="p-3 font-mono text-caption">{t.ticketId}</td>
                        <td className="p-3">
                          <div className="truncate max-w-[18ch]" title={t.subject}>
                            {t.subject}
                          </div>
                          <div className="text-caption text-muted-foreground">{t.email}</div>
                        </td>
                        <td className="p-3 capitalize">{t.category}</td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-caption border ${
                              t.status === 'open'
                                ? 'border-amber-400 text-amber-600 dark:text-amber-400'
                                : t.status === 'in_progress'
                                ? 'border-blue-500 text-electricBlue dark:text-blue-400'
                                : t.status === 'resolved'
                                ? 'border-green-500 text-success dark:text-green-400'
                                : 'border-muted-foreground text-muted-foreground'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-caption text-muted-foreground">{t.createdAt}</td>
                        <td className="p-3">
                          <Link className="text-caption underline" href={`/admin/support?ticket=${t.ticketId}`}>
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* ===== CTA Row ===== */}
        {role === 'admin' && (
          <section className="mt-8 flex flex-wrap gap-2">
            <Link href="/admin/reports?range=last-30d&module=all" className="rounded-xl border px-4 h-10 inline-grid place-items-center hover:bg-muted">
              Generate Monthly Report
            </Link>
            <Link href="/admin/teachers?invite=1" className="rounded-xl border px-4 h-10 inline-grid place-items-center hover:bg-muted">
              Invite Teacher
            </Link>
            <Link href="/admin/tools/cache?invalidate=1" className="rounded-xl border px-4 h-10 inline-grid place-items-center hover:bg-muted">
              Invalidate Caches
            </Link>
            <Link href="/admin/blog/new" className="rounded-xl border px-4 h-10 inline-grid place-items-center hover:bg-muted">
              Compose Blog Post
            </Link>
            <Link href="/admin/system/sync" className="rounded-xl border px-4 h-10 inline-grid place-items-center hover:bg-muted">
              Run Nightly Sync
            </Link>
          </section>
        )}
      </Container>
    </RoleGuard>
  );
}

// ---- Small UI helpers ----
function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-3 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function StatusDot({ state }: { state: ProviderStatus['state'] }) {
  const cls = state === 'ok' ? 'bg-success' : state === 'degraded' ? 'bg-warning' : 'bg-danger';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} aria-hidden="true" />;
}
