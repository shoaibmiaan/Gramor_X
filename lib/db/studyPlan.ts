import { supabase } from '@/lib/supabaseClient';
import type { StudyPlan } from '@/types/study-plan';

export async function saveStudyPlan(userId: string, plan: StudyPlan): Promise<void> {
  const { error } = await supabase
    .from('user_study_plans')
    .insert({
      user_id: userId,
      plan,
      generated_at: new Date().toISOString(),
      active: true,
    });

  if (error) throw error;

  // Deactivate previous plans
  await supabase
    .from('user_study_plans')
    .update({ active: false })
    .eq('user_id', userId)
    .neq('active', true); // or better: set all to false and then set the new one active
}

export async function getActiveStudyPlan(userId: string): Promise<StudyPlan | null> {
  const { data, error } = await supabase
    .from('user_study_plans')
    .select('plan')
    .eq('user_id', userId)
    .eq('active', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data.plan as StudyPlan;
}