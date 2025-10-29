// types/supabase.ts
// Table-shaped types used by Supabase client and RLS-safe inserts/updates.

import type { StudyPlan } from './plan';
import type { AnyAttempt } from './attempts';
import type { PlanId } from './pricing';

export interface TableBase {
  id: string | number;
  created_at: string;  // ISO
  updated_at?: string; // ISO
}

export interface ReadingExplanation extends TableBase {
  attempt_id: string;
  section: string;
  summary: string;
  focus?: string | null;
  reasons: unknown;
  model?: string | null;
  tokens?: number | null;
}

export interface ReadingItem {
  question_id: string;
  difficulty: 'easy' | 'med' | 'hard';
  created_at: string;
  updated_at: string;
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

export type LiveSessionType = 'human' | 'ai' | 'peer';
export type LiveSessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type SpeakingExerciseType = 'phoneme' | 'word' | 'sentence' | 'cue_card';
export type SpeakingExerciseLevel = 'B1' | 'B2' | 'C1' | 'C2';
export type SpeakingAttemptRefType = 'exercise' | 'free_speech';
export type SpeakingSegmentTokenType = 'word' | 'phoneme';

export type LearningModule = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocab';
export type LearningTaskType = 'drill' | 'mock' | 'lesson' | 'review';

export interface LearningTask extends TableBase {
  slug: string;
  module: LearningModule;
  type: LearningTaskType;
  est_minutes: number;
  tags: string[];
  difficulty?: string | null;
  metadata: Record<string, unknown>;
  min_plan: PlanId;
  is_active: boolean;
}

export interface LearningSignal {
  id: number;
  user_id: string;
  module: LearningModule;
  key: string;
  value: number;
  source: string;
  occurred_at: string;
}

export interface LearningProfileRow {
  user_id: string;
  target_band?: number | null;
  speaking_pron?: number | null;
  speaking_fluency?: number | null;
  reading_tfng?: number | null;
  reading_mcq?: number | null;
  writing_task2?: number | null;
  vocab_range?: number | null;
  listening_accuracy?: number | null;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

export type RecommendationStatus = 'pending' | 'shown' | 'accepted' | 'skipped' | 'completed';

export interface RecommendationRow extends TableBase {
  user_id: string;
  task_id: string;
  reason: string;
  score: number;
  status: RecommendationStatus;
}

export interface TaskRunRow extends TableBase {
  user_id: string;
  task_id: string;
  recommendation_id?: string | null;
  started_at: string;
  completed_at?: string | null;
  outcome?: Record<string, unknown> | null;
  band_delta?: number | null;
}

export interface SpeakingExercise extends TableBase {
  slug: string;
  level: SpeakingExerciseLevel;
  type: SpeakingExerciseType;
  prompt: string;
  ipa?: string | null;
  target_wpm?: number | null;
  tags: string[];
}

export interface SpeakingAttempt extends TableBase {
  user_id: string;
  exercise_id?: string | null;
  ref_type: SpeakingAttemptRefType;
  ref_text?: string | null;
  audio_path: string;
  duration_ms: number;
  wpm?: number | null;
  fillers_count?: number | null;
  overall_pron?: number | null;
  overall_intonation?: number | null;
  overall_stress?: number | null;
  overall_fluency?: number | null;
  band_estimate?: number | null;
  engine: Record<string, unknown>;
}

export interface SpeakingSegment {
  id: string;
  created_at: string;
  attempt_id: string;
  token_type: SpeakingSegmentTokenType;
  token: string;
  start_ms: number;
  end_ms: number;
  accuracy?: number | null;
  stress_ok?: boolean | null;
  notes?: string | null;
}

export interface SpeakingPronGoal extends TableBase {
  user_id: string;
  ipa: string;
  target_accuracy: number;
  current_accuracy?: number | null;
  last_practiced_at?: string | null;
}

export type SpeakingPromptPart = 'p1' | 'p2' | 'p3' | 'interview' | 'scenario';
export type SpeakingPromptDifficulty = 'B1' | 'B2' | 'C1' | 'C2';

export interface SpeakingPrompt extends TableBase {
  slug: string;
  part: SpeakingPromptPart;
  topic: string;
  question?: string | null;
  cue_card?: string | null;
  followups: string[];
  difficulty: SpeakingPromptDifficulty;
  locale: string;
  tags: string[];
  is_active: boolean;
}

export interface SpeakingPromptPack extends TableBase {
  slug: string;
  title: string;
  description?: string | null;
  visibility: 'public' | 'cohort' | 'private';
  is_active: boolean;
}

export interface SpeakingPromptPackItem {
  pack_id: string;
  prompt_id: string;
  sort_order: number;
  created_at: string;
}

export interface SpeakingPromptSave {
  id: string;
  user_id: string;
  prompt_id: string;
  is_bookmarked: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface SpeakingSession extends TableBase {
  host_user_id: string;
  participant_user_id?: string | null;
  type: LiveSessionType;
  status: LiveSessionStatus;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  metadata: Record<string, unknown>;
}

export interface SessionRecording extends TableBase {
  session_id: string;
  storage_path: string;
  transcript_path?: string | null;
  duration_seconds?: number | null;
  metadata: Record<string, unknown>;
  created_by?: string | null;
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
  email?: string | null;
  full_name?: string;
  country?: string | null;
  english_level?: string | null;
  phone?: string;
  phone_verified?: boolean | null;
  goal_band?: number;
  weaknesses?: string[];
  study_prefs?: string[] | null;
  focus_topics?: string[] | null;
  goal_reason?: string[] | null;
  role?: 'student' | 'teacher' | 'admin';
  status?: string | null;
  membership?: 'free' | 'starter' | 'booster' | 'master';
  locale?: string;
  timezone?: string | null;

  // from codex/add-whatsapp-opt-in-preferences-panel
  notification_channels?: string[] | null;
  whatsapp_opt_in?: boolean | null;
  active_org_id?: string | null;

  // from main
  preferred_language?: string | null;
  language_preference?: string | null;
  study_days?: string[] | null;           // e.g., ['Mon','Wed','Fri']
  study_minutes_per_day?: number | null;  // e.g., 30
  daily_quota_goal?: number | null;
  days_per_week?: number | null;
  time_commitment?: string | null;
  time_commitment_min?: number | null;
  exam_date?: string | null;
  avatar_url?: string | null;
  learning_style?: string | null;
  ai_recommendation?: Record<string, unknown> | null;
  setup_complete?: boolean | null;
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

export interface ReadingNoteTable extends TableBase {
  user_id: string;
  attempt_id: string;
  passage_id: string;
  ranges: Array<{ start: number; end: number; color?: string | null }>;
  note_text?: string | null;
}

export interface Invoices extends TableBase {
  user_id: string;
  provider: 'stripe' | 'easypaisa' | 'jazzcash' | 'crypto';
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
  slug?: string | null;
  title: string;
  prompt_text: string;
  task_type?: 'task1' | 'task2' | null;
  module?: 'academic' | 'general_training' | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  source?: string | null;
  tags?: string[] | null;
  estimated_minutes?: number | null;
  word_target?: number | null;
  created_by?: string | null;
  metadata?: Record<string, any> | null;
}

export interface WritingResponses extends TableBase {
  user_id: string;
  attempt_id?: string | null;
  exam_attempt_id?: string | null;
  prompt_id?: string | null;
  task_type?: 'task1' | 'task2' | null;
  task?: 'task1' | 'task2' | null;
  answer_text: string;
  word_count?: number | null;
  ai_model?: string | null;
  overall_band?: number | null;
  task_response_band?: number | null;
  coherence_band?: number | null;
  lexical_band?: number | null;
  grammar_band?: number | null;
  feedback_summary?: string | null;
  feedback_strengths?: string[] | null;
  feedback_improvements?: string[] | null;
  raw_response?: Record<string, unknown> | null;
  duration_seconds?: number | null;
  evaluation_version?: string | null;
  band_scores?: Record<string, unknown> | null;
  feedback?: Record<string, unknown> | null;
  tokens_used?: number | null;
  submitted_at?: string | null;
}

export interface WritingFeedbackRow extends TableBase {
  attempt_id: string;
  band9_rewrite?: string | null;
  errors?: Record<string, unknown>[] | null;
  blocks?: Record<string, unknown>[] | null;
}

export interface ReviewCommentRow extends TableBase {
  attempt_id: string;
  parent_id?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  body: string;
}

export interface WritingNotificationEvent extends TableBase {
  user_id: string;
  attempt_id?: string | null;
  channel: 'in_app' | 'whatsapp' | 'email';
  type: 'micro_prompt' | 'retake_reminder';
  message: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface MistakesRow extends TableBase {
  user_id: string;
  source: 'writing';
  attempt_id?: string | null;
  type: string;
  excerpt: string;
  excerpt_hash: string;
  ai_tip?: string | null;
  status: 'new' | 'reviewing' | 'resolved';
}

export interface UserXpEvent extends TableBase {
  user_id: string;
  source: 'writing';
  attempt_id?: string | null;
  points: number;
  reason: string;
}

export interface StudyPlanFocusRow extends TableBase {
  user_id: string;
  area: 'writing';
  tag: string;
  weight: number;
  updated_at: string;
}

export interface ExamAttempts extends TableBase {
  user_id: string;
  exam_type: 'reading' | 'listening' | 'writing' | 'speaking';
  status: 'in_progress' | 'submitted' | 'graded' | 'archived';
  started_at: string;
  submitted_at?: string | null;
  duration_seconds?: number | null;
  goal_band?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ExamEvents extends TableBase {
  attempt_id: string;
  user_id: string;
  event_type: 'start' | 'autosave' | 'submit' | 'focus' | 'blur' | 'typing' | 'score';
  payload?: Record<string, unknown> | null;
  occurred_at: string;
}

export type NotificationChannel = 'email' | 'whatsapp';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'deferred';

export interface NotificationsOptIn extends TableBase {
  user_id: string;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  wa_opt_in: boolean;
  channels: NotificationChannel[];
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string | null;
}

export interface NotificationTemplate extends TableBase {
  template_key: string;
  channel: NotificationChannel;
  locale: string;
  subject?: string | null;
  body: string;
  metadata: Record<string, unknown>;
}

export interface NotificationEvent extends TableBase {
  user_id: string;
  event_key: string;
  locale: string;
  payload: Record<string, unknown>;
  requested_channels: NotificationChannel[];
  idempotency_key?: string | null;
  error?: string | null;
  processed_at?: string | null;
}

export interface NotificationDelivery extends TableBase {
  event_id: string;
  template_id?: string | null;
  channel: NotificationChannel;
  status: DeliveryStatus;
  attempt_count: number;
  next_retry_at?: string | null;
  last_attempt_at?: string | null;
  sent_at?: string | null;
  error?: string | null;
  metadata: Record<string, unknown>;
}

export interface NotificationSchedule extends TableBase {
  user_id: string;
  event_key: string;
  channel: NotificationChannel;
  schedule: Record<string, unknown>;
  timezone?: string | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  enabled: boolean;
}

export interface NotificationConsentEvent extends TableBase {
  user_id: string;
  actor_id?: string | null;
  channel: 'email' | 'sms' | 'whatsapp';
  action: 'opt_in' | 'opt_out' | 'verify' | 'test_message' | 'task';
  metadata?: Record<string, unknown> | null;
}

export interface AiAssistLog extends TableBase {
  user_id: string | null;
  feature: 'paraphrase' | 'speaking_hint';
  input: string;
  output: Record<string, unknown> | null;
  tokens_used?: number | null;
}

export interface Experiments {
  key: string;
  name: string;
  status: 'draft' | 'planned' | 'running' | 'paused' | 'completed' | 'disabled';
  guardrail_reason?: string | null;
  default_variant?: string | null;
  traffic_percentage?: number | null;
  metadata?: Record<string, unknown> | null;
  updated_at: string;
}

export interface ExperimentVariants extends TableBase {
  experiment_key: string;
  variant: string;
  weight: number;
  is_default: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface ExperimentAssignments {
  user_id: string;
  experiment_key: string;
  variant: string;
  assigned_at: string;
  guardrail_state: 'active' | 'disabled';
  exposures?: number | null;
  conversions?: number | null;
  last_exposed_at?: string | null;
  last_converted_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ExperimentEvents extends TableBase {
  experiment_key: string;
  user_id: string | null;
  variant: string;
  event: 'assign' | 'expose' | 'convert';
  context?: Record<string, unknown> | null;
  recorded_at: string;
}

export interface ReviewEvents {
  id: string;
  user_id: string | null;
  event: 'open' | 'complete';
  source: string | null;
  word_id: string | null;
  occurred_at: string;
}

export interface CollocationAttempts {
  id: string;
  user_id: string | null;
  challenge_id: string | null;
  attempts: number;
  correct: number;
  source: string | null;
  attempted_at: string;
}

export interface Organizations extends TableBase {
  owner_id: string;
  name: string;
  slug: string;
  metadata?: Record<string, unknown> | null;
}

export interface OrganizationMembers extends TableBase {
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string | null;
  joined_at: string;
}

export interface OrganizationInvites extends TableBase {
  org_id: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface WritingTopics extends TableBase {
  title: string;
  prompt: string;
  band_target: number;
  tags: string[];
  difficulty: 'starter' | 'intermediate' | 'advanced';
  archived_at?: string | null;
}

export interface LifecycleEvents extends TableBase {
  user_id: string;
  event: 'first_mock_done' | 'band_up' | 'streak_broken';
  status: 'pending' | 'sent' | 'skipped' | 'failed';
  channels?: string[] | null;
  context?: Record<string, unknown> | null;
  dedupe_key?: string | null;
  error?: string | null;
  attempts: number;
  created_at: string;
  processed_at?: string | null;
  last_attempt_at?: string | null;
}

export interface PushToken extends TableBase {
  user_id: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  topics: string[];
  subscription?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  device_id?: string | null;
  last_seen_at?: string | null;
  expires_at?: string | null;
}

export interface MobileEvent extends TableBase {
  user_id: string;
  token_id?: string | null;
  event_type: string;
  topic?: string | null;
  payload?: Record<string, unknown> | null;
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
  reading_notes: ReadingNoteTable;
  invoices: Invoices;
  writing_prompts: WritingPrompts;
  writing_responses: WritingResponses;
  writing_feedback: WritingFeedbackRow;
  writing_notification_events: WritingNotificationEvent;
  review_comments: ReviewCommentRow;
  exam_attempts: ExamAttempts;
  exam_events: ExamEvents;
  mistakes: MistakesRow;
  user_xp_events: UserXpEvent;
  study_plan_focus: StudyPlanFocusRow;

  // kept from codex/add-whatsapp-opt-in-preferences-panel
  notifications_opt_in: NotificationsOptIn;
  notification_templates: NotificationTemplate;
  notification_events: NotificationEvent;
  notification_deliveries: NotificationDelivery;
  notification_schedules: NotificationSchedule;
  notification_consent_events: NotificationConsentEvent;

  ai_assist_logs: AiAssistLog;

  experiments: Experiments;
  experiment_variants: ExperimentVariants;
  experiment_assignments: ExperimentAssignments;
  experiment_events: ExperimentEvents;
  review_events: ReviewEvents;
  collocation_attempts: CollocationAttempts;
  lifecycle_events: LifecycleEvents;
  push_tokens: PushToken;
  mobile_events: MobileEvent;
  organizations: Organizations;
  organization_members: OrganizationMembers;
  organization_invites: OrganizationInvites;
  writing_topics: WritingTopics;
  speaking_sessions: SpeakingSession;
  session_recordings: SessionRecording;
  speaking_exercises: SpeakingExercise;
  speaking_attempts: SpeakingAttempt;
  speaking_segments: SpeakingSegment;
  speaking_pron_goals: SpeakingPronGoal;
  speaking_prompts: SpeakingPrompt;
  speaking_prompt_packs: SpeakingPromptPack;
  speaking_prompt_pack_items: SpeakingPromptPackItem;
  speaking_prompt_saves: SpeakingPromptSave;
  learning_tasks: LearningTask;
  learning_signals: LearningSignal;
  learning_profiles: LearningProfileRow;
  recommendations: RecommendationRow;
  task_runs: TaskRunRow;

  // kept from main
  account_audit_log: AccountAuditLog;
  account_deletion_queue: AccountDeletionQueue;
  account_exports: AccountExport;
}

export type TableName = keyof DBSchema;
export type RowOf<T extends TableName> = DBSchema[T];

export type Database = DBSchema;
