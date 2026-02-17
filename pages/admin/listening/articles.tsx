// pages/admin/listening/articles.tsx
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
  if (!user) return { redirect: { destination: '/auth/signin?next=/admin/listening/articles', permanent: false }, props: {} as any };

  const prof = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
  const role = prof.data?.role ?? 'student';
  if (role !== 'admin' && role !== 'teacher') {
    return { redirect: { destination: '/403', permanent: false }, props: {} as any };
  }
  return { props: { role, email: user.email ?? '' } };
};

export default function AdminListeningArticles({ role, email }: Props) {
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [level, setLevel] = React.useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [tags, setTags] = React.useState('');
  const [content, setContent] = React.useState('');
  const [published, setPublished] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/listening/article.upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, title, level, tags: tags.split(',').map(s => s.trim()).filter(Boolean),
          content_md: content, published,
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
          <h1 className="text-2xl font-semibold">Listening · Articles</h1>
          <p className="opacity-80 mb-4">Role: {role} · {email}</p>

          <Card className="p-4">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <div className="text-sm opacity-70 mb-1">Title</div>
                <input className="w-full rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={title} onChange={e=>setTitle(e.target.value)} required />
              </div>
              <div>
                <div className="text-sm opacity-70 mb-1">Slug</div>
                <input className="w-full rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={slug} onChange={e=>setSlug(e.target.value)} required />
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <div className="text-sm opacity-70 mb-1">Level</div>
                  <select className="rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={level} onChange={e=>setLevel(e.target.value as any)}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="flex-1">
                  <div className="text-sm opacity-70 mb-1">Tags (comma-sep)</div>
                  <input className="w-full rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={tags} onChange={e=>setTags(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="pub" type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)} />
                  <label htmlFor="pub">Published</label>
                </div>
              </div>
              <div>
                <div className="text-sm opacity-70 mb-1">Content (Markdown)</div>
                <textarea className="w-full min-h-[200px] rounded-xl px-3 py-2 bg-[var(--surface-2)]" value={content} onChange={e=>setContent(e.target.value)} />
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
