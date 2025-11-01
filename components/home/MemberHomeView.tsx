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
      className="mt-4 block h-2 w-full overflow-hidden rounded-full border border-border/30 bg-border/20 [\&::-webkit-progress-bar]:rounded-full [\&::-webkit-progress-bar]:bg-transparent [\&::-webkit-progress-value]:rounded-full [\&::-webkit-progress-value]:bg-primary [\&::-moz-progress-bar]:bg-primary"
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
  const modules = useMemo(() => home.stats.modules.slice(0, 5), [home.stats.modules]);
  const calendarPreview = useMemo(() => home.calendar.days.slice(0, 5), [home.calendar.days]);
  const reports = useMemo(() => home.reports.slice(0, 3), [home.reports]);
  const guides = useMemo(() => home.guides.articles.slice(0, 3), [home.guides.articles]);

  const nextTask = home.nextTask;
  const word = home.wordOfDay;
  const coach = home.coach;
  const vocab = home.vocab;
  const streak = home.stats.streak;

  return (
    <div className="bg-gradient-to-b from-primary/5 via-background to-background pb-24 pt-12 text-foreground">
      <Container className="space-y-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-8 shadow-xl">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <div className="space-y-6">
              <Badge variant="soft" tone="primary" size="sm">
                Welcome back
              </Badge>
              <div className="space-y-3">
                <h1 className="font-slab text-3xl md:text-4xl">Hi {firstName}, let&apos;s keep the momentum</h1>
                <p className="text-base text-mutedText">
                  Your personalised IELTS roadmap is ready. Review the next action, skim today&apos;s word, and jump into the
                  skills that need attention this week.
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

          <Card className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-8">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Badge variant="soft" tone="accent" size="sm">
                  Streak health
                </Badge>
                <span className="text-xs uppercase tracking-[0.18em] text-mutedText">Target {streak.target} days</span>
              </div>
              <div>
                <p className="text-sm text-mutedText">Current streak</p>
                <p className="mt-1 text-5xl font-semibold text-foreground">{streak.current} days</p>
                <p className="mt-2 text-sm text-mutedText">
                  Best streak {streak.best} · Timezone {streak.timezone}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="rounded-2xl border border-border/50 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-mutedText">Saved lessons</p>
                  <p className="pt-2 text-2xl font-semibold text-foreground">{home.stats.saved.total}</p>
                  <p className="text-xs text-mutedText">Ready to revisit when you have a spare 15 minutes.</p>
                </Card>
                <Card className="rounded-2xl border border-border/50 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-mutedText">Mistakes to review</p>
                  <p className="pt-2 text-2xl font-semibold text-foreground">{home.stats.mistakes.unresolved}</p>
                  <p className="text-xs text-mutedText">Clear these out to keep the AI plan perfectly calibrated.</p>
                </Card>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-mutedText">Next focus</p>
                <h2 className="text-xl font-semibold text-foreground">{nextTask?.title ?? 'Choose a module'}</h2>
              </div>
              <Icon name="Target" size={24} className="text-primary" />
            </div>
            <p className="mt-3 text-sm text-mutedText">
              {nextTask?.description ?? 'Pick a skill below to unlock a personalised recommendation.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-mutedText">
              <Badge size="sm" variant="soft" tone="primary">
                {nextTask?.source === 'plan' ? 'Study plan' : nextTask?.source === 'coach' ? 'AI coach' : 'Recommendation'}
              </Badge>
              <span>{formatDueRelative(nextTask?.dueAtISO ?? null)}</span>
              {nextTask?.estimatedMinutes ? (
                <span>• {nextTask.estimatedMinutes} mins</span>
              ) : null}
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

          <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-mutedText">Word of the day</p>
                <h2 className="text-xl font-semibold text-foreground">{word?.word ?? 'Serendipity'}</h2>
              </div>
              <Icon name="Sparkles" size={24} className="text-accent" />
            </div>
            <p className="mt-3 text-sm text-mutedText">{word?.definition ?? 'A fortunate discovery made by accident.'}</p>
            <div className="mt-4 space-y-2 text-sm text-mutedText">
              {word?.partOfSpeech ? <p className="text-xs uppercase tracking-[0.18em]">{word.partOfSpeech}</p> : null}
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

          <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-mutedText">AI coach</p>
                <h2 className="text-xl font-semibold text-foreground">
                  {coach.hasUnread ? `${coach.unreadCount} reply${coach.unreadCount === 1 ? '' : 'ies'} waiting` : 'All caught up'}
                </h2>
              </div>
              <Icon name="Bot" size={24} className="text-primary" />
            </div>
            <p className="mt-3 text-sm text-mutedText">
              {coach.recommendedPrompt ?? 'Warm up with a quick writing drill or ask the coach for a study tip.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button href={coach.href} size="sm">
                Open coach
              </Button>
              <Button href={coach.hintsHref} size="sm" variant="ghost">
                View hints
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-slab text-2xl">Module mastery</h2>
              <p className="text-sm text-mutedText">Track how each IELTS skill is progressing with AI-assisted drills.</p>
            </div>
            <Button href="/learning" variant="ghost" size="sm">
              Browse all modules
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <Card key={module.id} className="rounded-3xl border border-border/60 bg-card/95 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-mutedText">{module.label}</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {module.progressPercent != null ? `${module.progressPercent}% complete` : 'Ready to begin'}
                    </h3>
                  </div>
                  <Icon name="Compass" size={22} className="text-primary" />
                </div>
                <p className="mt-3 text-sm text-mutedText">
                  {module.badge ?? (module.trend === 'up' ? 'Trending up this week.' : 'Build consistency to unlock more insights.')}
                </p>
                <ProgressBar value={module.progressPercent} />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button href={module.href} size="sm">
                    Continue
                  </Button>
                  {module.locked ? (
                    <Badge variant="soft" tone="warning" size="sm">
                      Locked
                    </Badge>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-slab text-2xl">Analytics & reports</h2>
                <p className="text-sm text-mutedText">Visualise gains across time, skill, and effort.</p>
              </div>
              <Button href="/reports" variant="ghost" size="sm">
                View all reports
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <Card key={report.id} className="rounded-2xl border border-border/50 bg-background/80 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon name={reportIcons[report.id]} size={18} className="text-primary" />
                      {report.title}
                    </div>
                    {report.badge ? (
                      <Badge size="sm" variant="soft" tone="info">
                        {report.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="pt-3 text-sm text-mutedText">{report.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <Button href={report.href} size="sm">
                      Open report
                    </Button>
                    {report.locked ? (
                      <Badge variant="soft" tone="warning" size="sm">
                        Locked
                      </Badge>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-slab text-2xl">This week&apos;s schedule</h2>
                <p className="text-sm text-mutedText">Plan around {home.calendar.timezone} and protect the streak.</p>
              </div>
              <Button href="/study-plan" variant="ghost" size="sm">
                Edit plan
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {calendarPreview.map((day, idx) => {
                const planned = formatMinutes(day.plannedMinutes);
                const completed = formatMinutes(day.completedMinutes);
                const progress = day.plannedMinutes
                  ? Math.min(100, Math.round(((day.completedMinutes ?? 0) / day.plannedMinutes) * 100))
                  : null;
                return (
                  <li key={day.dateISO} className="rounded-2xl border border-border/40 bg-background/70 p-4">
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
          <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-slab text-2xl">Guides & resources</h2>
                <p className="text-sm text-mutedText">Articles tailored to your band goal and exam journey.</p>
              </div>
              <Button href="/blog" variant="ghost" size="sm">
                Browse library
              </Button>
            </div>
            <div className="mt-6 space-y-4">
              {home.guides.featured ? (
                <Link href={home.guides.featured.href} className="block focus-visible:outline-none">
                  <Card className="rounded-2xl border border-border/50 bg-gradient-to-r from-primary/10 via-background to-background p-5 transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-primary">
                    <Badge variant="soft" tone="primary" size="sm">
                      Featured
                    </Badge>
                    <h3 className="pt-3 text-lg font-semibold text-foreground">{home.guides.featured.title}</h3>
                    <p className="pt-2 text-sm text-mutedText">
                      {home.guides.featured.category ?? 'Strategy'} · {home.guides.featured.readingTimeMinutes ?? 5} min read
                    </p>
                  </Card>
                </Link>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {guides.map((guide) => (
                  <Link key={guide.id} href={guide.href} className="block focus-visible:outline-none">
                    <Card className="rounded-2xl border border-border/40 bg-background/80 p-4 transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-primary">
                      <p className="text-xs uppercase tracking-[0.18em] text-mutedText">{guide.category ?? 'Guide'}</p>
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
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          {home.upgradeOffer ? (
            <Card className="flex h-full flex-col justify-between gap-5 rounded-3xl border border-border/60 bg-card/95 p-6">
              <div className="space-y-3">
                <Badge variant="soft" tone="success" size="sm">
                  Limited offer
                </Badge>
                <h3 className="text-2xl font-semibold text-foreground">{home.upgradeOffer.title}</h3>
                <p className="text-sm text-mutedText">{home.upgradeOffer.body}</p>
                {home.upgradeOffer.expiresAtISO ? (
                  <p className="text-xs text-mutedText">
                    Expires {new Date(home.upgradeOffer.expiresAtISO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href={home.upgradeOffer.href} size="sm">
                  {home.upgradeOffer.ctaLabel}
                </Button>
                <Button href="/pricing" size="sm" variant="ghost">
                  All plans
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-3xl border border-border/60 bg-card/95 p-6">
              <div className="space-y-3">
                <Badge variant="soft" tone="primary" size="sm">
                  Keep exploring
                </Badge>
                <h3 className="text-2xl font-semibold text-foreground">Join a live class or book a coach</h3>
                <p className="text-sm text-mutedText">
                  Step into live speaking drills, writing feedback clinics, and community accountability circles.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href="/marketplace" size="sm">
                  Explore classes
                </Button>
                <Button href="/coach" size="sm" variant="ghost">
                  Meet coaches
                </Button>
              </div>
            </Card>
          )}
        </section>
      </Container>
    </div>
  );
};

MemberHomeView.displayName = 'MemberHomeView';

export default MemberHomeView;
