export type TeacherProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role: 'user' | 'teacher' | 'admin';
  teacher_onboarding_completed: boolean;
  teacher_approved: boolean;
  teacher_subjects: string[];
  teacher_bio?: string | null;
  teacher_experience_years?: number | null;
  teacher_cv_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UpsertTeacherPayload = {
  teacher_subjects: string[];
  teacher_bio: string;
  teacher_experience_years: number;
  teacher_cv_url?: string | null;
};
