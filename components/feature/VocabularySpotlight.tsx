import * as React from 'react';
import { useRouter } from 'next/router';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Icon } from '@/components/design-system/Icon';
import { AudioBar } from '@/components/design-system/AudioBar';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { fetchStreak } from '@/lib/streak';

type WordPronunciation = {
  ipa: string | null;
  audioUrl: string | null;
  locale: string | null;
  label: string | null;
};

type WordInfo = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  synonyms: string[];
  interest: string | null;
  partOfSpeech: string | null;
  categories: string[];
  pronunciations: WordPronunciation[];
};

type WordOfTheDayPayload = {
  word: WordInfo;
  learnedToday: boolean;
  streakDays: number;
  longestStreak: number;
  streakValueUSD: number;
};

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

type FeatureItem = {
  name: string;
  file: string;
  summary: string;
  icon: string;
};

type FeatureGroup = {
  label: string;
  title: string;
  description: string;
  icon: string;
  accent: {
    iconBg: string;
    iconText: string;
    badgeVariant: BadgeVariant;
  };
  items: FeatureItem[];
};

type WordExperienceProgress = {
  learned: number;
  total: number;
  completed: boolean;
};

type WordExperienceState = {
  data: WordOfTheDayPayload | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  markLearned: () => Promise<void>;
  refresh: () => Promise<WordOfTheDayPayload | null>;
  progress?: WordExperienceProgress;
};

type VocabularySpotlightVariant = 'default' | 'guestSampler';

const highlightPills = ['Daily boost', 'Audio rich', 'Adaptive review'] as const;

const groups: FeatureGroup[] = [
  {
    label: 'Discover',
    title: 'Immersive headwords',
    description:
      'Tap into CEFR-aligned headwords with nuanced meanings, context sentences, and memorable associations.',
    icon: 'Sparkles',
    accent: {
      iconBg: 'bg-electricBlue/15',
      iconText: 'text-electricBlue',
      badgeVariant: 'info',
    },
    items: [
      {
        name: 'Instant meanings',
        file: 'Focus view',
        summary: 'Dive into precise definitions written for IELTS success without leaving your streak flow.',
        icon: 'BookOpenCheck',
      },
      {
        name: 'Context sentences',
        file: 'Examples',
        summary: 'Native-speaker examples anchor every headword with naturally phrased IELTS-ready usage.',
        icon: 'MessageSquareQuote',
      },
    ],
  },
  {
    label: 'Grow',
    title: 'Smart practice',
    description:
      'Strengthen recall with adaptive prompts, synonym clusters, and personal streak insights for motivation.',
    icon: 'TrendingUp',
    accent: {
      iconBg: 'bg-purpleVibe/15',
      iconText: 'text-purpleVibe',
      badgeVariant: 'accent',
    },
    items: [
      {
        name: 'Synonym webs',
        file: 'Lexical sets',
        summary: 'Visualise related vocabulary to craft richer answers in Speaking and Writing.',
        icon: 'Orbit',
      },
      {
        name: 'Retention cues',
        file: 'Interest sparks',
        summary: 'Micro facts and mnemonics keep each discovery sticky and session-worthy.',
        icon: 'Lightbulb',
      },
    ],
  },
  {
    label: 'Track',
    title: 'Progress that pays off',
    description:
      'Celebrate streak wins, unlock milestone insights, and convert effort into tangible IELTS momentum.',
    icon: 'BarChartBig',
    accent: {
      iconBg: 'bg-success/15',
      iconText: 'text-success',
      badgeVariant: 'success',
    },
    items: [
      {
        name: 'Streak heat',
        file: '🔥 Progress',
        summary: 'Watch your longest run climb while every mastered word adds to your reward pool.',
        icon: 'Flame',
      },
      {
        name: 'Value tracker',
        file: '$ Impact',
        summary: 'See the USD value of your vocabulary habit grow as you conquer each headword.',
        icon: 'Coins',
      },
    ],
  },
];

const GUEST_SAMPLER_WORDS: WordInfo[] = [
  {
    id: 'guest-articulate',
    word: 'articulate',
    meaning: 'express ideas clearly and fluently, especially in speaking',
    example: 'In Speaking Part 3 you must articulate complex opinions with confidence.',
    synonyms: ['express', 'voice', 'enunciate'],
    interest: 'Describe articulate speakers to impress examiners and show command over precision language.',
    partOfSpeech: 'verb',
    categories: ['Speaking', 'Communication'],
    pronunciations: [
      { ipa: '/ɑrˈtɪkjələt/', audioUrl: null, locale: 'en-US', label: 'American' },
      { ipa: '/ɑːˈtɪkjʊlənt/', audioUrl: null, locale: 'en-GB', label: 'British' },
    ],
  },
  {
    id: 'guest-meticulous',
    word: 'meticulous',
    meaning: 'showing great attention to detail; very careful and precise',
    example: 'Her meticulous notes helped her spot patterns in IELTS Reading passages.',
    synonyms: ['thorough', 'careful', 'precise'],
    interest: 'Use it in Writing Task 2 when praising meticulous planning and structured arguments.',
    partOfSpeech: 'adjective',
    categories: ['Writing', 'Study habits'],
    pronunciations: [
      { ipa: '/məˈtɪkjələs/', audioUrl: null, locale: 'en-US', label: 'American' },
      { ipa: '/mɪˈtɪkjʊləs/', audioUrl: null, locale: 'en-GB', label: 'British' },
    ],
  },
  {
    id: 'guest-resilient',
    word: 'resilient',
    meaning: 'able to recover quickly from difficulties and keep improving',
    example: 'Staying resilient after a tough mock test is crucial for long-term progress.',
    synonyms: ['tough', 'persistent', 'hardy'],
    interest: 'Perfect for Speaking stories about overcoming setbacks and persevering.',
    partOfSpeech: 'adjective',
    categories: ['Mindset', 'Motivation'],
    pronunciations: [
      { ipa: '/rɪˈzɪljənt/', audioUrl: null, locale: 'en-US', label: 'American' },
      { ipa: '/rɪˈzɪljənt/', audioUrl: null, locale: 'en-GB', label: 'British' },
    ],
  },
];

const GUEST_WORD_TOTAL = GUEST_SAMPLER_WORDS.length;

function normalizeWordInfo(word: Partial<WordInfo> | null | undefined): WordInfo {
  const synonymSource = Array.isArray(word?.synonyms) ? word?.synonyms ?? [] : [];
  const synonyms = synonymSource
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => entry.length > 0);

  const categorySource = Array.isArray(word?.categories) ? word?.categories ?? [] : [];
  const categories = categorySource
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => entry.length > 0);

  const pronunciationSource = Array.isArray(word?.pronunciations) ? word.pronunciations ?? [] : [];
  const pronunciations = pronunciationSource
    .map((entry) => ({
      ipa: typeof entry?.ipa === 'string' && entry.ipa.trim().length > 0 ? entry.ipa.trim() : null,
      audioUrl: typeof entry?.audioUrl === 'string' && entry.audioUrl.trim().length > 0 ? entry.audioUrl.trim() : null,
      locale: typeof entry?.locale === 'string' && entry.locale.trim().length > 0 ? entry.locale.trim() : null,
      label: typeof entry?.label === 'string' && entry.label.trim().length > 0 ? entry.label.trim() : null,
    }))
    .filter((entry) => entry.ipa || entry.audioUrl || entry.locale || entry.label);

  return {
    id: typeof word?.id === 'string' && word.id.trim().length > 0 ? word.id : 'word-of-day',
    word: typeof word?.word === 'string' && word.word.trim().length > 0 ? word.word : 'Word of the day',
    meaning: typeof word?.meaning === 'string' && word.meaning.trim().length > 0 ? word.meaning : 'Meaning coming soon.',
    example: typeof word?.example === 'string' && word.example.trim().length > 0 ? word.example : null,
    synonyms,
    interest: typeof word?.interest === 'string' && word.interest.trim().length > 0 ? word.interest : null,
    partOfSpeech:
      typeof word?.partOfSpeech === 'string' && word.partOfSpeech.trim().length > 0 ? word.partOfSpeech : null,
    categories,
    pronunciations,
  };
}

export function useWordOfTheDay(options: { enabled?: boolean } = {}): WordExperienceState {
  const { enabled = true } = options;
  const [data, setData] = React.useState<WordOfTheDayPayload | null>(null);
  const [loading, setLoading] = React.useState(enabled);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const syncStreak = React.useCallback(async (fallback = 0) => {
    let value = fallback;
    try {
      const streak = await fetchStreak();
      value = typeof streak?.current_streak === 'number' ? streak.current_streak : fallback;
    } catch (err) {
      console.warn('[useWordOfTheDay] Unable to sync streak from API:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('streak:changed', { detail: { value } }));
      } catch {}
    }

    return value;
  }, []);

  const load = React.useCallback(async () => {
    if (!enabled) {
      return null;
    }
    setError(null);
    setLoading(true);
    try {
      const { data: session } = await supabaseBrowser.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/words/today', {
        method: 'GET',
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        setError('Could not load Word of the Day.');
        setData(null);
        await syncStreak(0);
        return null;
      }

      const json = (await res.json()) as WordOfTheDayPayload;
      const word = normalizeWordInfo(json?.word ?? null);
      const streakDays = await syncStreak(
        typeof json?.streakDays === 'number' && Number.isFinite(json.streakDays) ? json.streakDays : 0,
      );
      const normalized: WordOfTheDayPayload = {
        ...json,
        word,
        streakDays,
        longestStreak: Math.max(json.longestStreak ?? 0, streakDays),
        streakValueUSD: Number.isFinite(json.streakValueUSD) ? json.streakValueUSD : 0,
      };
      setData(normalized);
      return normalized;
    } catch (err) {
      console.warn('[useWordOfTheDay] Network error', err);
      setError('Network error. Please retry.');
      setData(null);
      await syncStreak(0);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, syncStreak]);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setBusy(false);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load]);

  const markLearned = React.useCallback(async () => {
    if (!enabled || !data || data.learnedToday) return;
    setBusy(true);
    setError(null);
    try {
      const { data: session } = await supabaseBrowser.auth.getSession();
      const token = session?.session?.access_token;

      const r = await fetch('/api/words/learn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ wordId: data.word.id }),
      });

      if (!r.ok) throw new Error('mark-failed');
      const payload = (await r.json()) as {
        ok?: true;
        streakDays?: number;
        longestStreak?: number;
      };
      const updated = await load();
      if (!updated) {
        await syncStreak(typeof payload?.streakDays === 'number' ? payload.streakDays : 0);
      }
    } catch (err) {
      console.warn('[useWordOfTheDay] Could not update', err);
      setError('Could not update. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [data, enabled, load, syncStreak]);

  return {
    data,
    error,
    loading,
    busy,
    markLearned,
    refresh: load,
  } as WordExperienceState;
}

function useGuestSpotlight(): WordExperienceState {
  const [index, setIndex] = React.useState(0);
  const [learned, setLearned] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const total = GUEST_SAMPLER_WORDS.length;
  const completed = learned >= total && total > 0;

  const data = React.useMemo<WordOfTheDayPayload | null>(() => {
    if (completed) return null;
    const word = GUEST_SAMPLER_WORDS[index];
    return {
      word,
      learnedToday: false,
      streakDays: learned,
      longestStreak: learned,
      streakValueUSD: 0,
    };
  }, [completed, index, learned]);

  const progress = React.useMemo<WordExperienceProgress>(
    () => ({
      learned: Math.min(learned, total),
      total,
      completed,
    }),
    [completed, learned, total],
  );

  const markLearned = React.useCallback(async () => {
    if (busy || completed) return;
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setLearned((prev) => Math.min(prev + 1, total));
      setIndex((prev) => {
        const next = prev + 1;
        return next >= total ? prev : next;
      });
    } finally {
      setBusy(false);
    }
  }, [busy, completed, total]);

  const refresh = React.useCallback(async () => data, [data]);

  return {
    data,
    error: null,
    loading: false,
    busy,
    markLearned,
    refresh,
    progress,
  } as WordExperienceState;
}

const SynonymBadge: React.FC<{ value: string }> = ({ value }) => (
  <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-foreground/70">{value}</span>
);

const CategoryBadge: React.FC<{ value: string }> = ({ value }) => (
  <Badge variant="neutral" size="xs" className="rounded-full bg-muted/70 text-[0.6rem] uppercase tracking-wide">
    {value}
  </Badge>
);

const WordPronunciations: React.FC<{ items: WordPronunciation[] }> = ({ items }) => {
  const filtered = items.filter((item) => item.ipa || item.audioUrl);
  if (filtered.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">Pronunciation</p>
      <div className="space-y-3">
        {filtered.map((item, index) => (
          <div
            key={`${item.locale ?? 'pron'}-${item.ipa ?? index}`}
            className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/80 p-4 sm:flex-row sm:items-center"
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {item.label ?? item.locale ?? 'IPA'}
              </span>
              {item.ipa && <span className="text-base font-semibold text-foreground">{item.ipa}</span>}
            </div>
            {item.audioUrl && (
              <AudioBar src={item.audioUrl} preload="none" className="sm:ml-auto sm:w-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function WordContent({ data }: { data: WordOfTheDayPayload }) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-electricBlue">
        <Icon name="Sparkles" size={16} />
        Word studio 1.1
      </div>
      <h3 className="mt-3 text-4xl font-semibold capitalize sm:text-5xl">{data.word.word}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {data.word.partOfSpeech && <Badge variant="subtle">{data.word.partOfSpeech}</Badge>}
        {data.word.categories.slice(0, 4).map((category) => (
          <CategoryBadge key={category} value={category} />
        ))}
      </div>
      <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">{data.word.meaning}</p>
      {data.word.synonyms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {data.word.synonyms.map((synonym) => (
            <SynonymBadge key={synonym}>{synonym}</SynonymBadge>
          ))}
        </div>
      )}
      {data.word.example && (
        <p className="mt-4 max-w-xl text-sm italic text-muted-foreground">&ldquo;{data.word.example}&rdquo;</p>
      )}
      {data.word.interest && (
        <p className="mt-3 text-sm text-primary">{data.word.interest}</p>
      )}
      <WordPronunciations items={data.word.pronunciations ?? []} />
    </>
  );
}

export type VocabularySpotlightFeatureProps = {
  variant?: VocabularySpotlightVariant;
};

export function VocabularySpotlightFeature({
  variant = 'default',
}: VocabularySpotlightFeatureProps) {
  const router = useRouter();
  const isGuestSampler = variant === 'guestSampler';
  const redirectTriggered = React.useRef(false);
  const guestExperience = useGuestSpotlight();
  const wordExperience = useWordOfTheDay({ enabled: !isGuestSampler });
  const { data, error, loading, busy, markLearned, progress } = isGuestSampler
    ? guestExperience
    : wordExperience;

  const learnedCount = progress ? Math.min(progress.learned, progress.total) : 0;
  const totalCount = progress?.total ?? 0;
  const isComplete = Boolean(isGuestSampler && progress?.completed);

  React.useEffect(() => {
    if (!isGuestSampler || !progress?.completed || redirectTriggered.current) return;
    if (typeof window === 'undefined') return;
    redirectTriggered.current = true;
    const timer = window.setTimeout(() => {
      void router.push('/signup?intent=save-progress&source=vocab-spotlight');
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [isGuestSampler, progress?.completed, router]);

  const openDetail = React.useCallback(() => {
    void router.push('/word-of-the-day');
  }, [router]);

  const cardInteractive = Boolean(data) && !isComplete;

  return (
    <Container className="max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <Card
          padding="lg"
          interactive={cardInteractive}
          className="relative overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-electricBlue/5"
          role={cardInteractive ? 'button' : undefined}
          tabIndex={cardInteractive ? 0 : -1}
          onClick={cardInteractive ? openDetail : undefined}
          onKeyDown={
            cardInteractive
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetail();
                  }
                }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              {highlightPills.map((pill) => (
                <Badge key={pill} variant="neutral" size="xs" className="uppercase tracking-[0.35em] text-[0.55rem]">
                  {pill}
                </Badge>
              ))}
              {isGuestSampler && totalCount > 0 && (
                <Badge variant="info" size="xs" className="font-semibold uppercase tracking-[0.2em]">
                  {isComplete
                    ? `${totalCount}/${totalCount} words explored`
                    : `${learnedCount}/${totalCount} words explored`}
                </Badge>
              )}
            </div>

            <div className="mt-6">
              {loading && (
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-36 rounded bg-muted" />
                  <div className="h-12 w-48 rounded bg-muted" />
                  <div className="h-4 w-full max-w-md rounded bg-muted" />
                  <div className="h-3 w-72 rounded bg-muted" />
                </div>
              )}
              {data && !loading && <WordContent data={data} />}
              {isComplete && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-electricBlue">
                    <Icon name="Sparkles" size={16} />
                    Word studio
                  </div>
                  <h3 className="text-3xl font-semibold text-foreground sm:text-4xl">Great work!</h3>
                  <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                    You&apos;ve explored three IELTS-grade words. Create a free account to lock in your new vocabulary and keep the
                    momentum going.
                  </p>
                  <p className="text-sm font-medium text-electricBlue">Redirecting you to sign up…</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {isComplete ? (
                <>
                  <Button
                    variant="primary"
                    onClick={(event) => {
                      event.stopPropagation();
                      void router.push('/signup?intent=save-progress&source=vocab-spotlight');
                    }}
                    trailingIcon={<Icon name="ArrowRight" size={16} />}
                  >
                    Save my new words
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Your preview streak continues once you create a free account.
                  </span>
                </>
              ) : (
                <>
                  <Button
                    variant={data?.learnedToday ? 'secondary' : 'primary'}
                    onClick={(event) => {
                      event.stopPropagation();
                      void markLearned();
                    }}
                    disabled={busy || !data || data.learnedToday}
                  >
                    {data?.learnedToday
                      ? 'Learned today'
                      : busy
                        ? 'Saving…'
                        : isGuestSampler
                          ? 'Mark & see next word'
                          : 'Mark as Learned'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDetail();
                    }}
                    trailingIcon={<Icon name="ArrowUpRight" size={16} />}
                  >
                    Explore deep dive
                  </Button>
                  {data && (
                    <div className="text-sm text-muted-foreground">
                      🔥 <span className="font-semibold text-foreground">{data.streakDays}</span> day
                      {data.streakDays === 1 ? '' : 's'} streak • Personal best {Math.max(data.longestStreak, data.streakDays)}
                      day{Math.max(data.longestStreak, data.streakDays) === 1 ? '' : 's'}
                    </div>
                  )}
                  {isGuestSampler && totalCount > 0 && (
                    <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Word {Math.min(learnedCount + 1, totalCount)} of {totalCount}
                    </span>
                  )}
                </>
              )}
            </div>

            {error && !loading && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}
          </div>
        </Card>

        <div className="space-y-6 self-start">
          {groups.map((group) => (
            <Card
              key={group.label}
              padding="lg"
              className="h-full border-border/40 bg-white/80 shadow-md backdrop-blur dark:bg-dark/60"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${group.accent.iconBg} ${group.accent.iconText}`}
                >
                  <Icon name={group.icon} size={24} />
                </span>
                <div>
                  <Badge
                    variant={group.accent.badgeVariant}
                    size="xs"
                    className="uppercase tracking-[0.35em] text-[0.6rem]"
                  >
                    {group.label}
                  </Badge>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{group.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{group.description}</p>
              <ul className="mt-5 space-y-4">
                {group.items.map((item) => (
                  <li key={item.name} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground/80">
                      <Icon name={item.icon} size={18} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{item.name}</span>
                        <Badge variant="neutral" size="xs" className="font-mono text-[0.6rem] tracking-tight">
                          {item.file}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          <Card padding="lg" className="border-dashed border-electricBlue/40 bg-electricBlue/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">Ready to explore</p>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Launch the full vocabulary browser or hop into the admin authoring flow without leaving the streak.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  href="/vocabulary"
                  variant="soft"
                  tone="info"
                  className="rounded-ds-xl"
                  trailingIcon={<Icon name="ArrowUpRight" size={16} />}
                >
                  Open vocabulary browser
                </Button>
                <Button
                  href="/admin/vocabulary/new-sense"
                  variant="soft"
                  tone="default"
                  className="rounded-ds-xl"
                  trailingIcon={<Icon name="Plus" size={16} />}
                >
                  Add a new sense
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}

export function WordOfTheDayDeepDive() {
  const { data, error, loading, busy, markLearned } = useWordOfTheDay();
  const [guestProgress, setGuestProgress] = React.useState<{ explored: number; total: number } | null>(null);

  React.useEffect(() => {
    if (!data?.word?.id) return;
    if (typeof window === 'undefined') return;

    if (data.word.id.startsWith('guest-')) {
      const storageKey = 'gramorx.wordstudio.guestWords';
      try {
        const existing = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as string[];
        const nextSet = new Set(existing);
        nextSet.add(data.word.id);
        const list = Array.from(nextSet);
        window.localStorage.setItem(storageKey, JSON.stringify(list));
        setGuestProgress({ explored: list.length, total: GUEST_WORD_TOTAL });
      } catch (err) {
        console.warn('[WordOfTheDayDeepDive] guest progress failed', err);
        setGuestProgress({ explored: 1, total: GUEST_WORD_TOTAL });
      }
    } else {
      setGuestProgress(null);
    }
  }, [data?.word?.id]);

  return (
    <Container className="max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="info" size="sm" className="inline-flex items-center gap-2">
          <Icon name="Sparkles" size={16} className="text-electricBlue" />
          Word studio 1.1
        </Badge>
        <h1 className="mt-4 font-slab text-4xl font-semibold text-foreground sm:text-5xl">
          Discover today&apos;s IELTS-ready word
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Explore pronunciation-friendly definitions, context sentences, synonym webs, and streak insights that rival the WordUp
          experience.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {highlightPills.map((pill) => (
            <Badge key={pill} variant="neutral" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
              {pill}
            </Badge>
          ))}
          {guestProgress && (
            <Badge variant="info" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
              {guestProgress.explored}/{guestProgress.total} words explored
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <Card padding="lg" className="relative overflow-hidden border-border/60">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_60%)]" />
          <div className="relative z-10">
            {loading && (
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-40 rounded bg-muted" />
                <div className="h-12 w-64 rounded bg-muted" />
                <div className="h-4 w-full max-w-xl rounded bg-muted" />
                <div className="h-3 w-72 rounded bg-muted" />
              </div>
            )}

            {data && !loading && <WordContent data={data} />}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                variant={data?.learnedToday ? 'secondary' : 'primary'}
                onClick={() => void markLearned()}
                disabled={busy || !data || data.learnedToday}
              >
                {data?.learnedToday ? 'Learned today' : busy ? 'Saving…' : 'Mark as Learned'}
              </Button>
              {data && (
                <div className="text-sm text-muted-foreground">
                  🔥 <span className="font-semibold text-foreground">{data.streakDays}</span> day
                  {data.streakDays === 1 ? '' : 's'} streak • Personal best {Math.max(data.longestStreak, data.streakDays)} day
                  {Math.max(data.longestStreak, data.streakDays) === 1 ? '' : 's'}
                </div>
              )}
            </div>

            {error && !loading && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}
          </div>
        </Card>

        <div className="space-y-6 self-start">
          {groups.map((group) => (
            <Card
              key={group.label}
              padding="lg"
              className="h-full border-border/40 bg-white/80 shadow-md backdrop-blur dark:bg-dark/60"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${group.accent.iconBg} ${group.accent.iconText}`}
                >
                  <Icon name={group.icon} size={24} />
                </span>
                <div>
                  <Badge
                    variant={group.accent.badgeVariant}
                    size="xs"
                    className="uppercase tracking-[0.35em] text-[0.6rem]"
                  >
                    {group.label}
                  </Badge>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{group.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{group.description}</p>
              <ul className="mt-5 space-y-4">
                {group.items.map((item) => (
                  <li key={item.name} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground/80">
                      <Icon name={item.icon} size={18} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{item.name}</span>
                        <Badge variant="neutral" size="xs" className="font-mono text-[0.6rem] tracking-tight">
                          {item.file}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          <Card padding="lg" className="border-dashed border-electricBlue/40 bg-electricBlue/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">Keep exploring</p>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Jump into the full vocabulary browser, continue streak drills, or publish new senses in minutes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  href="/vocabulary"
                  variant="soft"
                  tone="info"
                  className="rounded-ds-xl"
                  trailingIcon={<Icon name="ArrowUpRight" size={16} />}
                >
                  Open vocabulary browser
                </Button>
                <Button
                  href="/vocabulary/learned"
                  variant="soft"
                  tone="success"
                  className="rounded-ds-xl"
                  trailingIcon={<Icon name="BookmarkCheck" size={16} />}
                >
                  View learned words
                </Button>
                <Button
                  href="/dashboard"
                  variant="soft"
                  tone="default"
                  className="rounded-ds-xl"
                  trailingIcon={<Icon name="Flame" size={16} />}
                >
                  Back to streak hub
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}

export default VocabularySpotlightFeature;
