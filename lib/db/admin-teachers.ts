import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminTeacherApproveRequest,
} from '@/types/api/admin-teachers';
import type { TeacherProfile } from '@/types/db/teacher';

const PROFILES = 'profiles';

export async function adminListTeachers(
  supabase: SupabaseClient,
  opts: { q?: string; status?: 'pending' | 'all'; page: number; pageSize: number }
): Promise<{ items: TeacherProfile[]; total: number }> {
  let query = supabase.from(PROFILES).select('*', { count: 'exact' });

  if (opts.status === 'pending') {
    query = query.eq('role', 'teacher').eq('teacher_onboarding_completed', true).eq('teacher_approved', false);
  } else {
    query = query.in('role', ['teacher', 'user']); // show candidates + teachers
  }

  if (opts.q) {
    // Simple OR filter (depends on your schema fields existing)
    query = query.or(`email.ilike.%${opts.q}%,full_name.ilike.%${opts.q}%`);
  }

  const from = (opts.page - 1) * opts.pageSize;
  const to = from + opts.pageSize - 1;

  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: (data ?? []) as TeacherProfile[],
    total: count ?? 0,
  };
}

export async function adminApproveTeacher(
  supabase: SupabaseClient,
  body: AdminTeacherApproveRequest
): Promise<TeacherProfile> {
  const { userId } = body;

  const { data, error } = await supabase
    .from(PROFILES)
    .update({
      role: 'teacher',
      teacher_onboarding_completed: true,
      teacher_approved: true,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TeacherProfile;
}
