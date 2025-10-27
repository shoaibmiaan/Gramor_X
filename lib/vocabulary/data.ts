import words from '@/data/generated/words-phase2.json';

import type {
  WordDetail,
  WordSense,
  WordSummary,
  VocabularyHighlightWord,
  VocabularyHighlights,
  VocabularyTopCategory,
  VocabularyTrendingWord,
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

const firstExample = (word: WordDetail): string | null => {
  for (const sense of word.senses) {
    const examples = toArray(sense.examples);
    if (examples.length > 0) {
      return examples[0];
    }
  }
  return null;
};

const buildLearningHookForWord = (word: WordDetail): string => {
  const category = word.categories[0] ?? 'IELTS topics';
  const lowerCategory = category.toLowerCase();
  switch (word.partOfSpeech.toLowerCase()) {
    case 'verb':
      return `Use it in Task 2 responses about ${lowerCategory} to show precise action.`;
    case 'adjective':
      return `Blend it into Task 1 comparisons to add colour to ${lowerCategory} charts.`;
    case 'adverb':
      return `Drop it into speaking answers to boost fluency when describing ${lowerCategory}.`;
    case 'noun':
      return `Use it when outlining ${lowerCategory} ideas to sound exam-ready.`;
    default:
      return `Bring it into your next ${lowerCategory} answer for extra range.`;
  }
};

const computeCategoryHighlights = (): VocabularyTopCategory[] => {
  const counts = new Map<string, number>();
  SORTED_WORDS.forEach((word) => {
    word.categories.forEach((category) => {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};

const computeRecommendedDailyGoal = (totalWords: number, uniqueCategories: number): number => {
  if (totalWords <= 0) {
    return 5;
  }

  const base = Math.max(6, Math.round(totalWords / 90));
  const categoryBoost = Math.min(4, Math.round(uniqueCategories / 2));
  return Math.min(18, base + categoryBoost);
};

const dayOfYearIndex = (totalWords: number): number => {
  if (totalWords <= 0) return 0;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const diff = now.getTime() - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return Math.abs(day) % totalWords;
};

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

const buildFallbackHighlights = (): VocabularyHighlights => {
  const fallbackWord: VocabularyHighlightWord = {
    id: 'vocab-placeholder',
    slug: 'start-here',
    headword: 'Lexicon',
    partOfSpeech: 'noun',
    level: null,
    categories: ['Academic'],
    frequencyScore: null,
    shortDefinition: 'Add words to unlock personalised highlights.',
    example: 'Consistent vocabulary review builds IELTS confidence.',
    learningHook: 'Bookmark new vocabulary to start receiving tailored study prompts.',
    frequencyBand: null,
  };

  return {
    wordOfTheDay: fallbackWord,
    trendingWords: [],
    topCategories: [],
    recommendedDailyGoal: 5,
    studyTip: 'Save a few words to start receiving personalised recommendations.',
    totalWords: 0,
    uniqueCategories: 0,
  };
};

export const getVocabularyHighlights = (): VocabularyHighlights => {
  if (SORTED_WORDS.length === 0) {
    return buildFallbackHighlights();
  }

  const totalWords = SORTED_WORDS.length;
  const categories = computeCategoryHighlights();
  const uniqueCategories = categories.length;
  const recommendedDailyGoal = computeRecommendedDailyGoal(totalWords, uniqueCategories);
  const focusCategory = categories[0]?.name ?? 'IELTS topics';
  const secondaryCategory = categories[1]?.name ?? categories[0]?.name ?? 'Academic';

  const highlightIndex = dayOfYearIndex(totalWords);
  const highlightWord = SORTED_WORDS[highlightIndex];

  const wordOfTheDay: VocabularyHighlightWord = {
    id: highlightWord.id,
    slug: highlightWord.slug,
    headword: highlightWord.headword,
    partOfSpeech: highlightWord.partOfSpeech,
    level: highlightWord.level ?? null,
    categories: [...highlightWord.categories],
    frequencyScore: highlightWord.frequencyScore ?? null,
    shortDefinition: highlightWord.shortDefinition ?? null,
    example: firstExample(highlightWord),
    learningHook: buildLearningHookForWord(highlightWord),
    frequencyBand: highlightWord.frequencyBand ?? null,
  };

  const trendingCandidates = [...SORTED_WORDS]
    .sort((a, b) => (b.frequencyScore ?? 0) - (a.frequencyScore ?? 0))
    .slice(0, 6);

  const trendingWords: VocabularyTrendingWord[] = trendingCandidates.map((word, index) => ({
    id: word.id,
    slug: word.slug,
    headword: word.headword,
    partOfSpeech: word.partOfSpeech,
    level: word.level ?? null,
    categories: [...word.categories],
    frequencyScore: word.frequencyScore ?? null,
    shortDefinition: word.shortDefinition ?? null,
    momentum: index === 0 ? 'rising' : index <= 2 ? 'steady' : 'new',
  }));

  const studyTip = `Cover ${recommendedDailyGoal} words today – mix ${focusCategory.toLowerCase()} with ${secondaryCategory.toLowerCase()} items for balanced prep.`;

  return {
    wordOfTheDay,
    trendingWords,
    topCategories: categories.slice(0, 3),
    recommendedDailyGoal,
    studyTip,
    totalWords,
    uniqueCategories,
  };
};
