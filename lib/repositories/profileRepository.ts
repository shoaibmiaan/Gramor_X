import type { SupabaseClient } from '@supabase/supabase-js';

export type RepoClient = SupabaseClient<any, 'public', any>;

export async function getProfileByUserId(client: RepoClient, userId: string) {
  const [profileRes, prefsRes, sessionRes, aiRes, notifRes, teacherRes, subRes] = await Promise.all([
    client
      .from('profiles')
      .select('id, email, first_name, last_name, avatar_url, role, locale, timezone, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('user_preferences')
      .select('preferred_language, language_preference, country, study_prefs, goal_reason, learning_style, time_commitment, time_commitment_min, days_per_week, study_days, study_minutes_per_day, daily_quota_goal, exam_date, goal_band, weaknesses, focus_topics')
      .eq('user_id', userId)
      .maybeSingle(),
    getOnboardingSession(client, userId),
    client
      .from('ai_recommendations')
      .select('content')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ content: Record<string, unknown> | null }>(),
    client
      .from('notification_settings')
      .select('notification_channels, whatsapp_opt_in, marketing_opt_in, quiet_hours_start, quiet_hours_end, phone')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('teacher_profiles')
      .select('onboarding_completed, approved, subjects, bio, experience_years, cv_url')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('subscriptions')
      .select('plan_id, status, seats, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error };

  const profile = profileRes.data;
  if (!profile) return { data: null, error: null };

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const subscriptionMetadata = (subRes.data?.metadata ?? {}) as Record<string, unknown>;

  return {
    data: {
      ...profile,
      user_id: profile.id,
      full_name: fullName || null,
      plan: subRes.data?.plan_id ?? 'free',
      membership: subRes.data?.plan_id ?? 'free',
      tier: subRes.data?.plan_id ?? 'free',
      subscription_status: subRes.data?.status ?? null,
      buddy_seats: subRes.data?.seats ?? null,
      buddy_seats_used: typeof subscriptionMetadata.seats_used === 'number' ? subscriptionMetadata.seats_used : null,
      preferred_language: prefsRes.data?.preferred_language ?? profile.locale,
      language_preference: prefsRes.data?.language_preference ?? profile.locale,
      country: prefsRes.data?.country ?? null,
      study_prefs: prefsRes.data?.study_prefs ?? [],
      goal_reason: prefsRes.data?.goal_reason ?? [],
      learning_style: prefsRes.data?.learning_style ?? null,
      time_commitment: prefsRes.data?.time_commitment ?? null,
      time_commitment_min: prefsRes.data?.time_commitment_min ?? null,
      days_per_week: prefsRes.data?.days_per_week ?? null,
      study_days: prefsRes.data?.study_days ?? [],
      study_minutes_per_day: prefsRes.data?.study_minutes_per_day ?? null,
      daily_quota_goal: prefsRes.data?.daily_quota_goal ?? null,
      exam_date: prefsRes.data?.exam_date ?? null,
      goal_band: prefsRes.data?.goal_band ?? null,
      weaknesses: prefsRes.data?.weaknesses ?? [],
      focus_topics: prefsRes.data?.focus_topics ?? [],
      onboarding_step: sessionRes.data?.current_step ?? 0,
      onboarding_complete: sessionRes.data?.status === 'completed',
      setup_complete: sessionRes.data?.status === 'completed',
      ai_recommendation: aiRes.data?.content ?? {},
      notification_channels: notifRes.data?.notification_channels ?? [],
      whatsapp_opt_in: notifRes.data?.whatsapp_opt_in ?? false,
      marketing_opt_in: notifRes.data?.marketing_opt_in ?? false,
      quiet_hours_start: notifRes.data?.quiet_hours_start ?? null,
      quiet_hours_end: notifRes.data?.quiet_hours_end ?? null,
      phone: notifRes.data?.phone ?? null,
      teacher_onboarding_completed: teacherRes.data?.onboarding_completed ?? false,
      teacher_approved: teacherRes.data?.approved ?? false,
      teacher_subjects: teacherRes.data?.subjects ?? [],
      teacher_bio: teacherRes.data?.bio ?? null,
      teacher_experience_years: teacherRes.data?.experience_years ?? null,
      teacher_cv_url: teacherRes.data?.cv_url ?? null,
    },
    error: null,
  };
}

export async function getProfileRole(client: RepoClient, userId: string) {
  return client
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle<{ id: string; role: string | null }>();
}

export async function updateProfileByUserId(client: RepoClient, userId: string, patch: Record<string, unknown>) {
  return client.from('profiles').update(patch).eq('id', userId);
}

export async function getOnboardingSession(client: RepoClient, userId: string) {
  return client
    .from('onboarding_sessions')
    .select('id, user_id, status, current_step, completed_steps, payload, completed_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: 'in_progress' | 'completed' | 'abandoned';
      current_step: number;
      completed_steps: string[];
      payload: Record<string, unknown>;
      completed_at: string | null;
    }>();
}

export async function upsertOnboardingSession(
  client: RepoClient,
  userId: string,
  patch: {
    status?: 'in_progress' | 'completed' | 'abandoned';
    current_step?: number;
    completed_steps?: string[];
    payload?: Record<string, unknown>;
    completed_at?: string | null;
  },
) {
  const { data: existing, error: existingErr } = await getOnboardingSession(client, userId);
  if (existingErr) return { error: existingErr };

  if (existing?.id) {
    return client
      .from('onboarding_sessions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  }

  return client.from('onboarding_sessions').insert({
    user_id: userId,
    status: patch.status ?? 'in_progress',
    current_step: patch.current_step ?? 0,
    completed_steps: patch.completed_steps ?? [],
    payload: patch.payload ?? {},
    completed_at: patch.completed_at ?? null,
  });
}

export async function upsertNotificationSettings(
  client: RepoClient,
  userId: string,
  channels: Array<'email' | 'whatsapp' | 'in-app'>,
) {
  return client.from('notification_settings').upsert(
    {
      user_id: userId,
      notification_channels: channels,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export async function upsertUserPreferences(
  client: RepoClient,
  userId: string,
  patch: Record<string, unknown>,
) {
  return client.from('user_preferences').upsert(
    {
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export async function getLifecycleContactProfile(client: RepoClient, userId: string) {
  const [profileRes, notifRes] = await Promise.all([
    client
      .from('profiles')
      .select('id, email, first_name, last_name, locale')
      .eq('id', userId)
      .maybeSingle<{ id: string; email: string | null; first_name: string | null; last_name: string | null; locale: string | null }>(),
    client
      .from('notification_settings')
      .select('phone, phone_verified, whatsapp_opt_in, notification_channels')
      .eq('user_id', userId)
      .maybeSingle<{ phone: string | null; phone_verified: boolean | null; whatsapp_opt_in: boolean | null; notification_channels: string[] | null }>(),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error };
  if (notifRes.error) return { data: null, error: notifRes.error };

  const p = profileRes.data;
  const n = notifRes.data;

  return {
    data: p
      ? {
          user_id: p.id,
          full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
          email: p.email,
          phone: n?.phone ?? null,
          phone_verified: n?.phone_verified ?? null,
          whatsapp_opt_in: n?.whatsapp_opt_in ?? false,
          notification_channels: n?.notification_channels ?? [],
          locale: p.locale,
          preferred_language: p.locale,
        }
      : null,
    error: null,
  };
}


// Backward-compatible helpers retained during Phase 2 transition.
export type ProfilePlanRoleRow = {
  id?: string | null;
  user_id?: string | null;
  role?: string | null;
  plan?: string | null;
};

export async function getProfilePlanAndRole(client: RepoClient, userId: string) {
  const [profileRes, subRes] = await Promise.all([
    getProfileRole(client, userId),
    client
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ plan_id?: string | null }>(),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error };
  if (subRes.error) return { data: null, error: subRes.error };

  return {
    data: {
      id: profileRes.data?.id ?? userId,
      user_id: userId,
      role: profileRes.data?.role ?? null,
      plan: subRes.data?.plan_id ?? 'free',
    } as ProfilePlanRoleRow,
    error: null,
  };
}

export async function getProfileSetupState(client: RepoClient, userId: string) {
  const { data, error } = await getOnboardingSession(client, userId);
  if (error) return { data: null, error };

  return {
    data: data
      ? {
          id: data.id,
          user_id: userId,
          setup_complete: data.status === 'completed',
        }
      : null,
    error: null,
  };
}

export async function upsertProfileSetup(
  client: RepoClient,
  userId: string,
  basePayload: Record<string, unknown>,
  _insertPayload: Record<string, unknown>,
) {
  const setupComplete = Boolean(basePayload.setup_complete);
  const onboardingStep = typeof basePayload.onboarding_step === 'number' ? basePayload.onboarding_step : 0;

  const preferencesPatch: Record<string, unknown> = {
    preferred_language: basePayload.preferred_language,
    language_preference: basePayload.language_preference,
    country: basePayload.country,
    study_prefs: basePayload.study_prefs,
    goal_reason: basePayload.goal_reason,
    learning_style: basePayload.learning_style,
    time_commitment: basePayload.time_commitment,
    time_commitment_min: basePayload.time_commitment_min,
    days_per_week: basePayload.days_per_week,
    study_days: basePayload.study_days,
    study_minutes_per_day: basePayload.study_minutes_per_day,
    daily_quota_goal: basePayload.daily_quota_goal,
    exam_date: basePayload.exam_date,
    goal_band: basePayload.goal_band,
    weaknesses: basePayload.weaknesses,
    focus_topics: basePayload.focus_topics,
  };

  const [onboardingRes, prefRes, notifRes] = await Promise.all([
    upsertOnboardingSession(client, userId, {
      status: setupComplete ? 'completed' : 'in_progress',
      current_step: onboardingStep,
      payload: basePayload,
      completed_at: setupComplete ? new Date().toISOString() : null,
    }),
    upsertUserPreferences(client, userId, preferencesPatch),
    client.from('notification_settings').upsert(
      {
        user_id: userId,
        notification_channels: Array.isArray(basePayload.notification_channels) ? basePayload.notification_channels : [],
        whatsapp_opt_in: Boolean(basePayload.whatsapp_opt_in),
        marketing_opt_in: Boolean(basePayload.marketing_opt_in),
        quiet_hours_start: (basePayload.quiet_hours_start as string | null) ?? null,
        quiet_hours_end: (basePayload.quiet_hours_end as string | null) ?? null,
      },
      { onConflict: 'user_id' },
    ),
  ]);

  const existingReco = await client
    .from('ai_recommendations')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'profile_setup')
    .limit(1)
    .maybeSingle<{ id: string }>();

  let aiError: { message?: string } | null = existingReco.error;
  if (!aiError) {
    const aiPayload = {
      user_id: userId,
      type: 'profile_setup',
      content: (basePayload.ai_recommendation as Record<string, unknown>) ?? {},
      active: true,
      consumed_at: null,
    };

    if (existingReco.data?.id) {
      const updated = await client.from('ai_recommendations').update(aiPayload).eq('id', existingReco.data.id);
      aiError = updated.error;
    } else {
      const inserted = await client.from('ai_recommendations').insert(aiPayload);
      aiError = inserted.error;
    }
  }

  const error = onboardingRes.error ?? prefRes.error ?? notifRes.error ?? aiError ?? null;
  return { existing: null, error };
}
