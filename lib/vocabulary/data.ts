import words from '@/data/generated/words-phase2.json';

import type {
  VocabularyCategoryMomentum,
  VocabularyHighlightWord,
  VocabularyHighlights,
  VocabularyMomentum,
  VocabularyTopCategory,
  VocabularyTrendingWord,
  WordDetail,
  WordSense,
  WordSummary,
} from '@/types/vocabulary';

interface RawWord {
  id: string;
  headword: string;
  definition: string;
  freq_rank?: number;
  register?: string | null;
  cefr?: string | null;
  ielts_topics?: string[];
}

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inferPartOfSpeech = (word: string, definition: string): string => {
  const lowered = word.toLowerCase();
  if (/ly$/.test(lowered)) return 'adverb';
  if (/ness$|tion$|ment$|ity$|ship$|ance$|ence$/.test(lowered)) return 'noun';
  if (/ous$|ful$|ive$|less$|able$|ible$|al$|ic$|ish$/.test(lowered)) return 'adjective';
  if (/ing$|ed$/.test(lowered)) return 'verb';
  if (definition.toLowerCase().startsWith('to ')) return 'verb';
  if (/en$/.test(lowered)) return 'verb';
  return 'noun';
};

const normaliseTopicsToCategories = (topics: string[] | undefined): string[] => {
  if (!topics || topics.length === 0) {
    return ['Academic'];
  }

  const mapped = new Set<string>();

  topics.forEach((topic) => {
    const normalised = topic.toLowerCase();
    if (normalised.includes('business') || normalised.includes('econom')) {
      mapped.add('Business');
    } else if (normalised.includes('technology') || normalised.includes('digital') || normalised.includes('science')) {
      mapped.add('Technology');
    } else if (normalised.includes('travel') || normalised.includes('culture') || normalised.includes('tourism')) {
      mapped.add('Travel');
    } else if (
      normalised.includes('environment') ||
      normalised.includes('health') ||
      normalised.includes('society') ||
      normalised.includes('daily')
    ) {
      mapped.add('Daily Life');
    } else {
      mapped.add('Academic');
    }
  });

  return Array.from(mapped);
};

const buildExample = (word: string, partOfSpeech: string): string => {
  switch (partOfSpeech) {
    case 'verb':
      return `You should ${word.toLowerCase()} key ideas clearly in your IELTS essay.`;
    case 'adjective':
      return `The ${word.toLowerCase()} tone impressed the IELTS examiner.`;
    case 'adverb':
      return `She responded ${word.toLowerCase()} during the speaking interview.`;
    case 'phrase':
      return `Using the phrase "${word.toLowerCase()}" can strengthen your Task 2 response.`;
    default:
      return `Your ${word.toLowerCase()} can influence your IELTS band score.`;
  }
};

const computeFrequencyScore = (rank?: number): number | null => {
  if (!rank || rank <= 0) return null;
  const scaled = Math.round(110 - rank / 120);
  return Math.min(99, Math.max(1, scaled));
};

const computeFrequencyBand = (rank?: number): string | null => {
  if (!rank || rank <= 0) return null;
  if (rank <= 2000) return 'Very high';
  if (rank <= 5000) return 'High';
  if (rank <= 8000) return 'Medium';
  if (rank <= 11000) return 'Low';
  return 'Very low';
};

const normaliseRegisterNote = (register?: string | null): string | null => {
  if (!register) return null;
  const normalised = register.toLowerCase();
  if (normalised === 'neutral') {
    return 'This word appears in neutral IELTS contexts.';
  }
  return `Common in ${normalised} IELTS situations.`;
};

const formatPronunciation = (word: string) => ({
  ipa: `/${word.toLowerCase().replace(/[^a-z]/g, '')}/`,
  audioUrl: null,
  locale: 'en',
  label: 'English',
});

const RAW_WORDS = (words as RawWord[]).map((entry) => {
  const slug = slugify(entry.headword);
  const partOfSpeech = inferPartOfSpeech(entry.headword, entry.definition);
  const level = entry.cefr ?? null;
  const categories = normaliseTopicsToCategories(entry.ielts_topics);
  const frequencyScore = computeFrequencyScore(entry.freq_rank);
  const frequencyBand = computeFrequencyBand(entry.freq_rank);

  const sense: WordSense = {
    id: `${entry.id}-sense-1`,
    definition: entry.definition,
    partOfSpeech,
    register: entry.register ?? null,
    level,
    examples: [buildExample(entry.headword, partOfSpeech)],
    synonyms: [],
    antonyms: [],
  };

  const detail: WordDetail = {
    id: entry.id,
    slug,
    headword: entry.headword,
    partOfSpeech,
    level,
    categories,
    frequencyScore,
    shortDefinition: entry.definition,
    pronunciation: formatPronunciation(entry.headword),
    senses: [sense],
    relatedWords: [],
    frequencyBand,
    rootForm: partOfSpeech === 'verb' ? entry.headword : null,
    notes: normaliseRegisterNote(entry.register),
  };

  return detail;
});

const SORTED_WORDS = RAW_WORDS.sort((a, b) => a.headword.localeCompare(b.headword));
const WORD_MAP = new Map<string, WordDetail>(SORTED_WORDS.map((item) => [item.slug, item]));

const categorySlug = (category: string) => slugify(category);

const toSummary = (word: WordDetail): WordSummary => ({
  id: word.id,
  slug: word.slug,
  headword: word.headword,
  partOfSpeech: word.partOfSpeech,
  level: word.level,
  categories: [...word.categories],
  frequencyScore: word.frequencyScore ?? null,
  shortDefinition: word.shortDefinition ?? null,
});

interface QueryOptions {
  cursor?: string | null;
  limit?: number;
  search?: string;
  partOfSpeech?: string | null;
  level?: string | null;
  category?: string | null;
}

interface QueryResult {
  items: WordSummary[];
  nextCursor: string | null;
  total: number;
}

const matchesSearch = (word: WordDetail, search?: string): boolean => {
  if (!search) return true;
  const value = search.trim().toLowerCase();
  if (!value) return true;
  return (
    word.headword.toLowerCase().includes(value) ||
    (word.shortDefinition?.toLowerCase().includes(value) ?? false) ||
    word.senses.some((sense) => sense.definition.toLowerCase().includes(value))
  );
};

const matchesPartOfSpeech = (word: WordDetail, partOfSpeech?: string | null): boolean => {
  if (!partOfSpeech || partOfSpeech === 'all') return true;
  return word.partOfSpeech.toLowerCase() === partOfSpeech.toLowerCase();
};

const matchesLevel = (word: WordDetail, level?: string | null): boolean => {
  if (!level || level === 'all') return true;
  return (word.level ?? '').toLowerCase() === level.toLowerCase();
};

const matchesCategory = (word: WordDetail, category?: string | null): boolean => {
  if (!category || category === 'all') return true;
  const needle = category.toLowerCase();
  return word.categories.some((cat) => categorySlug(cat) === needle);
};

export const queryVocabulary = ({
  cursor = null,
  limit = 24,
  search,
  partOfSpeech,
  level,
  category,
}: QueryOptions): QueryResult => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const filtered = SORTED_WORDS.filter(
    (word) => matchesSearch(word, search) && matchesPartOfSpeech(word, partOfSpeech) && matchesLevel(word, level) && matchesCategory(word, category),
  );

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = filtered.findIndex((item) => item.slug === cursor);
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1;
    }
  }

  const pageItems = filtered.slice(startIndex, startIndex + safeLimit);
  const lastItem = pageItems[pageItems.length - 1];
  const hasMore = startIndex + safeLimit < filtered.length;

  return {
    items: pageItems.map(toSummary),
    nextCursor: hasMore && lastItem ? lastItem.slug : null,
    total: filtered.length,
  };
};

const relatedSummaries = (word: WordDetail): WordSummary[] => {
  const categories = word.categories.map(categorySlug);
  const related = SORTED_WORDS.filter(
    (candidate) =>
      candidate.slug !== word.slug && candidate.categories.some((cat) => categories.includes(categorySlug(cat))),
  ).slice(0, 6);

  if (related.length < 6) {
    const extras = SORTED_WORDS.filter((candidate) => candidate.slug !== word.slug && !related.includes(candidate))
      .slice(0, 6 - related.length);
    related.push(...extras);
  }

  return related.map(toSummary);
};

export const getWordDetail = (slug: string): WordDetail | null => {
  const base = WORD_MAP.get(slug);
  if (!base) return null;

  return {
    ...base,
    categories: [...base.categories],
    pronunciation: base.pronunciation ? { ...base.pronunciation } : undefined,
    senses: base.senses.map((sense) => ({
      ...sense,
      examples: toArray(sense.examples),
      synonyms: toArray(sense.synonyms),
      antonyms: toArray(sense.antonyms),
    })),
    relatedWords: relatedSummaries(base),
  };
};

export const listAllSummaries = (): WordSummary[] => SORTED_WORDS.map(toSummary);

const TREND_MOMENTUM_SEQUENCE: VocabularyMomentum[] = ['rising', 'steady', 'new'];
const CATEGORY_MOMENTUM_SEQUENCE: VocabularyCategoryMomentum[] = ['surging', 'steady', 'emerging'];
const DAILY_GOAL_OPTIONS = [6, 8, 10, 12, 14];
const STUDY_TIPS: string[] = [
  'Review yesterday’s words before introducing two fresh terms to strengthen memory.',
  'Record yourself using new vocabulary in a 60-second voice note to audit pronunciation.',
  'Pair every new word with a personal IELTS scenario so it sticks for Speaking Part 2.',
  'Mix one high-frequency academic word into each Writing Task 1 summary you draft.',
  'Build a spaced-review stack: revisit today’s word at 1, 3, and 7-day intervals.',
];

const CATEGORY_LEARNING_HOOKS: Record<string, string> = {
  Business: 'Use this when analysing company strategy or workplace culture in Writing Task 2.',
  Technology: 'Drop it into Speaking Part 3 answers about innovation and digital trends.',
  Travel: 'Perfect for describing destinations and experiences in Speaking Part 2 stories.',
  'Daily Life': 'Work this into everyday scenarios to sound natural during the interview.',
  Academic: 'Blend it into Task 1 data descriptions to boost lexical sophistication.',
  Mindset: 'Great for reflecting on study habits and resilience during progress reviews.',
  Communication: 'Use it to discuss collaboration and feedback loops in Speaking Part 3.',
  Motivation: 'Tie it to your learning rituals when journaling mock-test reflections.',
};

const PART_OF_SPEECH_HOOKS: Record<string, string> = {
  verb: 'Conjugate it in past, present, and future tenses for mock Speaking drills.',
  adjective: 'Pair it with IELTS Writing Task 2 examples to make arguments vivid.',
  noun: 'Use it to anchor Task 1 summaries with precise subject vocabulary.',
  adverb: 'Practice positioning it before key verbs in sample essays for emphasis.',
};

const DAILY_SEED_MOD = 2 ** 32;

const createDailySeed = (date = new Date()): number => {
  const iso = Number.parseInt(date.toISOString().slice(0, 10).replace(/-/g, ''), 10);
  return Number.isFinite(iso) && iso > 0 ? iso : Math.floor(Date.now() % DAILY_SEED_MOD);
};

const createRng = (seed: number) => {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) % DAILY_SEED_MOD;
    return state / DAILY_SEED_MOD;
  };
};

const pickOne = <T>(items: readonly T[], rng: () => number): T => {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty collection');
  }
  const index = Math.floor(rng() * items.length);
  return items[index] ?? items[0];
};

const pickManyUnique = <T>(items: readonly T[], count: number, rng: () => number): T[] => {
  if (count <= 0) return [];
  if (items.length <= count) return [...items];

  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.floor(rng() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item !== undefined) {
      result.push(item);
    }
  }
  return result;
};

const resolveExample = (word: WordDetail): string | null => {
  for (const sense of word.senses) {
    const [first] = toArray(sense.examples);
    if (first) {
      return first;
    }
  }
  return null;
};

const deriveLearningHook = (word: WordDetail): string => {
  for (const category of word.categories) {
    const hook = CATEGORY_LEARNING_HOOKS[category];
    if (hook) {
      return hook;
    }
  }

  const pos = (word.partOfSpeech ?? '').toLowerCase();
  if (pos && PART_OF_SPEECH_HOOKS[pos]) {
    return PART_OF_SPEECH_HOOKS[pos];
  }

  return `Work “${word.headword}” into your next IELTS response to reinforce it.`;
};

const FALLBACK_HIGHLIGHTS: VocabularyHighlights = {
  wordOfTheDay: {
    id: 'fallback-persevere',
    slug: 'persevere',
    headword: 'Persevere',
    partOfSpeech: 'verb',
    categories: ['Mindset'],
    frequencyScore: null,
    shortDefinition: 'Continue studying even when practice tests feel challenging.',
    example: 'Persevere through timed drills to build exam-day confidence.',
    learningHook: 'Use this motivational verb when reflecting on study habits in Speaking Part 3.',
    frequencyBand: null,
  },
  trendingWords: [],
  topCategories: [],
  recommendedDailyGoal: 10,
  studyTip: 'Blend revision of known words with one fresh addition to keep momentum.',
  totalWords: 0,
  uniqueCategories: 0,
};

export const getVocabularyHighlights = (date = new Date()): VocabularyHighlights => {
  if (SORTED_WORDS.length === 0) {
    return FALLBACK_HIGHLIGHTS;
  }

  const seed = createDailySeed(date);
  const rng = createRng(seed);

  const categoryCounts = new Map<string, number>();
  SORTED_WORDS.forEach((word) => {
    word.categories.forEach((category) => {
      const key = category.trim() || 'Academic';
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    });
  });

  const highlightIndex = Math.floor(rng() * SORTED_WORDS.length);
  const highlightWord = SORTED_WORDS[highlightIndex] ?? SORTED_WORDS[0];

  const wordOfTheDay: VocabularyHighlightWord = {
    ...toSummary(highlightWord),
    example: resolveExample(highlightWord),
    learningHook: deriveLearningHook(highlightWord),
    frequencyBand: highlightWord.frequencyBand ?? null,
  };

  const remainingWords = SORTED_WORDS.filter((word) => word.slug !== highlightWord.slug);
  const trendingSelection = pickManyUnique(remainingWords, 3, rng);

  const trendingWords: VocabularyTrendingWord[] = trendingSelection.map((word, index) => ({
    ...toSummary(word),
    momentum: TREND_MOMENTUM_SEQUENCE[index % TREND_MOMENTUM_SEQUENCE.length],
  }));

  const topCategories: VocabularyTopCategory[] = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count], index) => ({
      name,
      count,
      momentum: CATEGORY_MOMENTUM_SEQUENCE[index % CATEGORY_MOMENTUM_SEQUENCE.length],
    }));

  const recommendedDailyGoal = pickOne(DAILY_GOAL_OPTIONS, rng);
  const studyTip = pickOne(STUDY_TIPS, rng);

  return {
    wordOfTheDay,
    trendingWords,
    topCategories,
    recommendedDailyGoal,
    studyTip,
    totalWords: SORTED_WORDS.length,
    uniqueCategories: categoryCounts.size,
  };
};
