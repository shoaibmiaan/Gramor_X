import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserId = string;

export type UserRole = 'admin' | 'teacher' | 'student' | 'guest';

export type User = SupabaseUser;

export type AuthenticatedUser = Readonly<{
  user: User;
  role?: UserRole | null;
}>;
