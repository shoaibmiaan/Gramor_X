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
  english_level?: string | null;
  goal_band?: number | null;
  study_prefs?: string[] | null;
  focus_topics?: string[] | null;
  goal_reason?: string[] | null;
  time_commitment?: string | null;
  time_commitment_min?: number | null;
  days_per_week?: number | null;
  daily_quota_goal?: number | null;
  preferred_language?: string | null;
  language_preference?: string | null;
  study_days?: string[] | null;
  study_minutes_per_day?: number | null;
  phone?: string | null;
  weaknesses?: string[] | null;
  timezone?: string | null;
  avatar_url?: string | null;
  exam_date?: string | null;
  learning_style?: string | null;
  ai_recommendation?: AIPlan | null;
  marketing_opt_in?: boolean | null;
  draft?: boolean;
  notification_channels?: string[] | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  tier?: 'free' | 'seedling' | 'rocket' | 'owl' | null;
  onboarding_step?: number | null;
  onboarding_complete?: boolean | null;
  whatsapp_opt_in?: boolean | null;
  setup_complete?: boolean | null;
}
