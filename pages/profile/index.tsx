'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Badge } from '@/components/design-system/Badge';
import type { Badge as BadgeType } from '@/data/badges';
import { getUserBadges } from '@/lib/gamification';
import { StreakCounter } from '@/components/streak/StreakCounter';

export default function ProfilePage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const { current: streak, longest, loading: streakLoading } = useStreak();
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/login');
          return;
        }

        if (cancelled) return;

        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error || !data || (data as any).draft) {
          router.replace('/profile/setup');
          return;
        }

        const nextProfile = data as Profile;
        const rawGoal = nextProfile.goal_band;
        const goalString = typeof rawGoal === 'number' ? rawGoal.toFixed(1) : '';

        setProfile(nextProfile);
        setFullName(nextProfile.full_name ?? '');
        setPreferredLanguage(nextProfile.preferred_language ?? 'en');
        setGoalBand(goalString);
        setExamDate(nextProfile.exam_date?.slice?.(0, 10) ?? '');
        setAvatarPath(isStoragePath(nextProfile.avatar_url ?? null) ? nextProfile.avatar_url ?? null : null);
      } catch (error) {
        console.error('Error during profile fetch:', error);
        router.replace('/profile/setup');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const validate = () => {
    const errors: FieldErrors = {};
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Name is required.';
    }

    if (!preferredLanguage) {
      errors.preferredLanguage = 'Select a language.';
    } else if (!LANGUAGE_OPTIONS.some((option) => option.value === preferredLanguage)) {
      errors.preferredLanguage = 'Select a supported language.';
    }

    let parsedGoal: number | null = null;
    if (goalBand.trim()) {
      parsedGoal = Number(goalBand);
      const isValidNumber = Number.isFinite(parsedGoal);
      const isInRange = parsedGoal >= 4 && parsedGoal <= 9;
      const isHalfStep = Math.abs(parsedGoal * 2 - Math.round(parsedGoal * 2)) < 0.001;
      if (!isValidNumber || !isInRange || !isHalfStep) {
        errors.goalBand = 'Target band must be between 4.0 and 9.0 in 0.5 steps.';
      }
    }

    if (examDate) {
      const parsedDate = new Date(examDate);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.examDate = 'Enter a valid exam date.';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
          errors.examDate = 'Exam date cannot be in the past.';
        }
      }
    }

    setFieldErrors(errors);

    return { isValid: Object.keys(errors).length === 0, parsedGoal, trimmedName };
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !userId) return;

    const { isValid, parsedGoal, trimmedName } = validate();
    if (!isValid) {
      toastError('Please fix the highlighted fields.');
      return;
    }

    const nextProfile: Profile = {
      ...profile,
      full_name: trimmedName,
      preferred_language: preferredLanguage,
      goal_band: parsedGoal,
      exam_date: examDate || null,
      avatar_url: avatarPath ?? profile.avatar_url ?? null,
    };

    const prevProfile = profile;

    setProfile(nextProfile);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          preferred_language: preferredLanguage,
          goal_band: parsedGoal,
          exam_date: examDate || null,
          avatar_url: avatarPath ?? profile.avatar_url ?? null,
        })
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          preferred_language: preferredLanguage,
          avatar_path: avatarPath ?? null,
          avatar_url: avatarPath ?? null,
        },
      });

      setFieldErrors({});
      toastSuccess('Profile updated.');
    } catch (error) {
      console.error('Profile update failed:', error);
      setProfile(prevProfile);
      toastError(error instanceof Error ? error.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const isPremium = profile?.role ? profile.role.toLowerCase() === 'premium' : false;

  if (loading) {
    return (
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="p-6 rounded-ds-2xl max-w-xl mx-auto">Loading…</Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-xl mx-auto space-y-6">
          <StreakCounter current={streak} longest={longest} loading={streakLoading} />

          <Card className="p-6 rounded-ds-2xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-slab text-display">Profile</h1>
              <div className="flex items-center gap-2">
                <StreakIndicator value={streak} />
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSave}>
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-vibrantPurple/10 flex items-center justify-center">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={96}
                        height={96}
                        className="h-24 w-24 object-cover"
                      />
                    ) : (
                      <span className="text-h2 font-semibold text-vibrantPurple">
                        {fullName ? fullName[0]?.toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground">Upload a new photo below</p>
                </div>
                <div className="flex-1">
                  <AvatarUploader
                    userId={userId}
                    initialUrl={avatarUrl ?? undefined}
                    initialPath={avatarPath ?? (isStoragePath(profile?.avatar_url ?? null) ? profile?.avatar_url ?? null : null)}
                    onUploaded={({ signedUrl, path }) => {
                      setAvatarPath(path);
                      setProfile((prev) => (prev ? { ...prev, avatar_url: path } : prev));
                      void supabase.auth
                        .updateUser({ data: { avatar_path: path, avatar_url: path } })
                        .catch((error) => console.warn('Failed to persist avatar metadata', error));
                      window.dispatchEvent(
                        new CustomEvent('profile:avatar-changed', { detail: { url: signedUrl, path } }),
                      );
                      toastSuccess('Photo updated.');
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  error={fieldErrors.fullName ?? null}
                  required
                />
                <Select
                  label="Preferred language"
                  value={preferredLanguage}
                  onChange={(event) => setPreferredLanguage(event.target.value)}
                  error={fieldErrors.preferredLanguage ?? null}
                  required
                >
                  <option value="" disabled>
                    Select language
                  </option>
                  {displayedLanguageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  type="number"
                  label="Target IELTS band"
                  placeholder="e.g. 7.5"
                  min={4}
                  max={9}
                  step={0.5}
                  value={goalBand}
                  onChange={(event) => setGoalBand(event.target.value)}
                  error={fieldErrors.goalBand ?? null}
                  helperText="4.0 – 9.0 in 0.5 steps"
                />
                <Input
                  type="date"
                  label="Exam date"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  error={fieldErrors.examDate ?? null}
                  helperText="Optional"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button type="submit" variant="primary" className="rounded-ds-xl" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </section>
  );
}
