'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { Alert } from '@/components/design-system/Alert';
import { AvatarUploader } from '@/components/design-system/AvatarUploader';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

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
  useProfileSetup,
} from './useProfileSetup';

const Section: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, subtitle, children, defaultOpen = true }) => (
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

const SetupProgressBar: React.FC<{ value: number }> = ({ value }) => (
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

export const ProfileSetupLayout: React.FC = () => {
  const router = useRouter();
  const {
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
    progress,
  } = useProfileSetup();

  if (loading) {
    return (
      <section className="pb-24 sm:pb-14 pt-10 sm:pt-16 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mx-auto mb-6 sm:mb-8 max-w-5xl">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-col sm:flex-row">
              <div className="flex-1">
                <h1 className="font-slab text-display leading-tight text-gradient-primary">
                  {t('profileSetup.completeProfile')}
                </h1>
                <p className="text-muted mt-1 sm:mt-2 max-w-prose">{t('profileSetup.description')}</p>
              </div>
              <div className="w-full sm:w-64">
                <SetupProgressBar value={progress} />
                <p className="mt-1 text-right text-caption text-muted">{progress}%</p>
              </div>
            </div>
          </div>
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
        </Container>
      </section>
    );
  }

  return (
    <section className="pb-24 sm:pb-14 pt-10 sm:pt-16 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="mx-auto mb-6 sm:mb-8 max-w-5xl">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <h1 className="font-slab text-display leading-tight text-gradient-primary">
                {t('profileSetup.completeProfile')}
              </h1>
              <p className="text-muted mt-1 sm:mt-2 max-w-prose">{t('profileSetup.description')}</p>
            </div>
            <div className="w-full sm:w-64">
              <SetupProgressBar value={progress} />
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
            {!isAuthenticated ? (
              <Card className="card-surface p-6 rounded-ds-2xl space-y-3">
                <h2 className="font-slab text-h4 m-0">You’re being redirected</h2>
                <p className="text-muted text-small">
                  We could not detect an active session. Please sign in to continue setting up your profile.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  className="rounded-ds-xl w-fit"
                  onClick={() => router.replace({ pathname: '/login', query: { redirect: '/profile/setup' } })}
                >
                  Go to login
                </Button>
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
                        setLevel(e.target.value as typeof LEVELS[number]);
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
                        setTime(e.target.value as typeof TIME[number] | '');
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
                      onChange={(e) => handlePreferredLanguageChange(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                      <option value="ar">Arabic</option>
                      <option value="hi">Hindi</option>
                    </Select>
                    <Select
                      label={t('profileSetup.explanationLanguage')}
                      value={explanationLang}
                      onChange={(e) => handleExplanationLanguageChange(e.target.value)}
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
                        initialPath={avatarPath}
                        onUploaded={(url, path) => {
                          setAvatarUrl(url ?? undefined);
                          setAvatarPath(typeof path === 'string' ? path : undefined);
                          void supabase.auth.updateUser({ data: { avatar_url: url ?? undefined } });
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
                      <Select label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
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
                      <Alert id="examDate-error" variant="warning">
                        {fieldErrors.examDate}
                      </Alert>
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
                        <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                          Daily practice quota
                        </span>
                        <input
                          type="range"
                          min={DAILY_QUOTA_RANGE.min}
                          max={DAILY_QUOTA_RANGE.max}
                          step={1}
                          value={dailyQuota}
                          onChange={(event) => {
                            const raw = Number(event.target.value);
                            if (Number.isFinite(raw)) {
                              const clamped = Math.min(
                                DAILY_QUOTA_RANGE.max,
                                Math.max(DAILY_QUOTA_RANGE.min, Math.round(raw)),
                              );
                              setDailyQuota(clamped);
                            }
                          }}
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
                      onChange={(e) => setLearningStyle(e.target.value as typeof LEARNING_STYLES[number] | '')}
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
                    <Alert variant={ai.source === 'openai' ? 'info' : 'success'} className="mt-2" aria-live="polite">
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
};

