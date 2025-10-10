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
  role?: 'student' | 'teacher' | 'admin';
  membership?: 'free' | 'starter' | 'booster' | 'master';
  locale?: string;
  notification_channels?: string[] | null;
  whatsapp_opt_in?: boolean | null;
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

export interface WritingPrompts extends TableBase {
  title: string;
  prompt: string;
  task_type?: 'task1' | 'task2' | 'general' | 'other' | null;
  created_by?: string | null;
}

export interface NotificationsOptIn {
  user_id: string;
  sms_opt_in: boolean;
  wa_opt_in: boolean;
  email_opt_in: boolean;
  updated_at?: string;
}

export interface NotificationConsentEvent extends TableBase {
  user_id: string;
  actor_id?: string | null;
  channel: 'email' | 'sms' | 'whatsapp';
  action: 'opt_in' | 'opt_out' | 'verify' | 'test_message' | 'task';
  metadata?: Record<string, any> | null;
}

/** Handy union for typed upserts/selects */
export interface DBSchema {
  profiles: Profiles;
  study_plans: StudyPlans;
  usage_counters: UsageCounters;
  attempts: Attempts;
  invoices: Invoices;
  writing_prompts: WritingPrompts;
  notifications_opt_in: NotificationsOptIn;
  notification_consent_events: NotificationConsentEvent;
}

export type TableName = keyof DBSchema;
export type RowOf<T extends TableName> = DBSchema[T];

export type Database = DBSchema;
