// types/supabase.ts
// Table-shaped types used by Supabase client and RLS-safe inserts/updates.

import type { StudyPlan } from './plan';
import type { AnyAttempt } from './attempts';

export interface TableBase {
  id: string;
  created_at: string;  // ISO
  updated_at?: string; // ISO
}

export interface Profiles extends TableBase {
  user_id: string;
  full_name?: string;
  phone?: string;
  phone_verified?: boolean | null;
  goal_band?: number;
  weaknesses?: string[];
  study_prefs?: string[] | null;
  focus_topics?: string[] | null;
  role?: 'student' | 'teacher' | 'admin';
  membership?: 'free' | 'starter' | 'booster' | 'master';
  locale?: string;

  // from codex/add-whatsapp-opt-in-preferences-panel
  notification_channels?: string[] | null;
  whatsapp_opt_in?: boolean | null;

  // from main
  preferred_language?: string | null;
  study_days?: string[] | null;           // e.g., ['Mon','Wed','Fri']
  study_minutes_per_day?: number | null;  // e.g., 30
  daily_quota_goal?: number | null;
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

export interface NotificationsOptIn extends TableBase {
  user_id: string;
  sms_opt_in: boolean;
  wa_opt_in: boolean;
  email_opt_in: boolean;
}

export interface NotificationConsentEvent extends TableBase {
  user_id: string;
  actor_id?: string | null;
  channel: 'email' | 'sms' | 'whatsapp';
  action: 'opt_in' | 'opt_out' | 'verify' | 'test_message' | 'task';
  metadata?: Record<string, any> | null;
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
  status: 'planned' | 'running' | 'paused' | 'completed';
  guardrail_reason?: string | null;
  updated_at: string;
}

export interface ExperimentAssignments {
  user_id: string;
  experiment_key: string;
  variant: string;
  assigned_at: string;
  guardrail_state: 'active' | 'disabled';
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

/** Handy union for typed upserts/selects */
export interface DBSchema {
  profiles: Profiles;
  study_plans: StudyPlans;
  usage_counters: UsageCounters;
  attempts: Attempts;
  invoices: Invoices;
  writing_prompts: WritingPrompts;

  // kept from codex/add-whatsapp-opt-in-preferences-panel
  notifications_opt_in: NotificationsOptIn;
  notification_consent_events: NotificationConsentEvent;

  ai_assist_logs: AiAssistLog;

  experiments: Experiments;
  experiment_assignments: ExperimentAssignments;
  review_events: ReviewEvents;
  collocation_attempts: CollocationAttempts;

  // kept from main
  account_audit_log: AccountAuditLog;
  account_deletion_queue: AccountDeletionQueue;
  account_exports: AccountExport;
}

export type TableName = keyof DBSchema;
export type RowOf<T extends TableName> = DBSchema[T];

export type Database = DBSchema;
