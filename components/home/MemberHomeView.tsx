// components/home/MemberHomeView.tsx
import React, { useMemo } from 'react';
import Link from 'next/link';

import type { HomeCalendarDay, HomeProps, HomeReportSummary } from '@/types/home';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

interface MemberHomeViewProps {
  home: HomeProps;
}

function formatDueRelative(iso: string | null): string {
  if (!iso) return 'Due anytime';
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return 'Due soon';

  const diffMs = due.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 6) {
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (diffDays >= 1) return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  if (diffDays === 0) return 'Due today';
  return 'Past due';
}

function formatMinutes(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${hours}h ${remaining}m`;
}

function getDayLabel(day: HomeCalendarDay, index: number): string {
  const date = new Date(day.dateISO);
  if (!Number.isNaN(date.getTime())) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.round((date.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return index === 0 ? 'Today' : `Day ${index + 1}`;
}

function ProgressBar({ value }: { value: number | null }) {
  const percent = Math.max(0, Math.min(100, value ?? 0));
  return (
    <progress
      value={percent}
      max={100}
      aria-label={`${percent}% complete`}
      className="mt-4 block h-2 w-full overflow-hidden rounded-full bg-border/30 [\&::-webkit-progress-bar]:bg-transparent [\&::-webkit-progress-value]:bg-primary [\&::-webkit-progress-value]:transition-[width] [\&::-moz-progress-bar]:bg-primary"
    />
  );
}

const reportIcons: Record<HomeReportSummary['id'], string> = {
  'band-trajectory': 'LineChart',
  skills: 'Blocks',
  time: 'Timer',
};

export const MemberHomeView: React.FC<MemberHomeViewProps> = ({ home }) => {
  const firstName = home.user.firstName || home.user.fullName || 'there';
  const modules = useMemo(() => home.stats.modules.slice(0, 4), [home.stats.modules]);
  const calendarPreview = useMemo(() => home.calendar.days.slice(0, 5), [home.calendar.days]);
  const reports = useMemo(() => home.reports.slice(0, 3), [home.reports]);
  const guides = useMemo(() => home.guides.articles.slice(0, 3), [home.guides.articles]);

  const nextTask = home.nextTask;
  const word = home.wordOfDay;
  const coach = home.coach;
  const vocab = home.vocab;
  const streak = home.stats.streak;

  return (
    <div className="bg-background text-foreground">
      <Container className="space-y-12 py-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <Card padding="lg" className="relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-primary/15 to-transparent lg:block" aria-hidden />
            <div className="space-y-6">
              <Badge variant="primary" size="sm">
                Welcome back
              </Badge>
              <div className="space-y-3">
                <h1 className="font-slab text-3xl leading-tight md:text-4xl">Hi {firstName}, let&apos;s keep the momentum</h1>
                <p className="text-base text-mutedText">
                  Your personalised IELTS roadmap is ready. Review the next action, skim today&apos;s word, and jump into the skills that need attention this week.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href={nextTask?.href ?? '/study-plan'} size="lg">
                  {nextTask ? 'Start next task' : 'Review study plan'}
                </Button>
                <Button href="/progress" variant="soft" tone="primary" size="lg">
                  View analytics
                </Button>
                <Button href="/community" variant="ghost" size="lg">
                  Check community
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Streak health</p>
                <p className="text-4xl font-semibold text-foreground">{streak.current} days</p>
                <p className="text-sm text-mutedText">Target {streak.target} · Best {streak.best}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-ds-xl border border-border/50 p-4">
                  <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Saved lessons</p>
                  <p className="pt-2 text-2xl font-semibold text-foreground">{home.stats.saved.total}</p>
                  <p className="text-xs text-mutedText">Ready to revisit when you have a spare 15 minutes.</p>
                </div>
                <div className="rounded-ds-xl border border-border/50 p-4">
                  <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Mistakes to review</p>
                  <p className="pt-2 text-2xl font-semibold text-foreground">{home.stats.mistakes.unresolved}</p>
                  <p className="text-xs text-mutedText">Clear these out to keep the AI plan perfectly calibrated.</p>
                </div>
              </div>
              <Button href="/streak" variant="soft" tone="info" size="sm">
                View streak calendar
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Daily momentum</h2>
              <p className="text-sm text-mutedText">Quick wins to stay on track today.</p>
            </div>
            <Button href="/study-plan" variant="ghost" size="sm">
              View plan
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card padding="md" interactive>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Next focus</p>
                  <h3 className="pt-2 text-lg font-semibold text-foreground">{nextTask?.title ?? 'Choose a module'}</h3>
                </div>
                <Icon name="Target" size={22} className="text-primary" />
              </div>
              <p className="pt-3 text-sm text-mutedText">
                {nextTask?.description ?? 'Pick a skill below to unlock a personalised recommendation.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-mutedText">
                <Badge variant="primary" size="xs">
                  {nextTask?.source === 'plan' ? 'Study plan' : nextTask?.source === 'coach' ? 'AI coach' : 'Recommendation'}
                </Badge>
                <span>{formatDueRelative(nextTask?.dueAtISO ?? null)}</span>
                {nextTask?.estimatedMinutes ? <span>• {nextTask.estimatedMinutes} mins</span> : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href={nextTask?.href ?? '/study-plan'} size="sm">
                  {nextTask ? 'Start now' : 'View roadmap'}
                </Button>
                <Button href="/study-plan" variant="ghost" size="sm">
                  Adjust plan
                </Button>
              </div>
            </Card>

            <Card padding="md" interactive>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Word of the day</p>
                  <h3 className="pt-2 text-lg font-semibold text-foreground">{word?.word ?? 'Serendipity'}</h3>
                </div>
                <Icon name="Sparkles" size={22} className="text-electricBlue" />
              </div>
              <p className="pt-3 text-sm text-mutedText">{word?.definition ?? 'A fortunate discovery made by accident.'}</p>
              <div className="pt-4 space-y-2 text-sm text-mutedText">
                {word?.partOfSpeech ? <p className="text-caption uppercase tracking-[0.18em]">{word.partOfSpeech}</p> : null}
                {word?.example ? <p className="italic">“{word.example}”</p> : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href={vocab.today.href} size="sm" variant="soft" tone="primary">
                  Practice vocab
                </Button>
                <Button href={vocab.leaderboard.href} size="sm" variant="ghost">
                  View leaderboard
                </Button>
              </div>
            </Card>

            <Card padding="md" interactive>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-caption uppercase tracking-[0.18em] text-mutedText">AI coach</p>
                  <h3 className="pt-2 text-lg font-semibold text-foreground">
                    {coach.hasUnread ? `${coach.unreadCount} reply${coach.unreadCount === 1 ? '' : 'ies'} waiting` : 'All caught up'}
                  </h3>
                </div>
                <Icon name="Bot" size={22} className="text-primary" />
              </div>
              <p className="pt-3 text-sm text-mutedText">
                {coach.recommendedPrompt ?? 'Warm up with a quick writing drill or ask the coach for a study tip.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href={coach.href} size="sm">
                  Open coach
                </Button>
                <Button href={coach.hintsHref} size="sm" variant="ghost">
                  View hints
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Module mastery</h2>
              <p className="text-sm text-mutedText">Track how each IELTS skill is progressing.</p>
            </div>
            <Button href="/learning" variant="ghost" size="sm">
              Browse modules
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => (
              <Card key={module.id} padding="md" interactive>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-caption uppercase tracking-[0.18em] text-mutedText">{module.label}</p>
                    <h3 className="pt-2 text-lg font-semibold text-foreground">
                      {module.progressPercent != null ? `${module.progressPercent}% complete` : 'Ready to begin'}
                    </h3>
                  </div>
                  <Icon name="Compass" size={20} className="text-primary" />
                </div>
                <p className="pt-3 text-sm text-mutedText">
                  {module.badge ?? (module.trend === 'up' ? 'Trending up this week.' : 'Build consistency to unlock more insights.')}
                </p>
                <ProgressBar value={module.progressPercent} />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button href={module.href} size="sm">
                    Continue
                  </Button>
                  {module.locked ? (
                    <Badge variant="warning" size="xs">
                      Locked
                    </Badge>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Analytics & reports</h2>
                <p className="text-sm text-mutedText">Visualise gains across time, skill, and effort.</p>
              </div>
              <Button href="/reports" variant="ghost" size="sm">
                View all reports
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <div key={report.id} className="rounded-ds-xl border border-border/60 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon name={reportIcons[report.id]} size={18} className="text-primary" />
                      {report.title}
                    </div>
                    {report.badge ? (
                      <Badge variant="info" size="xs">
                        {report.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="pt-3 text-sm text-mutedText">{report.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <Button href={report.href} size="sm" variant="soft">
                      Open report
                    </Button>
                    {report.locked ? (
                      <Badge variant="warning" size="xs">
                        Locked
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">This week&apos;s schedule</h2>
                <p className="text-sm text-mutedText">Plan around {home.calendar.timezone} and protect the streak.</p>
              </div>
              <Button href="/study-plan" variant="ghost" size="sm">
                Edit plan
              </Button>
            </div>
            <ul className="mt-5 space-y-3">
              {calendarPreview.map((day, idx) => {
                const planned = formatMinutes(day.plannedMinutes);
                const completed = formatMinutes(day.completedMinutes);
                const progress = day.plannedMinutes
                  ? Math.min(100, Math.round(((day.completedMinutes ?? 0) / day.plannedMinutes) * 100))
                  : null;
                return (
                  <li key={day.dateISO} className="rounded-ds-xl border border-border/50 p-4">
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span>{getDayLabel(day, idx)}</span>
                      <span>
                        {completed} / {planned}
                      </span>
                    </div>
                    <ProgressBar value={progress} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Guides & resources</h2>
                <p className="text-sm text-mutedText">Articles tailored to your band goal and exam journey.</p>
              </div>
              <Button href="/blog" variant="ghost" size="sm">
                Browse library
              </Button>
            </div>
            <div className="mt-6 space-y-5">
              {home.guides.featured ? (
                <Link href={home.guides.featured.href} className="block focus-visible:outline-none">
                  <div className="rounded-ds-xl border border-border/60 p-5 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/50">
                    <Badge variant="primary" size="xs">
                      Featured
                    </Badge>
                    <h3 className="pt-3 text-lg font-semibold text-foreground">{home.guides.featured.title}</h3>
                    <p className="pt-2 text-sm text-mutedText">
                      {home.guides.featured.category ?? 'Strategy'} · {home.guides.featured.readingTimeMinutes ?? 5} min read
                    </p>
                  </div>
                </Link>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {guides.map((guide) => (
                  <Link key={guide.id} href={guide.href} className="block focus-visible:outline-none">
                    <div className="rounded-ds-xl border border-border/40 p-4 transition hover:-translate-y-0.5 hover:shadow focus-visible:ring-2 focus-visible:ring-primary/50">
                      <p className="text-caption uppercase tracking-[0.18em] text-mutedText">{guide.category ?? 'Guide'}</p>
                      <h4 className="pt-2 text-sm font-semibold text-foreground">{guide.title}</h4>
                      <p className="pt-2 text-xs text-mutedText">
                        {guide.readingTimeMinutes ?? 4} min read · Published{' '}
                        {guide.publishedAtISO
                          ? new Date(guide.publishedAtISO).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'recently'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col justify-between gap-6">
            {home.upgradeOffer ? (
              <div className="space-y-3">
                <Badge variant="success" size="xs">
                  Limited offer
                </Badge>
                <h3 className="text-2xl font-semibold text-foreground">{home.upgradeOffer.title}</h3>
                <p className="text-sm text-mutedText">{home.upgradeOffer.body}</p>
                {home.upgradeOffer.expiresAtISO ? (
                  <p className="text-xs text-mutedText">
                    Expires {new Date(home.upgradeOffer.expiresAtISO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button href={home.upgradeOffer.href} size="sm">
                    {home.upgradeOffer.ctaLabel}
                  </Button>
                  <Button href="/pricing" size="sm" variant="ghost">
                    All plans
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="primary" size="xs">
                  Keep exploring
                </Badge>
                <h3 className="text-2xl font-semibold text-foreground">Join a live class or book a coach</h3>
                <p className="text-sm text-mutedText">
                  Step into live speaking drills, writing feedback clinics, and community accountability circles.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button href="/marketplace" size="sm">
                    Explore classes
                  </Button>
                  <Button href="/coach" size="sm" variant="ghost">
                    Meet coaches
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </Container>
    </div>
  );
};

MemberHomeView.displayName = 'MemberHomeView';

export default MemberHomeView;
