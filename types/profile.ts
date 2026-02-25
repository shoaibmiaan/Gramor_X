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

  role?: 'student' | 'teacher' | 'admin' | string | null;
  status?: string | null;
  country?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  phone?: string | null;

  // learning-related – keep existing
  english_level?: string | null;
  goal_band?: number | null;               // maps to targetBand
  study_prefs?: string[] | null;
  focus_topics?: string[] | null;
  goal_reason?: string[] | null;
  time_commitment?: string | null;
  time_commitment_min?: number | null;
  days_per_week?: number | null;
  daily_quota_goal?: number | null;
  study_days?: string[] | null;
  study_minutes_per_day?: number | null;
  learning_style?: string | null;           // new: 'video'|'tips'|'practice'|'flashcards'
  exam_date?: string | null;                 // new: ISO date

  // New fields for AI onboarding
  target_band?: number | null;               // alias for goal_band, but we'll use one
  baseline_scores?: {                         // new
    reading: number | null;
    writing: number | null;
    listening: number | null;
    speaking: number | null;
  } | null;

  // AI / innovation
  ai_recommendation?: AIPlan | null;
  mistakes_stats?: { total?: number; unresolved?: number } | null;
  whatsapp_opt_in?: boolean | null;
  notification_channels?: string[] | null;
  marketing_opt_in?: boolean | null;

  // onboarding
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

  status_message?: string | null;
  [key: string]: any;
}