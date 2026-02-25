// pages/ai/study-buddy/session/[id]/summary.tsx
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { getServerClient } from '@/lib/supabaseServer';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Modal } from '@/components/design-system/Modal';
import { Select } from '@/components/design-system/Select';
import { Textarea } from '@/components/design-system/Textarea';
import { Alert } from '@/components/design-system/Alert';

import type { StudySession } from '@/pages/ai/study-buddy';

import { GradientText } from '@/components/design-system/GradientText';
import { useToast } from '@/components/design-system/Toaster';

function normaliseSession(session: any | null): StudySession | null {
  if (!session) return null;
  const items = Array.isArray(session.items)
    ? session.items.map((item: any) => ({
        skill: item.skill,
        minutes: Number(item.minutes || 0),
        topic: item.topic ?? null,
        status: item.status ?? 'pending',
      }))
    : [];
  return {
    id: session.id,
    user_id: session.user_id,
    items,
    state: session.state,
    created_at: session.created_at,
    updated_at: session.updated_at ?? null,
    started_at: session.started_at ?? null,
    ended_at: session.ended_at ?? null,
    duration_minutes: session.duration_minutes ?? null,
    xp_earned: session.xp_earned ?? 0,
  };
}

type Props = { session: StudySession | null };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = String(ctx.query.id || '');
  if (!id) return { notFound: true };

  const supabase = getServerClient(ctx.req, ctx.res);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw userErr;
  if (!user) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl ?? `/ai/study-buddy/session/${id}/summary`)}`,
        permanent: false,
      },
    };
  }

  const { data, error } = await supabase
    .from('study_buddy_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[study-buddy/summary] load error', error);
    return { notFound: true };
  }

  return { props: { session: normaliseSession(data) } };
};

const skillToModule = (skill: string): 'listening' | 'reading' | 'writing' | 'speaking' => {
  const normalized = skill.toLowerCase();
  if (normalized.includes('listen')) return 'listening';
  if (normalized.includes('read')) return 'reading';
  if (normalized.includes('speak')) return 'speaking';
  return 'writing';
};

const SummaryPage: NextPage<Props> = ({ session }) => {
  const toast = useToast();

  const items = session?.items ?? [];
  const duration =
    session?.duration_minutes ?? items.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const completedBlocks = items.filter((item) => item.status === 'completed').length;
  const completionRate = items.length ? Math.round((completedBlocks / items.length) * 100) : 0;
  const skillTotals = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.skill] = (acc[item.skill] ?? 0) + Number(item.minutes || 0);
    return acc;
  }, {});

  const topSkill = Object.entries(skillTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
  const skillOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.skill) unique.add(item.skill);
    });
    return Array.from(unique);
  }, [items]);

  const [mistakeOpen, setMistakeOpen] = useState(false);
  const [mistakeSkill, setMistakeSkill] = useState(skillOptions[0] ?? 'Writing');
  const [mistakeNote, setMistakeNote] = useState('');
  const [mistakeSaving, setMistakeSaving] = useState(false);
  const [mistakeError, setMistakeError] = useState<string | null>(null);

  useEffect(() => {
    if (!skillOptions.length) return;
    setMistakeSkill((current) => (skillOptions.includes(current) ? current : skillOptions[0]!));
  }, [skillOptions]);

  const closeMistake = useCallback(() => {
    setMistakeOpen(false);
    setMistakeError(null);
  }, []);

  const handleLogMistake = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!mistakeNote.trim()) return;
      setMistakeSaving(true);
      setMistakeError(null);
      try {
        if (!session) {
          throw new Error('Session not loaded yet');
        }
        const moduleKey = skillToModule(mistakeSkill);
        const payload = {
          attemptId: session.id,
          module: moduleKey,
          mistakes: [
            {
              questionId: `${session.id}-${Date.now()}`,
              prompt: mistakeNote.trim().slice(0, 200),
              correctAnswer: null,
              givenAnswer: null,
              retryPath: `/ai/study-buddy/session/${session.id}/practice`,
              skill: moduleKey,
              tags: [
                { key: 'source', value: 'study_buddy' },
                { key: 'skill', value: moduleKey },
              ],
            },
          ],
        };

        const resp = await fetch('/api/mistakes/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });
        const body = await resp.json();
        if (!resp.ok || !body?.ok) {
          throw new Error(body?.error || 'Failed to log mistake');
        }

        toast.success('Mistake saved', 'Check the Mistakes Book for your note.');
        setMistakeNote('');
        setMistakeOpen(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Could not log mistake';
        setMistakeError(message);
        toast.error('Could not log mistake', message);
      } finally {
        setMistakeSaving(false);
      }
    },
    [mistakeNote, mistakeSkill, session, toast],
  );

  if (!session) {
    return (
      <Container className="py-20">
        <Card className="p-10 text-center">
          <h1 className="text-2xl font-semibold">Session not found</h1>
          <p className="mt-2 text-muted-foreground">Create a new Study Buddy plan to see your post-session insights.</p>
          <Button className="mt-6" asChild>
            <Link href="/ai/study-buddy">Back to Study Buddy</Link>
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Session summary — Study Buddy</title>
      </Head>
      <Container className="py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="success">Session logged</Badge>
            <h1 className="mt-3 text-3xl font-semibold">
              Great job! <GradientText className="font-semibold">Session recap</GradientText>
            </h1>
            <p className="text-sm text-muted-foreground">
              Completed on {new Date(session.ended_at ?? session.updated_at ?? session.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" asChild>
              <Link href={`/ai/study-buddy/session/${session.id}/practice`}>Review session</Link>
            </Button>
            <Button asChild>
              <Link href="/ai/study-buddy">Start new session</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total focus time</p>
            <p className="mt-3 text-3xl font-semibold">{duration} min</p>
            <p className="mt-2 text-xs text-muted-foreground">Across {session.items.length} guided blocks.</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">XP earned</p>
            <p className="mt-3 text-3xl font-semibold">{session.xp_earned ?? 0} XP</p>
            <p className="mt-2 text-xs text-muted-foreground">Keep stacking XP to boost your weekly streak.</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Completion rate</p>
            <p className="mt-3 text-3xl font-semibold">{completionRate}%</p>
            <p className="mt-2 text-xs text-muted-foreground">{completedBlocks} of {session.items.length} blocks completed.</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Skill breakdown</h2>
          <p className="text-sm text-muted-foreground">Where your focus minutes landed this session.</p>
          <div className="mt-4 space-y-3">
            {Object.entries(skillTotals).map(([skill, minutes]) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="w-28 text-sm font-medium text-foreground">{skill}</span>
                <ProgressBar value={Math.round((minutes / duration) * 100)} className="h-2 flex-1" />
                <span className="w-16 text-right text-sm font-medium text-foreground">{minutes}m</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Highlights</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>You protected your streak with a {duration}-minute deep focus session.</li>
              {topSkill && <li>Your strongest coverage today was {topSkill}. Keep the momentum!</li>}
              <li>Log fresh insights in the Mistakes Book to reinforce progress.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary" asChild>
                <Link href="/mistakes">Open Mistakes Book</Link>
              </Button>
              <Button onClick={() => setMistakeOpen(true)}>Log a mistake</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Next recommendation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Rotate in a fresh speaking drill tomorrow to balance your skill mix. Aim for at least 20 minutes of speaking to stay on track.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Suggested duration</span>
                <span className="font-medium text-foreground">35 min</span>
              </div>
              <div className="flex justify-between">
                <span>Recommended skills</span>
                <span className="font-medium text-foreground">Speaking · Listening · Writing</span>
              </div>
            </div>
            <Button className="mt-6" asChild>
              <Link href="/ai/study-buddy">Build next session →</Link>
            </Button>
          </Card>
        </div>
      </Container>
      <Modal open={mistakeOpen} onClose={closeMistake} title="Log to Mistakes Book" size="md">
        <form onSubmit={handleLogMistake} className="space-y-4">
          {mistakeError && <Alert variant="danger">{mistakeError}</Alert>}
          <Select
            label="Skill"
            value={mistakeSkill}
            onChange={(value) => setMistakeSkill(value)}
            required
          >
            {skillOptions.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
            {!skillOptions.length && <option value="Writing">Writing</option>}
          </Select>
          <Textarea
            label="What did you want to remember?"
            value={mistakeNote}
            onChange={(event) => setMistakeNote(event.target.value)}
            placeholder="Write a quick reminder for future review."
            rows={5}
            required
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeMistake} disabled={mistakeSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={mistakeSaving || !mistakeNote.trim()}>
              {mistakeSaving ? 'Logging…' : 'Log mistake'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default SummaryPage;
