'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import { emitUserEvent } from '@/lib/analytics/user';
import { resolveAvatarUrl } from '@/lib/avatar';
import {
  COUNTRIES,
  DAILY_QUOTA_RANGE,
  GOAL_REASONS,
  LEARNING_STYLES,
  LEVELS,
  PREFS,
  TIME,
  TOPICS,
  WEAKNESSES,
} from '@/lib/profile-options';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { useLocale } from '@/lib/locale';
import type { AIPlan } from '@/types/profile';
import {
  clampDailyQuota,
  computeProgressFromValues,
  DEFAULT_DAILY_QUOTA,
  phoneRegex,
} from './profileSetupUtils';

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

type PhoneStage = 'request' | 'verify' | 'verified';

export interface ProfileSetupContextValue {
  t: ReturnType<typeof useLocale>['t'];
  loading: boolean;
  isAuthenticated: boolean;
  saving: boolean;
  error: string | null;
  notice: string | null;
  userId: string | null;
  fullName: string;
  setFullName: React.Dispatch<React.SetStateAction<string>>;
  country: string;
  setCountry: React.Dispatch<React.SetStateAction<string>>;
  level: typeof LEVELS[number] | '';
  setLevel: React.Dispatch<React.SetStateAction<typeof LEVELS[number] | ''>>;
  goal: number;
  setGoal: React.Dispatch<React.SetStateAction<number>>;
  examDate: string;
  setExamDate: React.Dispatch<React.SetStateAction<string>>;
  prefs: typeof PREFS[number][];
  togglePref: (p: typeof PREFS[number]) => void;
  focusTopics: typeof TOPICS[number][];
  toggleTopic: (topic: typeof TOPICS[number]) => void;
  dailyQuota: number;
  setDailyQuota: React.Dispatch<React.SetStateAction<number>>;
  time: typeof TIME[number] | '';
  setTime: React.Dispatch<React.SetStateAction<typeof TIME[number] | ''>>;
  daysPerWeek: number | '';
  setDaysPerWeek: React.Dispatch<React.SetStateAction<number | ''>>;
  lang: string;
  handlePreferredLanguageChange: (value: string) => void;
  explanationLang: string;
  handleExplanationLanguageChange: (value: string) => void;
  avatarUrl: string | undefined;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | undefined>>;
  avatarPath: string | undefined;
  setAvatarPath: React.Dispatch<React.SetStateAction<string | undefined>>;
  ai: (AIPlan & { source?: string }) | null;
  aiLoading: boolean;
  aiError: string | null;
  phone: string;
  setPhone: React.Dispatch<React.SetStateAction<string>>;
  phoneCode: string;
  setPhoneCode: React.Dispatch<React.SetStateAction<string>>;
  phoneStage: PhoneStage;
  requestOtp: () => Promise<void>;
  verifyOtp: () => Promise<void>;
  phoneErr: string | null;
  weaknesses: typeof WEAKNESSES[number][];
  toggleWeakness: (weakness: typeof WEAKNESSES[number]) => void;
  goalReasons: typeof GOAL_REASONS[number][];
  toggleGoalReason: (reason: typeof GOAL_REASONS[number]) => void;
  learningStyle: typeof LEARNING_STYLES[number] | '';
  setLearningStyle: React.Dispatch<React.SetStateAction<typeof LEARNING_STYLES[number] | ''>>;
  timezone: string;
  setTimezone: React.Dispatch<React.SetStateAction<string>>;
  timezones: string[];
  fieldErrors: FieldErrors;
  clearFieldError: (field: keyof FieldErrors) => void;
  canSubmit: boolean;
  saveProfile: (finalize?: boolean) => Promise<void>;
  progress: number;
}

const ProfileSetupContext = createContext<ProfileSetupContextValue | null>(null);

export const ProfileSetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { t, setLocale, setExplanationLocale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [phoneStage, setPhoneStage] = useState<PhoneStage>('request');
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [weaknesses, setWeaknesses] = useState<typeof WEAKNESSES[number][]>([]);
  const [goalReasons, setGoalReasons] = useState<typeof GOAL_REASONS[number][]>([]);
  const [learningStyle, setLearningStyle] = useState<typeof LEARNING_STYLES[number] | ''>('');
  const [timezone, setTimezone] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const profileProgressRef = useRef<number>(0);

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => {
      const { [field]: _ignored, ...rest } = prev;
      return rest;
    });

  useEffect(() => {
    if (!timezone) {
      try {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      } catch {
        setTimezone('');
      }
    }
  }, [timezone]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      try {
        if (typeof window !== 'undefined') {
          const url = window.location.href;
          if (url.includes('code=') || url.includes('access_token=')) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
            if (!exchangeError) router.replace('/profile/setup').catch(() => {});
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.user) {
          setIsAuthenticated(false);
          router.replace({ pathname: '/login', query: { redirect: '/profile/setup' } }).catch(() => {});
          return;
        }

        setIsAuthenticated(true);
        setUserId(session.user.id);

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`)
          .maybeSingle();

        if (!active) return;

        if (profileError && profileError.code !== 'PGRST116') {
          setError(profileError.message);
        }

        if (data) {
          setFullName(data.full_name ?? '');
          setCountry(data.country ?? '');
          setLevel((data.english_level as typeof LEVELS[number] | null) ?? '');
          setGoal(Number(data.goal_band ?? 7.0));
          setExamDate(data.exam_date ?? '');
          setPrefs(Array.isArray(data.study_prefs) ? data.study_prefs : []);
          setFocusTopics(
            Array.isArray(data.focus_topics)
              ? (data.focus_topics.filter((topic: unknown) => typeof topic === 'string') as typeof TOPICS[number][])
              : [],
          );
          setDailyQuota(clampDailyQuota(data.daily_quota_goal ?? null));
          setTime((data.time_commitment as typeof TIME[number] | null) ?? '');
          setDaysPerWeek((data.days_per_week as number | null) ?? '');
          setPhone(data.phone ?? '');
          setPhoneStage(data.phone ? 'verified' : 'request');
          setWeaknesses(Array.isArray(data.weaknesses) ? data.weaknesses : []);
          setGoalReasons(Array.isArray(data.goal_reason) ? data.goal_reason : []);
          setLearningStyle((data.learning_style as typeof LEARNING_STYLES[number] | null) ?? '');
          setTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
          setLang(data.preferred_language ?? 'en');
          setLocale(data.preferred_language ?? 'en');
          setExplanationLang(data.language_preference ?? 'en');
          setExplanationLocale(data.language_preference ?? 'en');

          if (data.avatar_url) {
            const resolved = await resolveAvatarUrl(data.avatar_url);
            if (!active) return;
            setAvatarUrl(resolved.signedUrl ?? undefined);
            setAvatarPath(resolved.path ?? undefined);
          } else {
            setAvatarUrl(undefined);
            setAvatarPath(undefined);
          }

          try {
            const rec = (data.ai_recommendation as AIPlan | null) ?? null;
            if (rec && (rec.suggestedGoal || rec.sequence?.length)) setAi(rec);
          } catch {
            // ignore malformed AI recommendations
          }

          profileProgressRef.current = computeProgressFromValues({
            fullName: data.full_name ?? '',
            country: data.country ?? '',
            level: data.english_level ?? '',
            time: data.time_commitment ?? '',
            daysPerWeek: data.days_per_week ?? '',
            phoneVerified: Boolean(data.phone),
          });
        }
      } catch (err) {
        if (!active) return;
        console.error('Failed to load profile setup data', err);
        setError((prev) => prev ?? 'Unable to load profile data');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router, setLocale, setExplanationLocale]);

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
      Math.round((suggestedGoal - 5) * (time === '2h/day' ? 4 : time === '1h/day' ? 6 : 5)),
    );
    const cadence = time || '1–2h/day';
    return {
      suggestedGoal,
      etaWeeks,
      sequence,
      notes: [
        `Focus order: ${sequence.join(' → ')}`,
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
    if (fallback) setAi(fallback);
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
        if (!res.ok) throw new Error('Failed to generate AI plan');

        const data = await res.json();
        if (!active) return;
        setAi({
          suggestedGoal: typeof data.suggestedGoal === 'number' ? data.suggestedGoal : fallback?.suggestedGoal,
          etaWeeks: typeof data.etaWeeks === 'number' ? data.etaWeeks : fallback?.etaWeeks,
          sequence: Array.isArray(data.sequence) && data.sequence.length ? data.sequence : fallback?.sequence ?? [],
          notes: Array.isArray(data.notes) && data.notes.length ? data.notes : fallback?.notes ?? [],
          source: data.source ?? 'ai',
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (!active) return;
        setAiError(e?.message || 'Unable to fetch AI plan');
        if (fallback) setAi(fallback);
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

  const togglePref = (p: typeof PREFS[number]) =>
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const toggleTopic = (topic: typeof TOPICS[number]) =>
    setFocusTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));

  const toggleWeakness = (w: typeof WEAKNESSES[number]) =>
    setWeaknesses((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  const toggleGoalReason = (r: typeof GOAL_REASONS[number]) =>
    setGoalReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

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

  const canSubmit =
    Boolean(fullName && country && level && time && daysPerWeek) &&
    phoneStage === 'verified' &&
    Object.keys(fieldErrors).length === 0;

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
        if (Number.isNaN(d.getTime()) || d < today) errs.examDate = 'Exam date cannot be in the past';
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

    const aiRecommendation = ai
      ? {
          suggestedGoal: ai.suggestedGoal,
          etaWeeks: ai.etaWeeks,
          sequence: ai.sequence,
          notes: ai.notes,
          source: ai.source,
        }
      : null;

    const basePayload = {
      full_name: fullName.trim() || null,
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
      ai_recommendation: aiRecommendation,
      setup_complete: finalize,
      role: 'student',
      status: finalize ? 'active' : 'inactive',
    };

    const insertPayload = {
      ...basePayload,
      id: userId,
      user_id: userId,
    };

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, user_id, setup_complete')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (existing?.setup_complete && !finalize) {
        setError('Profile is already complete and cannot be updated as a draft.');
        setSaving(false);
        return;
      }

      const { error: upsertErr } = existing
        ? await supabase
            .from('profiles')
            .update(basePayload)
            .eq(existing.id ? 'id' : 'user_id', existing.id ?? existing?.user_id ?? userId)
        : await supabase.from('profiles').insert(insertPayload);

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
      if (finalize) router.push('/dashboard').catch(() => {});
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
      console.error('Save profile error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferredLanguageChange = (value: string) => {
    setLang(value);
    setLocale(value);
  };

  const handleExplanationLanguageChange = (value: string) => {
    setExplanationLang(value);
    setExplanationLocale(value);
  };

  const value: ProfileSetupContextValue = {
    t,
    loading,
    isAuthenticated,
    saving,
    error,
    notice,
    userId,
    fullName,
    setFullName,
    country,
    setCountry,
    level,
    setLevel,
    goal,
    setGoal,
    examDate,
    setExamDate,
    prefs,
    togglePref,
    focusTopics,
    toggleTopic,
    dailyQuota,
    setDailyQuota,
    time,
    setTime,
    daysPerWeek,
    setDaysPerWeek,
    lang,
    handlePreferredLanguageChange,
    explanationLang,
    handleExplanationLanguageChange,
    avatarUrl,
    setAvatarUrl,
    avatarPath,
    setAvatarPath,
    ai,
    aiLoading,
    aiError,
    phone,
    setPhone,
    phoneCode,
    setPhoneCode,
    phoneStage,
    requestOtp,
    verifyOtp,
    phoneErr,
    weaknesses,
    toggleWeakness,
    goalReasons,
    toggleGoalReason,
    learningStyle,
    setLearningStyle,
    timezone,
    setTimezone,
    timezones,
    fieldErrors,
    clearFieldError,
    canSubmit,
    saveProfile,
    progress: computeProgress(),
  };

  return <ProfileSetupContext.Provider value={value}>{children}</ProfileSetupContext.Provider>;
};

export const useProfileSetup = (): ProfileSetupContextValue => {
  const ctx = useContext(ProfileSetupContext);
  if (!ctx) throw new Error('useProfileSetup must be used within a ProfileSetupProvider');
  return ctx;
};

export {
  COUNTRIES,
  DAILY_QUOTA_RANGE,
  GOAL_REASONS,
  LEARNING_STYLES,
  LEVELS,
  PREFS,
  TIME,
  TOPICS,
  WEAKNESSES,
};
