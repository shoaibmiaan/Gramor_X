// types/profile.ts
// Extended Profile type with innovation fields

export interface AIPlan {
  suggestedGoal?: number;
  etaWeeks?: number;
  sequence?: string[];
  notes?: string[];
  source?: string;
  dailyQuota?: number;
  sessionMix?: { skill: string; topic: string }[];
}

export interface Profile {
  id?: string;
  user_id?: string;
  full_name?: string | null;
  email?: string | null;
  created_at?: string | null;

  // core account/profile
  role?: 'student' | 'teacher' | 'admin' | string | null;
  status?: string | null;
  country?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  phone?: string | null;

  // learning-related
  english_level?: string | null;
  goal_band?: number | null;
  study_prefs?: string[] | null;
  focus_topics?: string[] | null;
  goal_reason?: string[] | null;
  time_commitment?: string | null;
  time_commitment_min?: number | null;
  days_per_week?: number | null;
  daily_quota_goal?: number | null;
  study_days?: string[] | null;
  study_minutes_per_day?: number | null;
  learning_style?: string | null;
  exam_date?: string | null;

  // AI / innovation
  ai_recommendation?: AIPlan | null; // structured AI plan
  mistakes_stats?: { total?: number; unresolved?: number } | null; // Mistakes book summary
  whatsapp_opt_in?: boolean | null; // opt-in for WhatsApp micro-tasks
  notification_channels?: string[] | null;
  marketing_opt_in?: boolean | null;

  // onboarding / product
  onboarding_step?: number | null;
  onboarding_complete?: boolean | null;
  setup_complete?: boolean | null;
  draft?: boolean;

  // preferences & limits
  preferred_language?: string | null;
  language_preference?: string | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;

  // subscription / tier
  tier?: 'free' | 'seedling' | 'rocket' | 'owl' | string | null;

  // generic metadata
  status_message?: string | null;
  // add any future innovation fields as optional to avoid breaking changes
  [key: string]: any;
}
