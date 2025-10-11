// types/supabase.ts
// Table-shaped types used by Supabase client and RLS-safe inserts/updates.

import type { StudyPlan } from './plan';
import type { AnyAttempt } from './attempts';

export interface TableBase {
  id: string | number;
  created_at: string;  // ISO
  updated_at?: string; // ISO
}

export interface Words extends TableBase {
  word: string;
  headword: string;
  pos: string | null;
  definition: string;
  freq_rank: number | null;
  ielts_topics: string[] | null;
  register: 'formal' | 'neutral' | null;
  cefr: 'B1' | 'B2' | 'C1' | null;
  meaning?: string;
  example?: string | null;
  synonyms?: string[] | null;
  interest_hook?: string | null;
}

export interface WordExample extends TableBase {
  word_id: string;
  text: string;
  source: 'ielts_reading' | 'crafted';
  is_gap_ready: boolean;
  ielts_topic?: string | null;
}

export interface WordExampleAudio extends TableBase {
  example_id: string;
  audio_url: Record<string, string>;
  tts_provider?: string | null;
  voice?: string | null;
}

export interface WordCollocation extends TableBase {
  word_id: string;
  chunk: string;
  pattern: string;
  note?: string | null;
}

export interface WordAudio extends TableBase {
  word_id: string;
  ipa?: string | null;
  audio_url: Record<string, string>;
  tts_provider?: string | null;
}

export interface WordPronAttempt extends TableBase {
  user_id: string;
  word_id: string;
  example_id?: string | null;
  item_type: 'word' | 'collocation' | 'gap';
  audio_blob_url?: string | null;
  score?: number | null;
  transcript?: string | null;
  target_text?: string | null;
  features: Record<string, unknown>;
}

export interface WordWritingAttempt extends TableBase {
  user_id: string;
  word_id: string;
  item_type: 'word' | 'collocation' | 'gap';
  prompt: string;
  response: string;
  tokens: number;
  sentences: number;
  collocations_used: string[];
  register_target?: string | null;
  checks: Record<string, unknown>;
  feedback?: string | null;
  score?: number | null;
}

export interface WordReadingAttempt extends TableBase {
  user_id: string;
  word_id: string;
  item_type: 'word' | 'collocation' | 'gap';
  passage: string;
  blanks: Array<Record<string, unknown>> | Record<string, unknown>;
  responses: Array<Record<string, unknown>> | Record<string, unknown>;
  score?: number | null;
  feedback?: string | null;
}

export interface WordListeningAttempt extends TableBase {
  user_id: string;
  word_id: string;
  item_type: 'word' | 'collocation' | 'gap';
  audio_url?: string | null;
}

export interface UserWordStats {
  created_at: string;
  updated_at?: string;
  user_id: string;
  word_id: string;
  status: 'new' | 'learning' | 'mastered' | 'suspended';
  ef: number;
  streak_correct: number;
  last_result?: 'pass' | 'fail' | null;
  last_seen_at?: string | null;
  next_due_at?: string | null;
  interval_days: number;
  ease: 1 | 2 | 3 | 4;
  pron_attempts: number;
  writing_attempts: number;
  reading_attempts: number;
  listening_attempts: number;
}

export interface ReviewQueue {
  created_at: string;
  updated_at?: string;
  user_id: string;
  item_type: 'word' | 'collocation' | 'gap';
  item_ref_id: string;
  due_at: string;
  priority: number;
}

export interface Badge extends TableBase {
  code: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  awarded_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface LeaderboardDaily extends TableBase {
  snapshot_date: string; // YYYY-MM-DD
  user_id: string;
  rank: number;
  score: number;
  metrics?: Record<string, unknown>;
}

export interface UserPrefs {
  created_at: string;
  updated_at?: string;
  user_id: string;
  focus_skill: string[];
  target_band?: number | null;
  daily_quota_words: number;
}

export interface Profiles extends TableBase {
  user_id: string;
  full_name?: string;
  phone?: string;
  goal_band?: number;
  weaknesses?: string[];
  role?: 'student' | 'teacher' | 'admin';
  membership?: 'free' | 'starter' | 'booster' | 'master';
  locale?: string;
  preferred_language?: string | null;
  study_days?: string[] | null;
  study_minutes_per_day?: number | null;
}

export interface StudyPlans extends TableBase {
  user_id: string;
  plan_json: StudyPlan;
  start_iso: string;
  weeks: number;
  goal_band?: number;
}

export interface UsageCounters extends TableBase {
  user_id: string;
  date_iso: string; // YYYY-MM-DD
  key: string;      // e.g., "ai.writing.grade"
  count: number;
  plan_snapshot?: string; // plan id at time of increment
}

export interface Attempts extends TableBase {
  user_id: string;
  module: 'listening' | 'reading' | 'writing' | 'speaking';
  exam_id: string;
  payload: AnyAttempt; // full attempt JSON (normalized shape above)
  band?: number;
}

export interface Invoices extends TableBase {
  user_id: string;
  provider: 'stripe' | 'easypaisa' | 'jazzcash';
  status: 'draft' | 'paid' | 'void' | 'refunded' | 'failed';
  amount_minor: number;
  currency: 'USD' | 'PKR';
  provider_ref?: string;
  meta?: Record<string, any>;
}

export interface AccountAuditLog extends TableBase {
  user_id: string;
  action: string;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface AccountDeletionQueue {
  user_id: string;
  requested_at: string;
  confirmed_at?: string | null;
  purge_after: string;
  status: 'pending' | 'purging' | 'purged' | 'error';
  attempts: number;
  last_error?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AccountExport extends TableBase {
  user_id: string;
  token_hash: string;
  payload: Record<string, unknown>;
  expires_at: string;
  downloaded_at?: string | null;
}

export interface WritingPrompts extends TableBase {
  title: string;
  prompt: string;
  task_type?: 'task1' | 'task2' | 'general' | 'other' | null;
  created_by?: string | null;
}

/** Handy union for typed upserts/selects */
export interface DBSchema {
  words: Words;
  word_examples: WordExample;
  word_collocations: WordCollocation;
  word_audio: WordAudio;
  word_example_audio: WordExampleAudio;
  word_pron_attempts: WordPronAttempt;
  word_writing_attempts: WordWritingAttempt;
  word_reading_attempts: WordReadingAttempt;
  word_listening_attempts: WordListeningAttempt;
  user_word_stats: UserWordStats;
  review_queue: ReviewQueue;
  badges: Badge;
  user_badges: UserBadge;
  leaderboards_daily: LeaderboardDaily;
  user_prefs: UserPrefs;
  profiles: Profiles;
  study_plans: StudyPlans;
  usage_counters: UsageCounters;
  attempts: Attempts;
  invoices: Invoices;
  writing_prompts: WritingPrompts;
  account_audit_log: AccountAuditLog;
  account_deletion_queue: AccountDeletionQueue;
  account_exports: AccountExport;
}

export type TableName = keyof DBSchema;
export type RowOf<T extends TableName> = DBSchema[T];

export type Database = DBSchema;
