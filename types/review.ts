import type {
  ReviewQueue,
  UserPrefs,
  WordAudio,
  WordCollocation,
  WordExample,
  WordExampleAudio,
  Words,
} from './supabase';

export type ReviewItemType = ReviewQueue['item_type'];

export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking';

export interface ReadingClozeSegmentText {
  type: 'text';
  content: string;
}

export interface ReadingClozeSegmentBlank {
  type: 'blank';
  id: string;
  placeholder: string;
}

export type ReadingClozeSegment = ReadingClozeSegmentText | ReadingClozeSegmentBlank;

export interface ReadingClozeBlank {
  id: string;
  label: string;
  answer: string;
}

export interface ReadingClozeDrill {
  passage: string;
  segments: ReadingClozeSegment[];
  blanks: ReadingClozeBlank[];
  attempts: number;
}

export interface WritingMicroTask {
  prompt: string;
  scenarios: string[];
  suggestedCollocations: string[];
  register?: 'formal' | 'neutral' | null;
  attempts: number;
}

export interface SkillBundle {
  reading?: ReadingClozeDrill;
  writing?: WritingMicroTask;
  speaking?: { attempts: number };
  listening?: { attempts: number; hasAudio: boolean };
  totalExercises?: number;
}

export interface ReviewWordCard {
  type: 'word';
  word?: Pick<Words, 'id' | 'headword' | 'definition' | 'pos' | 'register' | 'cefr' | 'ielts_topics'> & {
    audio?: Pick<WordAudio, 'audio_url' | 'ipa' | 'tts_provider'> | null;
  };
  skills?: SkillBundle;
}

export interface ReviewExampleAudio
  extends Pick<WordExampleAudio, 'audio_url' | 'tts_provider' | 'voice'> {}

export interface ReviewCollocationCard {
  type: 'collocation';
  collocation?: Pick<WordCollocation, 'id' | 'chunk' | 'pattern' | 'note' | 'word_id'>;
  word?: Pick<Words, 'id' | 'headword' | 'definition' | 'pos' | 'ielts_topics'> | null;
  examples?: Array<Pick<WordExample, 'id' | 'text' | 'ielts_topic'> & { audio?: ReviewExampleAudio | null }>;
  skills?: SkillBundle;
}

export interface ReviewGapCard {
  type: 'gap';
  example?: Pick<WordExample, 'id' | 'word_id' | 'text' | 'is_gap_ready' | 'source' | 'ielts_topic'>;
  word?: Pick<Words, 'id' | 'headword' | 'definition' | 'pos' | 'ielts_topics'> | null;
  audio?: ReviewExampleAudio | null;
  skills?: SkillBundle;
}

export type ReviewCard = ReviewWordCard | ReviewCollocationCard | ReviewGapCard;

export interface ReviewQueueEnvelope {
  queue: Pick<ReviewQueue, 'item_type' | 'item_ref_id' | 'due_at' | 'priority'>;
  card: ReviewCard;
}

export interface ReviewTotals {
  word: number;
  collocation: number;
  gap: number;
  overall: number;
}

export type SkillMix = Record<SkillKey, number>;

export interface ReviewDueResponse {
  items: ReviewQueueEnvelope[];
  totals: ReviewTotals;
  skillMix: SkillMix;
  focusSkills: UserPrefs['focus_skill'];
  dailyQuota: UserPrefs['daily_quota_words'];
  requestedMix: ReviewItemType[];
}

export interface ReviewGradeResponse {
  success: true;
  stats: {
    word_id: string;
    status: 'new' | 'learning' | 'mastered' | 'suspended';
    streak_correct: number;
    interval_days: number;
    ef: number;
    ease: 1 | 2 | 3 | 4;
    last_seen_at: string;
    next_due_at: string;
    pron_attempts: number;
    writing_attempts: number;
    reading_attempts: number;
    listening_attempts: number;
  };
  mastery: boolean;
  queue: Pick<ReviewQueue, 'item_type' | 'item_ref_id' | 'due_at' | 'priority'>;
}

export interface ReviewSuspendResponse {
  success: true;
  queue: Pick<ReviewQueue, 'item_type' | 'item_ref_id'>;
}
