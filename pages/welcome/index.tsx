import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { StreakIndicator } from '@/components/design-system/StreakIndicator';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser
import { getUserRole } from '@/lib/routeAccess';
import { getServerClient } from '@/lib/supabaseServer';
import { useLocale } from '@/lib/locale';
import { useStreak } from '@/hooks/useStreak'; // Added for streak data
import DailyWeeklyChallenges from '@/components/dashboard/DailyWeeklyChallenges';
import { Icon } from '@/components/design-system/Icon';

type WordOfDay = { word: string; meaning?: string; example?: string };

const ModuleCard: React.FC<{ title: string; href: string; caption: string; chip?: string }> = ({
  title, href, caption, chip,
}) => (
  <Link href={href} className="block focus-visible:outline-none group">
    <div className="card-surface rounded-ds-2xl border border-border bg-card text-card-foreground p-5 transition
                    hover:shadow-glow hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-h4 font-semibold">{title}</h3>
        {chip ? <Badge variant="info">{chip}</Badge> : null}
      </div>
      <p className="text-small text-mutedText">{caption}</p>
      <div className="mt-4"><Button variant="secondary" className="rounded-ds-xl">Open</Button></div>
    </div>
  </Link>
);

// --- helpers ---------------------------------------------------------------

function normalizeWod(raw: any): WordOfDay {
  // Handle shapes like:
  // { word: "serendipity", meaning, example }
  // { word: { id, word, meaning, example } }
  // { data: { word: "serendipity", meaning, example } }
  // { data: { word: { id, word, meaning, example } } }
  // [ { word, meaning, example }, ... ]
  let obj: any = raw;

  if (Array.isArray(raw)) obj = raw[0];
  if (raw?.data) obj = raw.data;
  if (Array.isArray(obj)) obj = obj[0];

  let w: string | undefined;
  let m: string | undefined;
  let e: string | undefined;

  if (typeof obj === 'string') {
    w = obj;
  } else if (obj && typeof obj === 'object') {
    if (typeof obj.word === 'string') {
      w = obj.word;
      m = typeof obj.meaning === 'string' ? obj.meaning : undefined;
      e = typeof obj.example === 'string' ? obj.example : undefined;
    } else if (obj.word && typeof obj.word === 'object') {
      w = typeof obj.word.word === 'string' ? obj.word.word : undefined;
      m = typeof obj.word.meaning === 'string' ? obj.word.meaning : undefined;
      e = typeof obj.word.example === 'string' ? obj.word.example : undefined;
    }
  }

  return {
    word: w ?? 'Serendipity',
    meaning: m ?? 'A fortunate discovery by chance.',
    example: e ?? 'I met my mentor by pure serendipity.',
  };
}

// --------------------------------------------------------------------------

export default function WelcomePage() {
  const router = useRouter();
  const { t } = useLocale();
  const {
    current: streakCurrent,
    loading: streakLoading,
    error: streakError,
  } = useStreak();

  const [name, setName] = useState<string | null>(null);
  const [wod, setWod] = useState<WordOfDay | null>(null);
  const [loadingWord, setLoadingWord] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  const redirectToLogin = React.useCallback(() => {
    const redirectTarget = encodeURIComponent('/welcome');
    router.replace(`/login?redirect=${redirectTarget}`);
  }, [router]);

  // Redirect non-students away from /welcome
  useEffect(() => {
    if (!router.isReady) return;

    let mounted = true;
    let redirected = false;

    const sendToLogin = () => {
      redirected = true;
      redirectToLogin();
    };

    (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Session fetch error:', error);
          if (mounted) sendToLogin();
          return;
        }

        const role = getUserRole(session?.user);
        if (role === 'teacher' && mounted) {
          redirected = true;
          router.replace('/teacher');
          return;
        }
        if (role === 'admin' && mounted) {
          redirected = true;
          router.replace('/admin');
          return;
        }
        if (!session && mounted) {
          sendToLogin();
          return;
        }
      } finally {
        if (mounted && !redirected) {
          setCheckingSession(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [redirectToLogin, router, router.isReady]);

  // Pull minimal profile info
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session fetch error:', error);
        return;
      }
      const uid = session?.user?.id;
      if (!uid) return;

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', uid)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return;
      }

      if (mounted) {
        setName(data?.full_name ?? null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Word of the day (robust normalization → always strings)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingWord(true);
      try {
        const r = await fetch('/api/words/today');
        if (!r.ok) throw new Error('Failed to fetch word of the day');
        const j = await r.json();
        if (!active) return;
        setWod(normalizeWod(j));
      } catch (err) {
        console.error('Word of the day fetch error:', err);
        if (!active) return;
        setWod(normalizeWod(null));
      } finally {
        if (active) setLoadingWord(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const greeting = useMemo(
    () => (name ? `Welcome, ${name.split(' ')[0]} 👋` : 'Welcome to GramorX'),
    [name]
  );

  if (checkingSession) {
    return (
      <section className="py-16">
        <Container>
          <div className="rounded-ds-2xl border border-border bg-card p-8 text-center">
            <p className="text-small text-mutedText">Preparing your welcome experience...</p>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-16">
      <Container>
        {/* HERO */}
        <div className="rounded-ds-2xl border border-border bg-card text-card-foreground p-8 mb-10 header-glass">
          <div className="flex flex-wrap items-center gap-6 justify-between">
            <div>
              <h1 className="font-slab text-h1 md:text-display mb-2">{greeting}</h1>
              <p className="text-mutedText max-w-2xl">
                Kickstart your IELTS prep with AI-powered practice, instant feedback, and a clear plan across all four modules.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-ds-xl"><Link href="/profile">Begin Onboarding</Link></Button>
                <Button asChild variant="secondary" className="rounded-ds-xl"><Link href="/dashboard">Go to Dashboard</Link></Button>
                <Button asChild variant="ghost" className="rounded-ds-xl"><Link href="/band-predictor">Try Band Predictor</Link></Button>
              </div>
            </div>

            <div className="min-w-[220px]">
              <div className="rounded-ds-2xl border border-border bg-background/60 p-4">
                <div className="mb-2 text-small text-mutedText">Your streak</div>
                {/* Conditional rendering of StreakIndicator */}
                {streakLoading ? (
                  <div>Loading streak...</div>
                ) : streakError ? (
                  <div>Error: {streakError}</div>
                ) : (
                  <StreakIndicator value={streakCurrent ?? 0} />
                )}
                <div className="mt-2 text-small text-mutedText">Keep a daily streak to unlock bonus mock tests.</div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK START */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-ds-2xl border border-border bg-card p-5">
            <div className="text-small mb-2 text-mutedText">Step 1</div>
            <h3 className="font-semibold mb-2">Set your target band</h3>
            <p className="text-small text-mutedText mb-4">Pick a goal and we’ll tailor your plan.</p>
            <Button asChild size="sm" className="rounded-ds-xl"><Link href="/profile#goal">Choose target</Link></Button>
          </div>
          <div className="rounded-ds-2xl border border-border bg-card p-5">
            <div className="text-small mb-2 text-mutedText">Step 2</div>
            <h3 className="font-semibold mb-2">Take a placement test</h3>
            <p className="text-small text-mutedText mb-4">Get an instant estimate of your current band.</p>
            <Button asChild size="sm" variant="secondary" className="rounded-ds-xl"><Link href="/band-predictor">Start test</Link></Button>
          </div>
          <div className="rounded-ds-2xl border border-border bg-card p-5">
            <div className="text-small mb-2 text-mutedText">Step 3</div>
            <h3 className="font-semibold mb-2">Begin daily practice</h3>
            <p className="text-small text-mutedText mb-4">Short, focused tasks to build momentum.</p>
            <Button asChild size="sm" variant="ghost" className="rounded-ds-xl"><Link href="/challenge">Go to daily tasks</Link></Button>
          </div>
        </div>

        {/* MODULES */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-semibold text-h3">IELTS Modules</h2>
          <Link href="/modules" className="text-primary hover:underline">View all</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <ModuleCard title="Listening" href="/listening" caption="Section-wise practice with transcripts and timings." chip="Practice" />
          <ModuleCard title="Reading" href="/reading" caption="True/False/NG, MCQs and passage strategy." chip="Practice" />
          <ModuleCard title="Writing" href="/writing" caption="Task 1 & Task 2 with AI scoring and tips." chip="AI Feedback" />
          <ModuleCard title="Speaking" href="/speaking" caption="Part 1–3 prompts with recording & evaluation." chip="Record" />
        </div>

        {/* CHALLENGES SPOTLIGHT */}
        <div className="relative mb-16 overflow-hidden rounded-ds-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-12">
          <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-12 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative z-10 grid items-start gap-10 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-5">
              <Badge variant="secondary" className="rounded-full bg-background/70 backdrop-blur">
                Feature spotlight
              </Badge>
              <div className="space-y-3">
                <h2 className="font-slab text-h2 leading-tight text-foreground">
                  Stay motivated with our Daily & Weekly Challenge lane
                </h2>
                <p className="text-mutedText text-base md:text-lg max-w-xl">
                  Master high-value collocations, protect your streak with forgiveness tokens, and collect XP bursts designed to keep your IELTS momentum unstoppable.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-2 rounded-ds-2xl border border-border/50 bg-background/70 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon name="Sparkles" size={18} className="text-primary" />
                    <span className="text-caption uppercase tracking-wide text-mutedText">Collocations</span>
                  </div>
                  <p className="text-h4 font-semibold">5 mastered</p>
                  <p className="text-small text-mutedText">Earn a bonus every time you complete today’s set.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-ds-2xl border border-border/50 bg-background/70 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon name="Flame" size={18} className="text-accent" />
                    <span className="text-caption uppercase tracking-wide text-mutedText">Streak boost</span>
                  </div>
                  <p className="text-h4 font-semibold">Every 7 days</p>
                  <p className="text-small text-mutedText">Unlock forgiveness tokens to keep your run alive.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-ds-2xl border border-border/50 bg-background/70 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon name="Trophy" size={18} className="text-success" />
                    <span className="text-caption uppercase tracking-wide text-mutedText">XP rewards</span>
                  </div>
                  <p className="text-h4 font-semibold">+10 — +12 XP</p>
                  <p className="text-small text-mutedText">Stack daily wins and climb the leaderboard faster.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-ds-xl">
                  <Link href="/challenge">Log today’s progress</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-ds-xl">
                  <Link href="/leaderboard">View XP leaderboard</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-8 -left-10 hidden xl:block">
                <div className="rounded-ds-2xl border border-white/30 bg-white/20 px-4 py-2 text-caption font-medium uppercase tracking-wide text-white shadow-lg shadow-primary/20 backdrop-blur">
                  Real-time progress
                </div>
              </div>
              <div className="relative rounded-ds-2xl border border-white/20 bg-background/85 p-4 shadow-[0_30px_60px_rgba(15,23,42,0.25)] backdrop-blur-xl">
                <DailyWeeklyChallenges />
                <div className="pointer-events-none absolute inset-x-6 -bottom-6 h-12 rounded-full bg-primary/20 blur-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* WORD OF THE DAY + BAND PREDICTOR */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-ds-2xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2"><Badge variant="success">Word of the day</Badge></div>
            {loadingWord ? (
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-primary/10 rounded" />
                <div className="h-4 bg-primary/10 rounded w-3/4" />
                <div className="h-4 bg-primary/10 rounded w-2/3" />
              </div>
            ) : (
              <>
                <div className="text-h2 font-slab">{wod?.word ?? ''}</div>
                {wod?.meaning ? <p className="text-mutedText mt-2">{wod.meaning}</p> : null}
                {wod?.example ? <p className="text-small mt-2 italic">“{wod.example}”</p> : null}
              </>
            )}
          </div>

          <div className="rounded-ds-2xl border border-border bg-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="mb-1 text-small text-mutedText">Unsure where to start?</div>
              <h3 className="text-h3 font-semibold">Band Predictor</h3>
              <p className="text-small text-mutedText mt-1">A quick adaptive test to gauge your current level.</p>
            </div>
            <Button asChild className="rounded-ds-xl"><Link href="/band-predictor">Start now</Link></Button>
          </div>
        </div>

        {/* HELP CTA */}
        <div className="mt-10 flex items-center justify-between rounded-ds-2xl border border-border bg-card p-6">
          <div>
            <h4 className="font-semibold mb-1">Need help?</h4>
            <p className="text-small text-mutedText">Ask the community or talk to our AI assistant.</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="secondary" className="rounded-ds-xl"><Link href="/community">Visit Community</Link></Button>
            <Button asChild variant="ghost" className="rounded-ds-xl"><Link href="/ai">Open AI Assistant</Link></Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res, resolvedUrl }) => {
  try {
    const supabaseServer = getServerClient(req as any, res as any);
    const {
      data: { session },
      error,
    } = await supabaseServer.auth.getSession();

    if (error) {
      console.error('Welcome GSSP session error:', error);
    }

    if (!session?.user) {
      const redirectTarget = encodeURIComponent(resolvedUrl ?? '/welcome');
      return {
        redirect: {
          destination: `/login?redirect=${redirectTarget}`,
          permanent: false,
        },
      };
    }

    const role = getUserRole(session.user);
    if (role === 'teacher') {
      return {
        redirect: {
          destination: '/teacher',
          permanent: false,
        },
      };
    }

    if (role === 'admin') {
      return {
        redirect: {
          destination: '/admin',
          permanent: false,
        },
      };
    }

    return { props: {} };
  } catch (err) {
    console.error('Welcome GSSP unexpected error:', err);
    return { props: {} };
  }
};
