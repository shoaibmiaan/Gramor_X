// pages/admin/listening/media.tsx
import * as React from 'react';
import type { GetServerSideProps } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

type Props = { role: string; email: string };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: '/auth/signin?next=/admin/listening/media', permanent: false }, props: {} as any };

  const prof = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = prof.data?.role ?? 'student';
  if (role !== 'admin' && role !== 'teacher') {
    return { redirect: { destination: '/403', permanent: false }, props: {} as any };
  }
  return { props: { role, email: user.email ?? '' } };
};

export default function AdminListeningMedia({ role, email }: Props) {
  const [kind, setKind] = React.useState<'audio'|'video'>('audio');
  const [url, setUrl] = React.useState('');
  const [duration, setDuration] = React.useState<number>(0);
  const [transcript, setTranscript] = React.useState('');
  const [accent, setAccent] = React.useState<'uk'|'us'|'aus'|'mix'>('mix');
  const [level, setLevel] = React.useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [tags, setTags] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/listening/media.upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind, url, duration_secs: Number(duration), transcript,
          accent, level, tags: tags.split(',').map(s=>s.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setStatus(`✅ Saved: ${json.id}`);
    } catch (err: any) {
      setStatus(`❌ ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <Section>
        <Container>
          <div className="mb-4"><Badge>Admin</Badge></div>
          <h1 className="text-2xl font-semibold">Listening · Media</h1>
          <p className="opacity-80 mb-4">Role: {role} · {email}</p>

          <Card className="p-4">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <div className="text-sm opacity-70 mb-1">Kind</div>
                  <select className="rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={kind} onChange={e=>setKind(e.target.value as any)}>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <div className="text-sm opacity-70 mb-1">Accent</div>
                  <select className="rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={accent} onChange={e=>setAccent(e.target.value as any)}>
                    <option value="mix">MIX</option>
                    <option value="uk">UK</option>
                    <option value="us">US</option>
                    <option value="aus">AUS</option>
                  </select>
                </div>
                <div>
                  <div className="text-sm opacity-70 mb-1">Level</div>
                  <select className="rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={level} onChange={e=>setLevel(e.target.value as any)}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <div className="text-sm opacity-70 mb-1">Duration (secs)</div>
                  <input type="number" className="w-[140px] rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={duration} onChange={e=>setDuration(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <div className="text-sm opacity-70 mb-1">Media URL</div>
                <input className="w-full rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={url} onChange={e=>setUrl(e.target.value)} required />
              </div>

              <div>
                <div className="text-sm opacity-70 mb-1">Tags (comma-sep)</div>
                <input className="w-full rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={tags} onChange={e=>setTags(e.target.value)} />
              </div>

              <div>
                <div className="text-sm opacity-70 mb-1">Transcript (optional)</div>
                <textarea className="w-full min-h-[160px] rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={transcript} onChange={e=>setTranscript(e.target.value)} />
              </div>

              <div className="flex items-center gap-3">
                <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save/Update'}</Button>
              </div>
              {status && <div className="opacity-80">{status}</div>}
            </form>
          </Card>
        </Container>
      </Section>
    </main>
  );
}
