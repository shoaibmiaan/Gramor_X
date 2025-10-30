import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Skeleton } from '@/components/design-system/Skeleton';
import LeaderboardFilters, { 
  type LeaderboardScope, 
  type LeaderboardSkill 
} from '@/components/leaderboard/LeaderboardFilters';
import { track } from '@/lib/analytics/track';

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  xp: number;
  rank: number;
  snapshotDate: string | null;
}

interface LeaderboardData {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
}

interface ApiResponse {
  ok: boolean;
  entries?: LeaderboardData;
  error?: string;
}

// Constants
const SCOPE_LABEL: Record<LeaderboardScope, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
};

const SCOPE_DESCRIPTION: Record<LeaderboardScope, string> = {
  daily: 'Daily snapshots reset at midnight Karachi time.',
  weekly: 'Weekly snapshots reset every Monday.',
};

const MEDALS = ['🥇', '🥈', '🥉'] as const;

// Custom hook for data fetching
function useLeaderboardData() {
  const [data, setData] = useState<LeaderboardData>({ daily: [], weekly: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const res = await fetch('/api/leaderboard/xp', { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Unable to load leaderboard`);
      }

      const json: ApiResponse = await res.json();
      
      if (!json.ok || !json.entries) {
        throw new Error(json.error || 'Invalid data format from server');
      }

      // Normalize and validate data
      const normalizeEntries = (entries: LeaderboardEntry[] = []): LeaderboardEntry[] => 
        entries.map(entry => ({
          userId: entry.userId || 'unknown',
          fullName: entry.fullName?.trim() || 'Anonymous',
          xp: Math.max(0, entry.xp || 0),
          rank: Math.max(1, entry.rank || 0),
          snapshotDate: entry.snapshotDate || null,
        }));

      setData({
        daily: normalizeEntries(json.entries.daily),
        weekly: normalizeEntries(json.entries.weekly),
      });
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.name === 'AbortError' 
          ? 'Request timed out. Please try again.'
          : err.message
        : 'Unable to load the leaderboard right now.';
      
      console.error('[Leaderboard] Failed to load:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

// Sub-components for better organization
const LoadingState: React.FC = () => (
  <Card className="p-8 rounded-ds-2xl">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-ds-xl border border-muted/40 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
      ))}
    </div>
    <div className="mt-8 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </Card>
);

const EmptyState: React.FC<{ 
  skill: LeaderboardSkill; 
  activeScope: LeaderboardScope;
}> = ({ skill, activeScope }) => (
  <Card className="p-8 text-center rounded-ds-2xl">
    <Badge variant="secondary" size="sm" className="mx-auto">
      {skill === 'writing' ? 'Writing' : `${SCOPE_LABEL[activeScope]} Challenge`}
    </Badge>
    <h2 className="font-slab text-h2 mt-4">No scores… yet!</h2>
    <p className="text-body mt-3 text-grayish">
      {skill === 'writing'
        ? 'Complete a mock writing attempt to populate the writing leaderboard.'
        : `Be the first to complete this ${activeScope === 'daily' ? "day's" : "week's"} tasks and claim the top spot on the leaderboard.`}
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link href="/challenge" legacyBehavior>
        <Button variant="primary" className="rounded-ds-xl">
          Join the challenge
        </Button>
      </Link>
      <Link href="/dashboard" legacyBehavior>
        <Button variant="secondary" className="rounded-ds-xl">
          Back to dashboard
        </Button>
      </Link>
    </div>
  </Card>
);

const ErrorState: React.FC<{ 
  error: string; 
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <Card className="p-8 rounded-ds-2xl text-center">
    <h2 className="font-slab text-h3">Something went wrong</h2>
    <p className="mt-3 text-body text-grayish">
      {error}
    </p>
    <div className="mt-6 flex justify-center gap-3">
      <Button 
        variant="primary" 
        onClick={onRetry}
        className="rounded-ds-xl"
      >
        Try Again
      </Button>
      <Link href="/dashboard" legacyBehavior>
        <Button variant="secondary" className="rounded-ds-xl">
          Back to Dashboard
        </Button>
      </Link>
    </div>
  </Card>
);

const TopPerformers: React.FC<{
  entries: LeaderboardEntry[];
  scope: LeaderboardScope;
}> = ({ entries, scope }) => {
  const topThree = entries.slice(0, 3);
  const hasEntries = topThree.length > 0;

  return (
    <Card className="relative overflow-hidden rounded-ds-2xl border border-primary/10 bg-background/80 p-8">
      <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative z-10">
        <h2 className="font-slab text-h2 text-foreground">
          Top performers ({SCOPE_LABEL[scope]})
        </h2>
        <p className="mt-2 text-body text-grayish">
          Keep your streak alive and collect challenge points through lessons, drills, and mock tests.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {hasEntries ? (
            topThree.map((entry, index) => (
              <TopPerformerCard 
                key={entry.userId} 
                entry={entry} 
                index={index} 
              />
            ))
          ) : (
            <div className="sm:col-span-3 text-center py-8 text-grayish">
              No top performers yet
            </div>
          )}
          
          {topThree.length < 3 &&
            Array.from({ length: 3 - topThree.length }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="rounded-ds-xl border border-dashed border-border/60 p-5 text-center text-caption text-muted-foreground flex items-center justify-center"
              >
                Spot available
              </div>
            ))
          }
        </div>
      </div>
    </Card>
  );
};

const TopPerformerCard: React.FC<{
  entry: LeaderboardEntry;
  index: number;
}> = ({ entry, index }) => {
  const medal = MEDALS[index];
  const isFirst = index === 0;
  
  const cardClass = isFirst
    ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10'
    : 'bg-muted/40 border-muted/60';

  return (
    <div
      className={`rounded-ds-xl border p-5 text-left transition-transform hover:-translate-y-1 ${cardClass}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-label={`${medal} medal`}>
          {medal}
        </span>
        <div>
          <p className="text-caption uppercase tracking-wide text-grayish">
            Rank {entry.rank}
          </p>
          <p className="text-body font-semibold text-foreground">
            {entry.fullName}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-caption text-grayish">Challenge XP</p>
        <p className="text-h3 font-slab text-foreground">
          {entry.xp.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

const LeaderboardList: React.FC<{
  entries: LeaderboardEntry[];
}> = ({ entries }) => {
  const rest = entries.slice(3);

  if (rest.length === 0) {
    return (
      <Card className="p-6 rounded-ds-2xl border border-border/60 text-center">
        <p className="text-grayish">No more entries to show</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-ds-2xl border border-border/60">
      <div className="flex items-center justify-between">
        <h3 className="font-slab text-h4 text-foreground">Leaderboard</h3>
        <Badge variant="secondary" size="sm">
          Showing {entries.length} learners
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        {rest.map((entry) => (
          <LeaderboardRow key={entry.userId} entry={entry} />
        ))}
      </div>
    </Card>
  );
};

const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
}> = ({ entry }) => (
  <div
    className="flex items-center justify-between gap-4 rounded-ds-xl border border-border/60 bg-background/80 px-4 py-3 hover:bg-muted/20 transition-colors"
  >
    <div className="flex items-center gap-3">
      <span 
        className="grid h-9 w-9 place-items-center rounded-full bg-muted text-caption font-semibold text-foreground"
        aria-label={`Rank ${entry.rank}`}
      >
        {entry.rank}
      </span>
      <div>
        <p className="text-small font-medium text-foreground">
          {entry.fullName}
        </p>
        <p className="text-caption text-muted-foreground">
          {entry.xp.toLocaleString()} XP
        </p>
      </div>
    </div>
    <span className="text-caption text-muted-foreground">
      Rank {entry.rank}
    </span>
  </div>
);

// Format snapshot date helper
function formatSnapshotDate(entries: LeaderboardEntry[]): string | null {
  const snapshot = entries[0]?.snapshotDate;
  if (!snapshot) return null;
  
  try {
    return new Date(snapshot).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return snapshot;
  }
}

// Main component
export default function XpLeaderboard() {
  const [activeScope, setActiveScope] = useState<LeaderboardScope>('weekly');
  const [skill, setSkill] = useState<LeaderboardSkill>('xp');
  
  const { data, loading, error, refetch } = useLeaderboardData();

  // Memoized derived data
  const currentEntries = useMemo(() => {
    if (skill === 'writing') return [];
    return data[activeScope] ?? [];
  }, [data, activeScope, skill]);

  const snapshotDate = useMemo(() => 
    formatSnapshotDate(currentEntries), 
    [currentEntries]
  );

  // Analytics
  useEffect(() => {
    if (skill === 'writing') {
      track('leaderboard.view.writing', { scope: activeScope });
    } else {
      track('leaderboard.view.xp', { scope: activeScope });
    }
  }, [activeScope, skill]);

  // Event handlers
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleScopeChange = useCallback((scope: LeaderboardScope) => {
    setActiveScope(scope);
  }, []);

  const handleSkillChange = useCallback((newSkill: LeaderboardSkill) => {
    setSkill(newSkill);
  }, []);

  return (
    <>
      <Head>
        <title>XP Leaderboard · GramorX</title>
        <meta
          name="description"
          content="See how you rank in daily and weekly IELTS practice challenges and compete with other learners."
        />
      </Head>

      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="accent" size="sm" className="uppercase tracking-wide">
              Gamification
            </Badge>
            <h1 className="font-slab text-display mt-4 text-foreground">XP Leaderboard</h1>
            <p className="mt-3 text-body text-grayish">
              Earn XP from lessons, drills, writing minis, and speaking attempts. 
              Climb the daily and weekly boards as you stay consistent.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/challenge" legacyBehavior>
                <Button variant="primary" className="rounded-ds-xl">
                  Join the challenge
                </Button>
              </Link>
              <Link href="/dashboard" legacyBehavior>
                <Button variant="secondary" className="rounded-ds-xl">
                  Back to dashboard
                </Button>
              </Link>
            </div>

            <div className="mt-8">
              <LeaderboardFilters
                scope={activeScope}
                skill={skill}
                onScopeChange={handleScopeChange}
                onSkillChange={handleSkillChange}
              />
            </div>
            <p className="mt-3 text-caption text-muted-foreground">
              {SCOPE_DESCRIPTION[activeScope]}
              {snapshotDate && ` • Snapshot ${snapshotDate}`}
            </p>
          </div>

          <div className="mt-12 max-w-4xl mx-auto space-y-8">
            {loading && <LoadingState />}

            {!loading && error && (
              <ErrorState error={error} onRetry={handleRetry} />
            )}

            {!loading && !error && currentEntries.length === 0 && (
              <EmptyState skill={skill} activeScope={activeScope} />
            )}

            {!loading && !error && currentEntries.length > 0 && (
              <>
                <TopPerformers 
                  entries={currentEntries} 
                  scope={activeScope} 
                />
                <LeaderboardList entries={currentEntries} />
              </>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}