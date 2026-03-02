import type { SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient<any, any, any>;

export async function fetchUserRole(client: AnyClient, userId: string) {
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data?.role as string | null) ?? null;
}

export async function fetchUserRoleWithName(client: AnyClient, userId: string) {
  const { data, error } = await client.from('profiles').select('role, full_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertUserCourseProgress(client: AnyClient, payload: any) { const { error } = await client.from('user_course_progress').upsert(payload); if (error) throw error; }
export async function createReadingAttempt(client: AnyClient, payload: any) { const { error } = await client.from('reading_attempts').insert(payload); if (error) throw error; }
export async function createTaskComment(client: AnyClient, payload: any) { const { error } = await client.from('task_comments').insert(payload); if (error) throw error; }

export async function fetchStrategiesTips(client: AnyClient) { const { data, error } = await client.from('strategies_tips').select('*').order('created_at', { ascending: false }); if (error) throw error; return data ?? []; }
export async function fetchStrategyEngagement(client: AnyClient) { const [{ data: saves }, { data: votes }] = await Promise.all([client.from('strategies_tip_saves').select('tip_id'), client.from('strategies_tip_votes').select('tip_id')]); return { saves: saves ?? [], votes: votes ?? [] }; }
export async function fetchTipEngagementState(client: AnyClient, tipId: string) { const [{ data: s }, { data: v }] = await Promise.all([client.from('strategies_tip_saves').select('tip_id').eq('tip_id', tipId).maybeSingle(), client.from('strategies_tip_votes').select('tip_id').eq('tip_id', tipId).maybeSingle()]); return { saved: !!s, helpful: !!v }; }
export async function setStrategySaved(client: AnyClient, userId: string, tipId: string, next: boolean) { const q = next ? client.from('strategies_tip_saves').insert({ user_id: userId, tip_id: tipId }) : client.from('strategies_tip_saves').delete().eq('user_id', userId).eq('tip_id', tipId); const { error } = await q; if (error) throw error; }
export async function setStrategyHelpful(client: AnyClient, userId: string, tipId: string, next: boolean) { const q = next ? client.from('strategies_tip_votes').insert({ user_id: userId, tip_id: tipId, helpful: true }) : client.from('strategies_tip_votes').delete().eq('user_id', userId).eq('tip_id', tipId); const { error } = await q; if (error) throw error; }

export async function createCommunityThread(client: AnyClient, payload: any) { const { error } = await client.from('community_threads').insert(payload); if (error) throw error; }
export async function updateCommunityThreadFlag(client: AnyClient, id: string, flagged: boolean) { const { error } = await client.from('community_threads').update({ flagged }).eq('id', id); if (error) throw error; }
export async function createCommunityQuestion(client: AnyClient, payload: any) { const { error } = await client.from('community_questions').insert(payload); if (error) throw error; }
export async function updateCommunityQuestionVotes(client: AnyClient, id: string, votes: number) { const { error } = await client.from('community_questions').update({ votes }).eq('id', id); if (error) throw error; }
export async function createPeerReview(client: AnyClient, payload: any) { const { error } = await client.from('peer_reviews').insert(payload); if (error) throw error; }
export async function createPeerReviewComment(client: AnyClient, payload: any) { const { error } = await client.from('peer_review_comments').insert(payload); if (error) throw error; }

export async function fetchListeningAttempt(client: AnyClient, attemptId: string) { const { data, error } = await client.from('attempts_listening').select('*').eq('id', attemptId).single(); if (error) throw error; return data; }

export async function fetchInstitutionOrg(client: AnyClient, orgId: string, withCode = false) { const sel = withCode ? 'id, name, code' : 'id, name'; const { data, error } = await client.from('institutions').select(sel).eq('id', orgId).maybeSingle(); if (error) throw error; return data; }
export async function fetchInstitutionKpi(client: AnyClient, orgId: string) { const { data, error } = await client.from('institution_reports_kpi').select('students, active_week, avg_band, mocks_week').eq('org_id', orgId).maybeSingle(); if (error) throw error; return data; }
export async function fetchInstitutionModules(client: AnyClient, orgId: string) { const { data, error } = await client.from('institution_reports_modules').select('module, bucket_start_utc, attempts, avg_score').eq('org_id', orgId).order('bucket_start_utc', { ascending: true }); if (error) throw error; return data ?? []; }

export async function createReadingNote(client: AnyClient, payload: any) { const { error } = await client.from('reading_notes').insert(payload); if (error) throw error; }
export async function createSpeakingAttempt(client: AnyClient, payload: any) { const { data, error } = await client.from('attempts_speaking').insert(payload).select('id').single(); if (error) throw error; return data; }
export async function updateSpeakingAttemptRecording(client: AnyClient, attemptId: string, recordingPath: string) { const { error } = await client.from('attempts_speaking').update({ recording_path: recordingPath }).eq('id', attemptId); if (error) throw error; }
