import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useLocale } from '@/lib/locale';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { AvatarUploader } from '@/components/design-system/AvatarUploader';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Image from 'next/image';
import { Alert } from '@/components/design-system/Alert';
import { Select } from '@/components/design-system/Select';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { emitUserEvent } from '@/lib/analytics/user';
import {
  COUNTRIES,
  LEVELS,
  TIME,
  PREFS,
  WEAKNESSES,
  GOAL_REASONS,
  LEARNING_STYLES,
  TOPICS,
  DAILY_QUOTA_RANGE,
} from '@/lib/profile-options';
import { resolveAvatarUrl } from '@/lib/avatar';
import type { AIPlan } from '@/types/profile';

/** ——— UI helpers ——— */
const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  subtitle,
  children,
  defaultOpen = true,
}) => (
  <details open={defaultOpen} className="group rounded-ds-2xl border border-border/50 bg-card/60 backdrop-blur-[2px] shadow-sm">
    <summary className="cursor-pointer select-none list-none px-5 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="font-slab text-h4 m-0">{title}</h2>
        {subtitle && <p className="text-muted -mt-0.5 text-small">{subtitle}</p>}
      </div>
      <span className="ml-auto shrink-0 rounded-full border px-2 py-0.5 text-caption text-muted group-open:rotate-180 transition-transform">⌄</span>
    </summary>
    <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">{children}</div>
  </details>
);

const DEFAULT_DAILY_QUOTA = 4;

const clampDailyQuota = (value: number | null | undefined): number => {
  if (!Number.isFinite(value ?? NaN)) return DEFAULT_DAILY_QUOTA;
  const coerced = Math.round(Number(value));
  return Math.min(DAILY_QUOTA_RANGE.max, Math.max(DAILY_QUOTA_RANGE.min, coerced));
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-primary/80 to-electricBlue/80 transition-[width] duration-300"
      /* eslint-disable-next-line ds-guard/no-inline-style */
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const SkeletonLine: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className ?? 'h-4 w-full'}`} />
);

export function ProfileSetupLayout() {
  const router = useRouter();
  const { t, setLocale, setExplanationLocale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [level, setLevel] = useState<typeof LEVELS[number] | ''>('');
  const [goal, setGoal] = useState(7.0);
  const [examDate, setExamDate] = useState('');
  const [prefs, setPrefs] = useState<typeof PREFS[number][]>([]);
  const [focusTopics, setFocusTopics] = useState<typeof TOPICS[number][]>([]);
  const [dailyQuota, setDailyQuota] = useState<number>(DEFAULT_DAILY_QUOTA);
  const [time, setTime] = useState<typeof TIME[number] | ''>('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | ''>('');
  const [lang, setLang] = useState('en');
  const [explanationLang, setExplanationLang] = useState('en');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [avatarPath, setAvatarPath] = useState<string | undefined>();
  const [ai, setAi] = useState<(AIPlan & { source?: string }) | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneStage, setPhoneStage] = useState<'request' | 'verify' | 'verified'>('request');
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [weaknesses, setWeaknesses] = useState<typeof WEAKNESSES[number][]>([]);
  const [goalReasons, setGoalReasons] = useState<typeof GOAL_REASONS[number][]>([]);
  const [learningStyle, setLearningStyle] = useState<typeof LEARNING_STYLES[number] | ''>('');
  const [timezone, setTimezone] = useState('');

  const profileProgressRef = useRef<number>(0);

  const computeProgressFromValues = (values: {
    fullName?: string;
    country?: string;
    level?: string | number | '';
    time?: string;
    daysPerWeek?: number | '';
    phoneVerified?: boolean;
  }) => {
    const requiredCount = 6;
    const filled = [
      Boolean(values.fullName),
      Boolean(values.country),
      Boolean(values.level),
      Boolean(values.time),
      Boolean(values.daysPerWeek),
      Boolean(values.phoneVerified),
    ].filter(Boolean).length;
    return Math.round((filled / requiredCount) * 100);
  };

  const computeProgress = () =>
    computeProgressFromValues({
      fullName,
      country,
      level,
      time,
      daysPerWeek,
      phoneVerified: phoneStage === 'verified',
    });

  const timezones = useMemo(() => {
    try {
      return (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [];
    } catch {
      return [] as string[];
    }
  }, []);

  useEffect(() => {
    if (!timezone) {
      try {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      } catch {}
    }
  }, [timezone]);

  type FieldErrors = {
    fullName?: string;
    country?: string;
    level?: string;
    goal?: string;
    examDate?: string;
    phone?: string;
    time?: string;
    daysPerWeek?: string;
  };
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });

  // Phone validation regex matching schema's profiles_phone_format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  // Fetch active session & profile
  useEffect(() => {
    (async () => {
      setLoading(true);
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        if (url.includes('code=') || url.includes('access_token=')) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (!error) router.replace('/profile/setup');
        }
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
      setUserId(session.user.id);
      console.log('Authenticated user ID:', session.user.id);
      console.log('JWT role:', session.user.app_metadata?.role); // Debug JWT role

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') setError(error.message);
      if (data) {
        setFullName(data.full_name ?? '');
        setCountry(data.country ?? '');
        setLevel(data.english_level ?? '');
        setGoal(Number(data.goal_band ?? 7.0));
        setExamDate(data.exam_date ?? '');
        setPrefs(data.study_prefs ?? []);
        setFocusTopics(
          Array.isArray(data.focus_topics)
            ? (data.focus_topics.filter((topic: any) => typeof topic === 'string') as typeof TOPICS[number][])
            : [],
        );
        setDailyQuota(clampDailyQuota(data.daily_quota_goal ?? null));
        setTime(data.time_commitment ?? '');
        setDaysPerWeek(data.days_per_week ?? '');
        setPhone(data.phone ?? '');
        setPhoneStage(data.phone ? 'verified' : 'request');
        setWeaknesses(data.weaknesses ?? []);
        setGoalReasons(data.goal_reason ?? []);
        setLearningStyle(data.learning_style ?? '');
        setTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
        setLang(data.preferred_language ?? 'en');
        setLocale(data.preferred_language ?? 'en');
        setExplanationLang(data.language_preference ?? 'en');
        setExplanationLocale(data.language_preference ?? 'en');
        if (data.avatar_url) {
          const resolved = await resolveAvatarUrl(data.avatar_url);
          setAvatarUrl(resolved.signedUrl ?? undefined);
          setAvatarPath(resolved.path ?? undefined);
        } else {
          setAvatarUrl(undefined);
          setAvatarPath(undefined);
        }
        try {
          const rec = (data.ai_recommendation as AIPlan | null) ?? null;
          if (rec && (rec.suggestedGoal || rec.sequence?.length)) setAi(rec);
        } catch {}

        profileProgressRef.current = computeProgressFromValues({
          fullName: data.full_name ?? '',
          country: data.country ?? '',
          level: data.english_level ?? '',
          time: data.time_commitment ?? '',
          daysPerWeek: data.days_per_week ?? '',
          phoneVerified: Boolean(data.phone),
        });
      }

      setLoading(false);
    })();
  }, [router, setLocale, setExplanationLocale]);

  // Lightweight on-device AI heuristic
  const localAISuggest = useMemo(() => {
    if (!level) return null;
    const base: Record<string, number> = {
      Beginner: 5.5,
      Elementary: 6.0,
      'Pre-Intermediate': 6.5,
      Intermediate: 7.0,
      'Upper-Intermediate': 7.5,
      Advanced: 8.0,
    };
    const suggestedGoal = base[level] ?? 7.0;
    const sequence = prefs.length ? prefs : [...PREFS];
    const etaWeeks = Math.max(
      4,
      Math.round((suggestedGoal - 5) * (time === '2h/day' ? 4 : time === '1h/day' ? 6 : 5))
    );
    const focusOrder = sequence.join(' → ');
    const cadence = time || '1–2h/day';
    return {
      suggestedGoal,
      etaWeeks,
      sequence,
      notes: [
        `Focus order: ${focusOrder}`,
        `Consistency over intensity — aim for ${cadence}.`,
        'Benchmark every 2 weeks and adjust your goal if you are ahead.',
      ],
      source: 'local',
    } satisfies AIPlan & { source: string };
  }, [level, prefs, time]);

  const aiPayload = useMemo(() => {
    if (!level) return null;
    const normalizedPrefs = prefs.length ? prefs : undefined;
    const normalizedGoal = Number.isFinite(goal) ? goal : undefined;
    return {
      english_level: level,
      study_prefs: normalizedPrefs,
      time_commitment: time || undefined,
      current_band: normalizedGoal,
    };
  }, [level, prefs, time, goal]);

  useEffect(() => {
    if (!aiPayload) {
      setAi(null);
      setAiError(null);
      setAiLoading(false);
      return;
    }

    const fallback = localAISuggest;
    if (fallback) {
      setAi(fallback);
    }
    setAiError(null);

    const controller = new AbortController();
    let active = true;

    const fetchPlan = async () => {
      setAiLoading(true);
      try {
        const res = await fetch('/api/ai/profile-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiPayload),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error('Failed to generate AI plan');
        }
        const data = await res.json();
        if (!active) return;
        setAi({
          suggestedGoal: typeof data.suggestedGoal === 'number' ? data.suggestedGoal : fallback?.suggestedGoal,
          etaWeeks: typeof data.etaWeeks === 'number' ? data.etaWeeks : fallback?.etaWeeks,
          sequence:
            Array.isArray(data.sequence) && data.sequence.length
              ? data.sequence
              : fallback?.sequence ?? [],
          notes:
            Array.isArray(data.notes) && data.notes.length ? data.notes : fallback?.notes ?? [],
          source: data.source ?? 'ai',
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (!active) return;
        setAiError(e?.message || 'Unable to fetch AI plan');
        if (fallback) {
          setAi(fallback);
        }
      } finally {
        if (active) setAiLoading(false);
      }
    };

    fetchPlan();

    return () => {
      active = false;
      controller.abort();
    };
  }, [aiPayload, localAISuggest]);

  const togglePref = (p: typeof PREFS[number]) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const toggleTopic = (topic: typeof TOPICS[number]) => {
    setFocusTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  };

  const toggleWeakness = (w: typeof WEAKNESSES[number]) => {
    setWeaknesses((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  };

  const toggleGoalReason = (r: typeof GOAL_REASONS[number]) => {
    setGoalReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const requestOtp = async () => {
    setPhoneErr(null);
    clearFieldError('phone');
    if (!phone) {
      setPhoneErr('Please enter a phone number');
      return;
    }
    if (!phoneRegex.test(phone)) {
      setPhoneErr('Phone number must be a valid international number (e.g., +923001234567)');
      return;
    }
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Failed to send OTP');
      setPhoneStage('verify');
    } catch (e: any) {
      setPhoneErr(e.message);
    }
  };

  const verifyOtp = async () => {
    setPhoneErr(null);
    if (!phoneCode) {
      setPhoneErr('Please enter the verification code');
      return;
    }
    try {
      const res = await fetch('/api/check-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: phoneCode }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Invalid verification code');
      setPhoneStage('verified');
    } catch (e: any) {
      setPhoneErr(e.message);
    }
  };

  const canSubmit = fullName && country && level && time && daysPerWeek && phoneStage === 'verified' && Object.keys(fieldErrors).length === 0;

  const saveProfile = async (finalize = false) => {
    if (!userId) {
      setError('User not authenticated. Please log in again.');
      setSaving(false);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);

    const prevProgress = profileProgressRef.current ?? 0;
    const nextProgress = computeProgress();

    const errs: FieldErrors = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!country) errs.country = 'Country is required';
    if (!level) errs.level = 'English level is required';
    if (!time) errs.time = 'Time commitment is required';
    if (!daysPerWeek) errs.daysPerWeek = 'Days per week is required';
    if (goal < 4 || goal > 9 || Math.round(goal * 2) !== goal * 2) {
      errs.goal = 'Goal must be between 4.0 and 9.0 in 0.5 increments';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (examDate) {
      if (!dateRegex.test(examDate)) errs.examDate = 'Invalid date format (YYYY-MM-DD)';
      else {
        const d = new Date(examDate);
        if (isNaN(d.getTime()) || d < today) errs.examDate = 'Exam date cannot be in the past';
      }
    }
    if (phone && !phoneRegex.test(phone)) {
      errs.phone = 'Phone number must be a valid international number';
    }
    if (daysPerWeek && (daysPerWeek < 1 || daysPerWeek > 7)) {
      errs.daysPerWeek = 'Days per week must be between 1 and 7';
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setSaving(false);
      return;
    }
    setFieldErrors({});

    const timeCommitmentMap: Record<string, number> = {
      '1h/day': 60,
      '2h/day': 120,
      Flexible: 90,
    };
    const timeCommitmentMin = time ? timeCommitmentMap[time] || 60 : null;

    const payload = {
      id: userId, // Changed from user_id to id to match RLS policies
      full_name: fullName.trim(),
      country: country || null,
      english_level: level || null,
      goal_band: goal || null,
      exam_date: examDate || null,
      study_prefs: prefs,
      focus_topics: focusTopics,
      phone: phone || null,
      weaknesses,
      timezone: timezone || null,
      time_commitment: time || null,
      time_commitment_min: timeCommitmentMin,
      days_per_week: daysPerWeek || null,
      daily_quota_goal: dailyQuota || null,
      preferred_language: lang || 'en',
      language_preference: explanationLang || 'en',
      avatar_url: avatarPath || null,
      goal_reason: goalReasons,
      learning_style: learningStyle || null,
      ai_recommendation: ai
        ? {
            suggestedGoal: ai.suggestedGoal,
            etaWeeks: ai.etaWeeks,
            sequence: ai.sequence,
            notes: ai.notes,
            source: ai.source,
          }
        : {},
      setup_complete: finalize,
      role: 'student', // Explicitly set role to satisfy 'Students manage own profile' policy
      status: finalize ? 'active' : 'inactive', // Set status based on finalize
    };

    try {
      console.log('Saving profile with payload:', payload);
      console.log('Authenticated user ID:', userId);
      const { data: { session } } = await supabase.auth.getSession();
      console.log('JWT role:', session?.user?.app_metadata?.role);

      const { data: existing } = await supabase.from('profiles').select('id, setup_complete').eq('id', userId).maybeSingle();
      if (existing?.setup_complete && !finalize) {
        setError('Profile is already complete and cannot be updated as a draft.');
        setSaving(false);
        return;
      }

      const { error: upsertErr } = existing
        ? await supabase.from('profiles').update(payload).eq('id', userId)
        : await supabase.from('profiles').insert(payload);

      if (upsertErr) {
        if (upsertErr.code === '42501') {
          throw new Error('Row-level security policy violation. Ensure your user ID and role are correct.');
        }
        if (upsertErr.code === '23505') {
          if (upsertErr.message.includes('unique_phone')) {
            throw new Error('This phone number is already registered');
          }
          throw new Error('This profile already exists');
        }
        throw new Error(upsertErr.message);
      }

      profileProgressRef.current = nextProgress;
      void emitUserEvent('profile_save', { step: nextProgress, delta: nextProgress - prevProgress });

      setNotice(finalize ? 'Profile saved — welcome aboard!' : 'Draft saved.');
      if (finalize) router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to save profile');
      console.error('Save profile error:', e);
    } finally {
      setSaving(false);
    }
  };

  // Progress calculation
  const progress = computeProgress();

  return (
    <section className="pb-24 sm:pb-14 pt-10 sm:pt-16 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto mb-6 sm:mb-8 max-w-5xl">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <h1 className="font-slab text-display leading-tight text-gradient-primary">{t('profileSetup.completeProfile')}</h1>
              <p className="text-muted mt-1 sm:mt-2 max-w-prose">{t('profileSetup.description')}</p>
            </div>
            <div className="w-full sm:w-64">
              <ProgressBar value={progress} />
              <p className="mt-1 text-right text-caption text-muted">{progress}%</p>
            </div>
          </div>
          <div aria-live="assertive" className="sr-only">{error ? `Error: ${error}` : ''}</div>
          <div aria-live="polite" className="sr-only">{notice ? `Notice: ${notice}` : ''}</div>
          {error && <Alert variant="warning" title="Unable to save" className="mt-3">{error}</Alert>}
          {notice && <Alert variant="success" title={notice} className="mt-3" />}
        </div>

        <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-4">
            {loading ? (
              <Card className="card-surface p-6 rounded-ds-2xl space-y-4">
                <SkeletonLine className="h-6 w-2/3" />
                <SkeletonLine className="h-5 w-1/3" />
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <SkeletonLine className="h-3 w-24" />
                      <SkeletonLine className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <>
                <Section title="Basics" subtitle="Tell us who you are">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        clearFieldError('fullName');
                      }}
                      required
                      aria-invalid={fieldErrors.fullName ? 'true' : undefined}
                      aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                    />
                    <Select
                      label="Country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        clearFieldError('country');
                      }}
                      required
                      aria-invalid={fieldErrors.country ? 'true' : undefined}
                      aria-describedby={fieldErrors.country ? 'country-error' : undefined}
                    >
                      <option value="" disabled>
                        Select country
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {fieldErrors.fullName && (
                    <Alert id="fullName-error" variant="warning" className="mt-2">
                      {fieldErrors.fullName}
                    </Alert>
                  )}
                  {fieldErrors.country && (
                    <Alert id="country-error" variant="warning" className="mt-2">
                      {fieldErrors.country}
                    </Alert>
                  )}
                </Section>

                <Section title="Learning" subtitle="Level & commitment">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Select
                      label="English level"
                      value={level}
                      onChange={(e) => {
                        setLevel(e.target.value as any);
                        clearFieldError('level');
                      }}
                      hint="Self-assessed for now"
                      required
                      aria-invalid={fieldErrors.level ? 'true' : undefined}
                      aria-describedby={fieldErrors.level ? 'level-error' : undefined}
                    >
                      <option value="" disabled>
                        Select level
                      </option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Time commitment"
                      value={time}
                      onChange={(e) => {
                        setTime(e.target.value);
                        clearFieldError('time');
                      }}
                      required
                      aria-invalid={fieldErrors.time ? 'true' : undefined}
                      aria-describedby={fieldErrors.time ? 'time-error' : undefined}
                    >
                      <option value="" disabled>
                        Select time
                      </option>
                      {TIME.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Days per week"
                      value={daysPerWeek}
                      onChange={(e) => {
                        setDaysPerWeek(e.target.value ? Number(e.target.value) : '');
                        clearFieldError('daysPerWeek');
                      }}
                      required
                      aria-invalid={fieldErrors.daysPerWeek ? 'true' : undefined}
                      aria-describedby={fieldErrors.daysPerWeek ? 'daysPerWeek-error' : undefined}
                    >
                      <option value="" disabled>
                        Select days
                      </option>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <option key={d} value={d}>
                          {d} {d === 1 ? 'day' : 'days'}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {fieldErrors.level && (
                    <Alert id="level-error" variant="warning" className="mt-2">
                      {fieldErrors.level}
                    </Alert>
                  )}
                  {fieldErrors.time && (
                    <Alert id="time-error" variant="warning" className="mt-2">
                      {fieldErrors.time}
                    </Alert>
                  )}
                  {fieldErrors.daysPerWeek && (
                    <Alert id="daysPerWeek-error" variant="warning" className="mt-2">
                      {fieldErrors.daysPerWeek}
                    </Alert>
                  )}
                </Section>

                <Section title="Contact & Languages" subtitle="Phone verification and app language">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input
                        label="Phone number"
                        type="tel"
                        placeholder="+923001234567"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          clearFieldError('phone');
                        }}
                        required
                        aria-invalid={fieldErrors.phone || phoneErr ? 'true' : undefined}
                        aria-describedby={fieldErrors.phone || phoneErr ? 'phone-error' : undefined}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {phoneStage === 'request' && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="rounded-ds-xl"
                            onClick={requestOtp}
                            disabled={saving}
                            aria-busy={saving}
                          >
                            {saving ? 'Sending...' : 'Send code'}
                          </Button>
                        )}
                        {phoneStage === 'verify' && (
                          <>
                            <Input
                              aria-label="Verification code"
                              placeholder="123456"
                              value={phoneCode}
                              onChange={(e) => setPhoneCode(e.target.value)}
                              className="w-40"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="rounded-ds-xl"
                              onClick={verifyOtp}
                              disabled={saving}
                              aria-busy={saving}
                            >
                              {saving ? 'Verifying...' : 'Verify'}
                            </Button>
                          </>
                        )}
                        {phoneStage === 'verified' && <Badge variant="success" className="mt-1">Verified</Badge>}
                      </div>
                      {(phoneErr || fieldErrors.phone) && (
                        <Alert id="phone-error" variant="warning" className="mt-2">
                          {phoneErr || fieldErrors.phone}
                        </Alert>
                      )}
                    </div>

                    <Select
                      label={t('profileSetup.preferredLanguage')}
                      value={lang}
                      onChange={(e) => {
                        setLang(e.target.value);
                        setLocale(e.target.value);
                      }}
                    >
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                      <option value="ar">Arabic</option>
                      <option value="hi">Hindi</option>
                    </Select>
                    <Select
                      label={t('profileSetup.explanationLanguage')}
                      value={explanationLang}
                      onChange={(e) => {
                        setExplanationLang(e.target.value);
                        setExplanationLocale(e.target.value);
                      }}
                    >
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                      <option value="ar">Arabic</option>
                      <option value="hi">Hindi</option>
                    </Select>

                    <div className="sm:col-span-2">
                      <AvatarUploader
                        userId={userId}
                        initialUrl={avatarUrl}
                        onUploaded={async (url, _path) => {
                          setAvatarUrl(url);
                          await supabase.auth.updateUser({ data: { avatar_url: url } });
                        }}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Targets" subtitle="Your goal & key dates">
                  <div className="space-y-6">
                    <div>
                      <label className="block">
                        <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                          Goal band <span className="opacity-70">(4.0–9.0)</span>
                        </span>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={4}
                            max={9}
                            step={0.5}
                            value={goal}
                            onChange={(e) => {
                              setGoal(parseFloat(e.target.value));
                              clearFieldError('goal');
                            }}
                            className="w-full accent-primary"
                            aria-describedby={fieldErrors.goal ? 'goal-error' : undefined}
                          />
                          <span className="text-body font-semibold tabular-nums">{goal.toFixed(1)}</span>
                        </div>
                      </label>
                      {fieldErrors.goal && (
                        <Alert id="goal-error" variant="warning" className="mt-2">
                          {fieldErrors.goal}
                        </Alert>
                      )}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        type="date"
                        label="Exam date"
                        value={examDate}
                        onChange={(e) => {
                          setExamDate(e.target.value);
                          clearFieldError('examDate');
                        }}
                        aria-describedby={fieldErrors.examDate ? 'examDate-error' : undefined}
                      />
                      <Select
                        label="Timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                      >
                        <option value="" disabled>
                          Select timezone
                        </option>
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {fieldErrors.examDate && (
                      <Alert id="examDate-error" variant="warning">{fieldErrors.examDate}</Alert>
                    )}
                  </div>
                </Section>

                <Section title="Study preferences" subtitle="Tune your plan" defaultOpen={false}>
                  <div className="grid gap-6">
                    <div>
                      <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Focus areas</span>
                      <div className="flex flex-wrap gap-2">
                        {PREFS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePref(p)}
                            aria-pressed={prefs.includes(p)}
                            className="focus-visible:outline-none"
                          >
                            <Badge
                              variant={prefs.includes(p) ? 'success' : 'neutral'}
                              className={`cursor-pointer transition ${prefs.includes(p) ? 'ring-2 ring-success' : 'hover:opacity-90'}`}
                            >
                              {p}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Priority topics</span>
                      <div className="flex flex-wrap gap-2">
                        {TOPICS.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => toggleTopic(topic)}
                            aria-pressed={focusTopics.includes(topic)}
                            className="focus-visible:outline-none"
                          >
                            <Badge
                              variant={focusTopics.includes(topic) ? 'accent' : 'neutral'}
                              className={`cursor-pointer transition ${focusTopics.includes(topic) ? 'ring-2 ring-accent' : 'hover:opacity-90'}`}
                            >
                              {topic}
                            </Badge>
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-caption text-grayish/80 dark:text-grayish/80">
                        Used to theme daily drills and lexical goals.
                      </p>
                    </div>

                    <div>
                      <label className="block">
                        <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Daily practice quota</span>
                        <input
                          type="range"
                          min={DAILY_QUOTA_RANGE.min}
                          max={DAILY_QUOTA_RANGE.max}
                          step={1}
                          value={dailyQuota}
                          onChange={(event) => setDailyQuota(clampDailyQuota(Number(event.target.value)))}
                          className="w-full"
                        />
                      </label>
                      <div className="mt-1 flex flex-wrap items-center justify-between text-caption text-grayish dark:text-grayish">
                        <span>{dailyQuota} activities per day</span>
                        <span>
                          Range {DAILY_QUOTA_RANGE.min}–{DAILY_QUOTA_RANGE.max}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Weak areas</span>
                      <div className="flex flex-wrap gap-2">
                        {WEAKNESSES.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => toggleWeakness(w)}
                            aria-pressed={weaknesses.includes(w)}
                            className="focus-visible:outline-none"
                          >
                            <Badge
                              variant={weaknesses.includes(w) ? 'warning' : 'neutral'}
                              className={`cursor-pointer transition ${weaknesses.includes(w) ? 'ring-2 ring-warning' : 'hover:opacity-90'}`}
                            >
                              {w}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Goal reasons</span>
                      <div className="flex flex-wrap gap-2">
                        {GOAL_REASONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleGoalReason(r)}
                            aria-pressed={goalReasons.includes(r)}
                            className="focus-visible:outline-none"
                          >
                            <Badge
                              variant={goalReasons.includes(r) ? 'info' : 'neutral'}
                              className={`cursor-pointer transition ${goalReasons.includes(r) ? 'ring-2 ring-info' : 'hover:opacity-90'}`}
                            >
                              {r}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Select
                      label="Learning style"
                      value={learningStyle}
                      onChange={(e) => setLearningStyle(e.target.value as any)}
                    >
                      <option value="" disabled>
                        Select learning style
                      </option>
                      {LEARNING_STYLES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Section>

                <Card className="hidden sm:flex card-surface p-4 sm:p-5 rounded-ds-2xl items-center justify-end gap-3">
                  <Button
                    onClick={() => saveProfile(false)}
                    disabled={saving}
                    variant="secondary"
                    className="rounded-ds-xl"
                    aria-busy={saving}
                  >
                    {saving ? 'Saving...' : t('profileSetup.saveDraft')}
                  </Button>
                  <Button
                    onClick={() => saveProfile(true)}
                    disabled={saving || !canSubmit}
                    variant="primary"
                    className="rounded-ds-xl"
                    aria-busy={saving}
                  >
                    {saving ? 'Saving...' : t('profileSetup.finishContinue')}
                  </Button>
                </Card>
              </>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 self-start">
            <Card className="card-surface p-5 rounded-ds-2xl">
              <h3 className="font-slab text-h3 mb-2">AI study plan</h3>
              {ai ? (
                <div className="space-y-3 text-body">
                  <div>
                    Suggested goal:{' '}
                    <span className="font-semibold text-electricBlue">
                      {typeof ai.suggestedGoal === 'number' ? ai.suggestedGoal.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div>
                    Estimated prep time:{' '}
                    <span className="font-semibold">
                      {typeof ai.etaWeeks === 'number' ? `${ai.etaWeeks} weeks` : '—'}
                    </span>
                  </div>
                  <div className="mt-2">
                    Focus sequence:
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(ai.sequence ?? []).length ? (
                        (ai.sequence ?? []).map((s) => (
                          <Badge key={s} variant="info" size="sm">
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-grayish">Waiting for AI priorities…</span>
                      )}
                    </div>
                  </div>
                  {ai.notes?.length ? (
                    <div>
                      <span className="text-small font-semibold text-muted uppercase tracking-wide">Tips</span>
                      <ul className="mt-2 space-y-1 text-small text-muted">
                        {ai.notes.map((note) => (
                          <li key={note} className="flex items-start gap-2">
                            <span aria-hidden="true" className="mt-0.5 text-electricBlue">
                              •
                            </span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!aiError && (
                    <Alert
                      variant={ai.source === 'openai' ? 'info' : 'success'}
                      className="mt-2"
                      aria-live="polite"
                    >
                      {ai.source === 'openai'
                        ? 'Plan generated with OpenAI.'
                        : ai.source === 'ai'
                        ? 'Plan generated with our AI study coach.'
                        : 'Using on-device recommendation while AI personalises your plan.'}
                    </Alert>
                  )}
                </div>
              ) : (
                <p className="text-grayish">Pick your level and preferences to see recommendations.</p>
              )}
              {aiLoading && (
                <p className="mt-3 text-small text-muted" aria-live="polite">
                  Generating your personalised study plan…
                </p>
              )}
              {aiError && (
                <Alert variant="warning" className="mt-3" aria-live="assertive">
                  {aiError}. Showing local guidance for now.
                </Alert>
              )}
            </Card>

            <Card className="card-surface p-5 rounded-ds-2xl">
              <h3 className="font-slab text-h3 mb-2">Profile preview</h3>
              <div className="text-body">
                {avatarUrl && (
                  <Image
                    src={avatarUrl}
                    alt="Avatar preview"
                    width={80}
                    height={80}
                    className="mb-3 h-20 w-20 rounded-full object-cover ring-2 ring-primary/40"
                  />
                )}
                <div className="font-semibold">{fullName || 'Your name'}</div>
                <div className="opacity-80">
                  {country || 'Country'} • {level || 'Level'} • {time || 'Time'} • {daysPerWeek || 'Days'} days/week
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {prefs.length ? (
                    prefs.map((p) => (
                      <Badge key={p} size="sm">
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-grayish">No preferences selected</span>
                  )}
                </div>
                {goalReasons.length > 0 && (
                  <div className="mt-2">
                    Goals:
                    <div className="mt-1 flex flex-wrap gap-2">
                      {goalReasons.map((r) => (
                        <Badge key={r} variant="info" size="sm">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {learningStyle && (
                  <div className="mt-2">
                    Learning style: <Badge variant="neutral">{learningStyle}</Badge>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </Container>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-[rgb(var(--card))]/95 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--card))]/75">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
          <Button
            onClick={() => saveProfile(false)}
            disabled={saving}
            variant="secondary"
            className="flex-1 rounded-ds-xl"
            aria-busy={saving}
          >
            {saving ? 'Saving...' : t('profileSetup.saveDraft')}
          </Button>
          <Button
            onClick={() => saveProfile(true)}
            disabled={saving || !canSubmit}
            variant="primary"
            className="flex-1 rounded-ds-xl"
            aria-busy={saving}
          >
            {saving ? 'Saving...' : t('profileSetup.finishContinue')}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default ProfileSetupLayout;
