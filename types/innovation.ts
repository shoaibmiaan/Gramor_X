export type UserProfile = {
  user_id?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
};

export type AICoachSuggestion = {
  id: string;
  title: string;
  detail?: string;
  estimatedMinutes?: number;
};

export type AICoachResponse = {
  id: string;
  summary: string;
  suggestions: AICoachSuggestion[];
  reasoning?: string;
};

export type StudySessionItem = { skill: string; minutes: number };
export type StudySession = {
  id: string;
  userId?: string | null;
  items: StudySessionItem[];
  state: 'pending' | 'started' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
};

export type Mistake = {
  id: string;
  user_id?: string;
  type: string;
  source?: string;
  excerpt?: string;
  created_at?: string;
  resolved?: boolean;
  tags?: string[];
};

export type WhatsAppTask = { id: string; user_id?: string; text: string; scheduled_at?: string | null; delivered?: boolean };
