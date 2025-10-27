import * as React from 'react';
import { useRouter } from 'next/router';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Icon } from '@/components/design-system/Icon';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { fetchStreak } from '@/lib/streak';
import { PronunciationBar } from '@/components/vocab/PronunciationBar';
import type { WordPronunciation } from '@/types/vocabulary';

type WordInfo = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  synonyms: string[];
  interest: string | null;
  partOfSpeech?: string | null;
  categories?: string[];
  pronunciations?: WordPronunciation[];
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

const highlightPills = ['Daily boost', 'Accent options', 'Adaptive review'] as const;
const deepDiveHighlights = ['Multi-accent audio', 'Context prompts', 'Practice playlists'] as const;

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
    title: 'Progress that inspires',
    description:
      'Celebrate streak wins, unlock milestone insights, and keep motivation high with qualitative feedback.',
    icon: 'Target',
    accent: {
      iconBg: 'bg-success/15',
      iconText: 'text-success',
      badgeVariant: 'success',
    },
    items: [
      {
        name: 'Streak heat',
        file: '🔥 Progress',
        summary: 'Watch your longest run climb while every mastered word adds momentum to your routine.',
        icon: 'Flame',
      },
      {
        name: 'Reflection prompts',
        file: 'Journals',
        summary: 'Lock in gains with short self-reflections and celebrate the feelings behind your streak.',
        icon: 'NotebookPen',
      },
    ],
  },
];

const DEFAULT_CATEGORY_OPTIONS = [
  'Speaking stories',
  'Academic writing',
  'Career focus',
  'Mindset',
  'Motivation',
  'Travel diaries',
] as const;

function normaliseCategories(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return Array.from(
    new Set(
      raw
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry): entry is string => entry.length > 0),
    ),
  );
}

function normalisePronunciationsClient(value: unknown): WordPronunciation[] {
  const entries = Array.isArray(value) ? value : value ? [value] : [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const ipa = typeof record.ipa === 'string' && record.ipa.trim().length > 0 ? record.ipa.trim() : null;
      const audioUrl =
        typeof record.audioUrl === 'string' && record.audioUrl.trim().length > 0 ? record.audioUrl.trim() : null;
      const locale = typeof record.locale === 'string' && record.locale.trim().length > 0 ? record.locale.trim() : null;
      const label = typeof record.label === 'string' && record.label.trim().length > 0 ? record.label.trim() : null;

      if (!ipa && !audioUrl && !locale && !label) return null;
      return { ipa, audioUrl, locale, label } satisfies WordPronunciation;
    })
    .filter((entry): entry is WordPronunciation => Boolean(entry));
}

function sanitiseWordInfo(word: WordInfo | (WordInfo & Record<string, any>) | null | undefined): WordInfo {
  if (!word || typeof word !== 'object') {
    return {
      id: 'unknown',
      word: 'Word',
      meaning: 'Definition arriving soon.',
      example: null,
      synonyms: [],
      interest: null,
      partOfSpeech: null,
      categories: Array.from(DEFAULT_CATEGORY_OPTIONS),
      pronunciations: [],
    };
  }

  const synonyms = Array.isArray(word.synonyms)
    ? (word.synonyms as (string | null)[]).filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
      )
    : [];

  const categories = normaliseCategories((word as { categories?: unknown }).categories);
  const pronunciations = normalisePronunciationsClient(
    (word as { pronunciations?: unknown }).pronunciations ?? (word as { pronunciation?: unknown }).pronunciation,
  );

  return {
    id: typeof word.id === 'string' ? word.id : 'unknown',
    word: typeof word.word === 'string' ? word.word : 'Word',
    meaning: typeof word.meaning === 'string' ? word.meaning : 'Definition arriving soon.',
    example: typeof word.example === 'string' ? word.example : null,
    synonyms,
    interest: typeof word.interest === 'string' ? word.interest : null,
    partOfSpeech:
      typeof word.partOfSpeech === 'string'
        ? word.partOfSpeech
        : typeof (word as { part_of_speech?: unknown }).part_of_speech === 'string'
          ? String((word as { part_of_speech?: unknown }).part_of_speech)
          : null,
    categories: categories.length > 0 ? categories : Array.from(DEFAULT_CATEGORY_OPTIONS),
    pronunciations,
  };
}

function momentumDescriptor(streakDays: number) {
  if (streakDays >= 21) return 'IELTS powerhouse momentum';
  if (streakDays >= 14) return 'unstoppable rhythm';
  if (streakDays >= 7) return 'weekly streak hero';
  if (streakDays >= 3) return 'finding your stride';
  return 'day-one spark';
}

function nextMilestone(streakDays: number) {
  if (streakDays >= 21) return null;
  if (streakDays >= 14) return 21;
  if (streakDays >= 7) return 14;
  if (streakDays >= 3) return 7;
  return 3;
}

const GUEST_SAMPLER_WORDS: WordInfo[] = [
  {
    id: 'guest-articulate',
    word: 'articulate',
    meaning: 'express ideas clearly and fluently, especially in speaking',
    example: 'In Speaking Part 3 you must articulate complex opinions with confidence.',
    synonyms: ['express', 'voice', 'enunciate'],
    interest: 'Describe articulate speakers to impress examiners and show command over precision language.',
    partOfSpeech: 'adjective',
    categories: ['Speaking stories', 'Communication'],
    pronunciations: [
      { ipa: '/ɑːrˈtɪk.jə.lət/', locale: 'en-US', label: 'American' },
      { ipa: '/ɑːˈtɪk.jʊ.lət/', locale: 'en-GB', label: 'British' },
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
    categories: ['Academic writing', 'Mindset'],
    pronunciations: [
      { ipa: '/məˈtɪk.jə.ləs/', locale: 'en-US', label: 'American' },
      { ipa: '/məˈtɪk.jʊ.ləs/', locale: 'en-GB', label: 'British' },
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
      { ipa: '/rɪˈzɪl.jənt/', locale: 'en-US', label: 'American' },
      { ipa: '/rɪˈzɪl.i.ənt/', locale: 'en-GB', label: 'British' },
    ],
  },
];

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
      const word = sanitiseWordInfo(json.word);
      const streakDays = await syncStreak(json.streakDays ?? 0);
      const normalized: WordOfTheDayPayload = {
        ...json,
        word,
        streakDays,
        longestStreak: Math.max(json.longestStreak ?? 0, streakDays),
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

function useSpeechPronunciation(word: string) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = React.useState(false);

  React.useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      voicesRef.current = synth.getVoices();
    };

    updateVoices();

    const handler = () => updateVoices();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', handler);
      return () => synth.removeEventListener('voiceschanged', handler);
    }

    const previous = synth.onvoiceschanged;
    synth.onvoiceschanged = handler;
    return () => {
      if (synth.onvoiceschanged === handler) {
        synth.onvoiceschanged = previous ?? null;
      }
    };
  }, [supported]);

  const speak = React.useCallback(
    (locale?: string | null) => {
      if (!supported) return false;
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(word);

      if (locale) {
        const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
        const normalised = locale.toLowerCase();
        let voice = voices.find((entry) => entry.lang?.toLowerCase().startsWith(normalised));
        if (!voice) {
          const base = normalised.split('-')[0];
          voice = voices.find((entry) => entry.lang?.toLowerCase().startsWith(base));
        }
        if (voice) {
          utterance.voice = voice;
        }
        utterance.lang = locale;
      }

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      synth.cancel();
      setSpeaking(true);
      synth.speak(utterance);
      return true;
    },
    [supported, word],
  );

  return { speak, speaking, supported } as const;
}

const accentLabel = (entry: WordPronunciation | undefined, index: number) => {
  if (!entry) return `Accent ${index + 1}`;
  if (entry.label && entry.label.trim().length > 0) return entry.label;
  if (entry.locale && entry.locale.trim().length > 0) return entry.locale.toUpperCase();
  return `Accent ${index + 1}`;
};

const pluralise = (value: number, singular = '', plural = 's') => (value === 1 ? singular : plural);

function StreakInsights({
  streakDays,
  longestStreak,
}: Pick<WordOfTheDayPayload, 'streakDays' | 'longestStreak'>) {
  const streak = Math.max(0, streakDays);
  const longest = Math.max(longestStreak ?? 0, streak);
  const descriptor = momentumDescriptor(streak);
  const milestone = nextMilestone(streak);

  return (
    <div className="text-sm text-muted-foreground">
      🔥 <span className="font-semibold text-foreground">{streak}</span> day
      {pluralise(streak)} streak • Personal best {longest} day
      {pluralise(longest)} • Momentum: {descriptor}
      {milestone
        ? ` • Next milestone: ${milestone}-day streak`
        : ' • Keep celebrating your mastery!'}
    </div>
  );
}

const CATEGORY_GUIDES: Record<string, { tagline: string; template: (word: WordInfo | null) => string }> = {
  'Speaking stories': {
    tagline: 'Speaking Part 2 idea',
    template: (word) => {
      const headword = word?.word ?? 'this word';
      const synonyms = word?.synonyms?.slice(0, 2).join(' / ') ?? 'simpler words';
      return `Narrate a short Speaking Part 2 story where you had to stay ${headword.toLowerCase()}.
Highlight how choosing “${headword}” elevates the story compared to ${synonyms}.`;
    },
  },
  'Academic writing': {
    tagline: 'Writing Task 2 support',
    template: (word) => {
      const headword = word?.word ?? 'the concept';
      return `Draft a topic sentence using “${headword}” to strengthen a Writing Task 2 argument.
Tie it to a statistic or expert view to prove your precision.`;
    },
  },
  'Career focus': {
    tagline: 'Professional narrative',
    template: (word) => {
      const headword = word?.word ?? 'this trait';
      return `Explain how ${headword.toLowerCase()} shaped a project at work.
Describe the team impact and the decision you influenced.`;
    },
  },
  Mindset: {
    tagline: 'Mindset reflection',
    template: (word) => {
      const headword = word?.word ?? 'this trait';
      return `Journal one challenge where being ${headword.toLowerCase()} helped you bounce back.
Note the habit you want to repeat this week.`;
    },
  },
  Motivation: {
    tagline: 'Goal journal',
    template: (word) => {
      const headword = word?.word ?? 'this word';
      return `Set a micro-goal for tomorrow that lets you practise feeling ${headword.toLowerCase()}.
Write a single sentence you could post in your accountability group.`;
    },
  },
  'Travel diaries': {
    tagline: 'Travel hook',
    template: (word) => {
      const headword = word?.word ?? 'this word';
      return `Describe a travel scenario (airport, tour, homestay) where someone truly embodied “${headword}”.
Use it to open a Speaking Part 2 answer with colour.`;
    },
  },
  Communication: {
    tagline: 'Collaboration story',
    template: (word) => {
      const headword = word?.word ?? 'this skill';
      return `Share how you displayed ${headword.toLowerCase()} during a group discussion.
Mention the reaction you received from teammates or examiners.`;
    },
  },
};

function buildCategoryPrompt(category: string, word: WordInfo | null) {
  const entry = CATEGORY_GUIDES[category];
  if (entry) {
    return {
      category,
      tagline: entry.tagline,
      prompt: entry.template(word),
    };
  }

  const headword = word?.word ?? 'this word';
  const synonyms = word?.synonyms?.slice(0, 2).join(' / ') ?? 'simpler words';
  return {
    category,
    tagline: 'Personalised idea',
    prompt: `Use “${headword}” in a ${category.toLowerCase()} example and contrast it with ${synonyms} to show nuance.`,
  };
}

function VocabularyJourneyPlanner({ word, loading }: { word: WordInfo | null; loading: boolean }) {
  const categories = React.useMemo(() => {
    const base = word?.categories ?? [];
    return Array.from(new Set([...base, ...DEFAULT_CATEGORY_OPTIONS]));
  }, [word?.categories]);

  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (categories.length === 0) {
      setSelected([]);
      return;
    }
    setSelected((prev) => {
      const filtered = prev.filter((category) => categories.includes(category));
      if (filtered.length > 0) return filtered;
      return categories.slice(0, Math.min(2, categories.length));
    });
  }, [categories]);

  const toggleCategory = React.useCallback((category: string) => {
    setSelected((prev) => {
      if (prev.includes(category)) {
        return prev.filter((value) => value !== category);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), category];
      }
      return [...prev, category];
    });
  }, []);

  const prompts = React.useMemo(
    () => selected.map((category) => buildCategoryPrompt(category, word)),
    [selected, word],
  );

  if (loading && !word) {
    return (
      <Card padding="lg" className="border-border/40 bg-white/80 shadow-md backdrop-blur dark:bg-dark/60">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-border/40 bg-white/80 shadow-md backdrop-blur dark:bg-dark/60">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-electricBlue/15 text-electricBlue">
          <Icon name="Compass" size={22} />
        </span>
        <div>
          <Badge variant="info" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
            Personalise
          </Badge>
          <h3 className="mt-2 text-xl font-semibold text-foreground">Choose your vocabulary vibe</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick up to three contexts you care about. We&apos;ll surface prompts that help today&apos;s word stick.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => {
          const isActive = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-electricBlue/40 ${
                isActive
                  ? 'border-electricBlue bg-electricBlue/10 text-electricBlue shadow-sm'
                  : 'border-border bg-white/70 text-muted-foreground hover:border-electricBlue/40 hover:text-electricBlue'
              }`}
              onClick={(event) => {
                event.stopPropagation();
                toggleCategory(category);
              }}
              aria-pressed={isActive}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {prompts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Select a context to unlock speaking and writing ideas tailored to today&apos;s spotlight word.
          </p>
        )}
        {prompts.map((item) => (
          <div key={item.category} className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-left shadow-sm">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-electricBlue">{item.tagline}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-line">{item.prompt}</p>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="soft"
        tone="primary"
        className="mt-5 rounded-ds-xl"
        disabled={selected.length === 0}
        onClick={(event) => {
          event.stopPropagation();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('vocabulary:preferences', {
                detail: { categories: selected },
              }),
            );
          }
        }}
        trailingIcon={<Icon name="BookmarkCheck" size={16} />}
      >
        Save my practice focus
      </Button>
    </Card>
  );
}

function PronunciationSelector({
  word,
  pronunciations,
}: {
  word: string;
  pronunciations?: WordPronunciation[];
}) {
  const options = React.useMemo(
    () =>
      (pronunciations ?? []).filter(
        (entry): entry is WordPronunciation =>
          Boolean(entry) && typeof entry === 'object' && (!!entry.ipa || !!entry.audioUrl || !!entry.label || !!entry.locale),
      ),
    [pronunciations],
  );
  const [activeIndex, setActiveIndex] = React.useState(0);
  const { speak, speaking, supported } = useSpeechPronunciation(word);

  React.useEffect(() => {
    if (options.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => (prev >= options.length ? 0 : prev));
  }, [options.length]);

  if (options.length === 0) {
    return null;
  }

  const selected = options[Math.min(activeIndex, options.length - 1)];

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((entry, index) => {
          const isActive = index === activeIndex;
          const label = accentLabel(entry, index);
          return (
            <button
              key={`${label}-${index}`}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-electricBlue/40 ${
                isActive
                  ? 'border-electricBlue bg-electricBlue/10 text-electricBlue shadow-sm'
                  : 'border-border bg-white/70 text-muted-foreground hover:border-electricBlue/40 hover:text-electricBlue'
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(index);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <PronunciationBar pronunciation={selected} />

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full border border-transparent px-4"
          disabled={!supported || speaking}
          onClick={(event) => {
            event.stopPropagation();
            void speak(selected?.locale ?? null);
          }}
        >
          {speaking ? 'Speaking…' : `Speak ${accentLabel(selected, activeIndex)}`}
        </Button>
        {!supported && (
          <span className="text-xs text-danger">
            Browser audio synthesis unavailable. Use Chrome, Safari, or Edge to hear pronunciations.
          </span>
        )}
        {selected?.ipa && (
          <span>
            Focus on the stressed syllable highlighted in the IPA to mimic natural rhythm.
          </span>
        )}
      </div>
    </div>
  );
}

function WordContent({ data }: { data: WordOfTheDayPayload }) {
  const categories = React.useMemo(
    () => (data.word.categories ?? []).filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    [data.word.categories],
  );
  const displayedCategories = React.useMemo(() => categories.slice(0, 4), [categories]);

  return (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-electricBlue">
        <Icon name="Sparkles" size={16} />
        Word studio
      </div>
      <h3 className="mt-3 text-4xl font-semibold capitalize sm:text-5xl">{data.word.word}</h3>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {data.word.partOfSpeech && (
          <Badge variant="neutral" size="xs" className="rounded-full px-3 py-1 tracking-[0.25em]">
            {data.word.partOfSpeech}
          </Badge>
        )}
        {displayedCategories.map((category) => (
          <Badge key={category} variant="info" size="xs" className="rounded-full bg-electricBlue/10 text-electricBlue">
            {category}
          </Badge>
        ))}
      </div>

      <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">{data.word.meaning}</p>

      <PronunciationSelector word={data.word.word} pronunciations={data.word.pronunciations} />

      {data.word.synonyms.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Synonym web</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {data.word.synonyms.map((synonym) => (
              <SynonymBadge key={synonym}>{synonym}</SynonymBadge>
            ))}
          </div>
        </div>
      )}

      {data.word.example && (
        <p className="mt-5 max-w-xl text-sm italic text-muted-foreground">&ldquo;{data.word.example}&rdquo;</p>
      )}

      {data.word.interest && (
        <p className="mt-3 text-sm text-primary">{data.word.interest}</p>
      )}
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
    <Container>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
                  {data && <StreakInsights streakDays={data.streakDays} longestStreak={data.longestStreak} />}
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

        <div className="space-y-6">
          <VocabularyJourneyPlanner word={data?.word ?? null} loading={loading} />
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

  return (
    <Container>
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="info" size="sm" className="inline-flex items-center gap-2">
          <Icon name="Sparkles" size={16} className="text-electricBlue" />
          Daily vocabulary lab
        </Badge>
        <h1 className="mt-4 font-slab text-4xl font-semibold text-foreground sm:text-5xl">
          Master today&apos;s IELTS spotlight
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Hear multiple pronunciations, explore lived-in examples, and tailor practise prompts so the word becomes exam-ready muscle
          memory.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {deepDiveHighlights.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full bg-electricBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-electricBlue"
            >
              <Icon name="Sparkle" size={14} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
                <StreakInsights streakDays={data.streakDays} longestStreak={data.longestStreak} />
              )}
            </div>

            {error && !loading && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
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
