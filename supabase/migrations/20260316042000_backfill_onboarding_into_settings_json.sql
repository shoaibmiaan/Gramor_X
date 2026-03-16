-- Backfill onboarding data from legacy profile columns into settings->onboarding.
-- Keeps legacy columns in place for compatibility, but application now reads/writes onboarding from JSON.

UPDATE profiles
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{onboarding}',
  COALESCE(settings->'onboarding', '{}'::jsonb) || jsonb_strip_nulls(
    jsonb_build_object(
      'preferredLanguage', COALESCE(preferred_language, locale),
      'goalBand', goal_band,
      'examDate', exam_date,
      'studyDays', study_days,
      'studyMinutesPerDay', study_minutes_per_day,
      'whatsappOptIn', whatsapp_opt_in,
      'phone', phone,
      'notificationChannels', notification_channels
    )
  ),
  true
)
WHERE id IS NOT NULL;
