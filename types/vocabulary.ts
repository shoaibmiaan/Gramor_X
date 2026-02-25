export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'pronoun'
  | 'determiner'
  | 'phrase'
  | string;

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | string;

export interface WordSense {
  id: string;
  definition: string;
  partOfSpeech?: PartOfSpeech;
  register?: string | null;
  usageNotes?: string | null;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  level?: ProficiencyLevel | null;
}

export interface WordSummary {
  id: string;
  slug: string;
  headword: string;
  partOfSpeech: PartOfSpeech;
  level?: ProficiencyLevel | null;
  categories: string[];
  frequencyScore?: number | null;
  shortDefinition?: string | null;
}

export interface WordPronunciation {
  ipa?: string | null;
  audioUrl?: string | null;
  locale?: string | null;
  label?: string | null;
}

export interface WordDetail extends WordSummary {
  pronunciation?: WordPronunciation | null;
  senses: WordSense[];
  relatedWords?: WordSummary[];
  frequencyBand?: string | null;
  rootForm?: string | null;
  notes?: string | null;
}

export interface PaginatedVocabularyResponse<T = WordSummary> {
  items: T[];
  nextCursor?: string | null;
  total?: number | null;
}

export interface WordDetailResponse {
  item: WordDetail;
}

export type VocabularyMomentum = 'rising' | 'steady' | 'new';

export interface VocabularyTrendingWord extends WordSummary {
  momentum: VocabularyMomentum;
}

export interface VocabularyHighlightWord extends WordSummary {
  example?: string | null;
  learningHook: string;
  frequencyBand?: string | null;
}

export interface VocabularyTopCategory {
  name: string;
  count: number;
}

export interface VocabularyHighlights {
  wordOfTheDay: VocabularyHighlightWord;
  trendingWords: VocabularyTrendingWord[];
  topCategories: VocabularyTopCategory[];
  recommendedDailyGoal: number;
  studyTip: string;
  totalWords: number;
  uniqueCategories: number;
}

export interface VocabularyHighlightsResponse {
  highlights: VocabularyHighlights;
}
