import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseService } from '@/lib/supabaseServer';

export * from '@/lib/recommendations/index';

type DBClient = SupabaseClient<any>;

export type ExerciseRecommendation = {
  taskId: string;
  type: string;
  module: string;
  difficulty: string | null;
  title: string;
  reason: string;
};

export type PersonalizedStudyDay = {
  day: string;
  focus: string;
  tasks: ExerciseRecommendation[];
};

const CACHE_TTL_MS = 1000 * 60 * 15;
const recommendationCache = new Map<string, { expiresAt: number; payload: unknown }>();

function getClient(client?: DBClient): DBClient {
  return client ?? (supabaseService() as DBClient);
}

function cacheKey(name: string, userId: string, extra?: string) {
  return `${name}:${userId}:${extra ?? ''}`;
}

function getCached<T>(key: string): T | null {
  const hit = recommendationCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    recommendationCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function setCached<T>(key: string, payload: T) {
  recommendationCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

async function getSkillProfile(userId: string, client?: DBClient) {
  const db = getClient(client);
  const { data } = await db
    .from('user_skill_profiles')
    .select('proficiency, weakness_tags, preferred_exercise_types, learning_pace')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function getWeaknessFocusedContent(userId: string, client?: DBClient): Promise<ExerciseRecommendation[]> {
  const key = cacheKey('weakness-content', userId);
  const cached = getCached<ExerciseRecommendation[]>(key);
  if (cached) return cached;

  const db = getClient(client);
  const profile = await getSkillProfile(userId, db);
  const weaknesses = (profile?.weakness_tags as string[] | undefined) ?? [];

  const targetModules = new Set<string>();
  weaknesses.forEach((w) => {
    const lower = w.toLowerCase();
    if (lower.includes('reading')) targetModules.add('reading');
    if (lower.includes('writing')) targetModules.add('writing');
    if (lower.includes('speaking')) targetModules.add('speaking');
    if (lower.includes('listening')) targetModules.add('listening');
  });

  const modules = [...targetModules];
  const query = db
    .from('learning_tasks')
    .select('id, type, module, difficulty, metadata')
    .eq('is_active', true)
    .limit(12);

  const { data } = modules.length ? await query.in('module', modules) : await query;

  const payload = (data ?? []).slice(0, 6).map((task: any) => ({
    taskId: task.id,
    type: task.type,
    module: task.module,
    difficulty: task.difficulty ?? null,
    title: String(task.metadata?.title ?? 'Practice task'),
    reason: weaknesses[0] ? `Targets: ${weaknesses[0]}` : 'Strengthen lower-performing skills',
  }));

  setCached(key, payload);
  return payload;
}

function getTargetDifficulty(profile: any): 'easy' | 'medium' | 'hard' {
  const proficiency = profile?.proficiency ?? {};
  const scores = Object.values(proficiency).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 6;
  if (avg < 5.5) return 'easy';
  if (avg < 7) return 'medium';
  return 'hard';
}

export async function getNextExercises(userId: string, count = 5, client?: DBClient): Promise<ExerciseRecommendation[]> {
  const key = cacheKey('next-exercises', userId, String(count));
  const cached = getCached<ExerciseRecommendation[]>(key);
  if (cached) return cached;

  const db = getClient(client);
  const profile = await getSkillProfile(userId, db);
  const preferredTypes = ((profile?.preferred_exercise_types as string[] | undefined) ?? []).slice(0, 3);
  const weaknessContent = await getWeaknessFocusedContent(userId, db);
  const targetDifficulty = getTargetDifficulty(profile);

  let tasksQuery = db
    .from('learning_tasks')
    .select('id, type, module, difficulty, metadata')
    .eq('is_active', true)
    .limit(Math.max(12, count * 3));

  if (preferredTypes.length) tasksQuery = tasksQuery.in('type', preferredTypes);
  const { data: tasks } = await tasksQuery;

  const normalized = (tasks ?? []).map((task: any) => ({
    taskId: task.id,
    type: task.type,
    module: task.module,
    difficulty: task.difficulty ?? null,
    title: String(task.metadata?.title ?? 'Practice task'),
    reason: task.difficulty === targetDifficulty ? `Adaptive difficulty: ${targetDifficulty}` : 'Recommended next practice',
  }));

  const merged = [...weaknessContent, ...normalized].filter(
    (item, idx, arr) => arr.findIndex((x) => x.taskId === item.taskId) === idx,
  );

  const result = merged.slice(0, count);
  setCached(key, result);
  return result;
}

export async function getPersonalizedStudyPlan(userId: string, days = 7, client?: DBClient): Promise<PersonalizedStudyDay[]> {
  const key = cacheKey('study-plan', userId, String(days));
  const cached = getCached<PersonalizedStudyDay[]>(key);
  if (cached) return cached;

  const profile = await getSkillProfile(userId, client);
  const weaknesses = (profile?.weakness_tags as string[] | undefined) ?? [];
  const exercises = await getNextExercises(userId, Math.max(5, days), client);

  const plan: PersonalizedStudyDay[] = Array.from({ length: days }).map((_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() + idx);
    const iso = date.toISOString().slice(0, 10);
    const focus = weaknesses[idx % Math.max(1, weaknesses.length)] ?? 'balanced practice';
    const dayTasks = exercises.slice(idx % Math.max(1, exercises.length), (idx % Math.max(1, exercises.length)) + 2);
    return { day: iso, focus, tasks: dayTasks.length ? dayTasks : exercises.slice(0, 2) };
  });

  setCached(key, plan);
  return plan;
}
