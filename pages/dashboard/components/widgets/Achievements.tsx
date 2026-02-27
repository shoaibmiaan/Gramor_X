import { useEffect, useMemo, useState } from 'react';

import type { PerformanceSnapshot } from '@/hooks/useDashboardData';

type AchievementsProps = {
  performance: PerformanceSnapshot;
};

type AchievementKey = 'streak' | 'essays' | 'band-increase';

const STORAGE_KEY = 'dashboard-achievements-v1';

const Achievements = ({ performance }: AchievementsProps) => {
  const [unlocked, setUnlocked] = useState<AchievementKey[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUnlocked(JSON.parse(raw) as AchievementKey[]);
      } catch {
        setUnlocked([]);
      }
    }
  }, []);

  const candidates = useMemo<{ key: AchievementKey; label: string; passed: boolean }[]>(
    () => [
      { key: 'streak', label: '7-day streak', passed: performance.studyStreak >= 7 },
      { key: 'essays', label: '5 essays submitted', passed: performance.mockTests >= 5 },
      { key: 'band-increase', label: 'Band increased to 7+', passed: (performance.overallBand ?? 0) >= 7 },
    ],
    [performance],
  );

  useEffect(() => {
    const nextUnlocked = Array.from(new Set([...unlocked, ...candidates.filter((c) => c.passed).map((c) => c.key)]));
    if (nextUnlocked.length === unlocked.length) return;
    setUnlocked(nextUnlocked);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUnlocked));
    }
  }, [candidates, unlocked]);

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <h3 className="text-base font-semibold">Achievements</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {candidates.map((achievement) => {
          const isUnlocked = unlocked.includes(achievement.key);
          return (
            <div key={achievement.key} className={`rounded-xl border p-3 ${isUnlocked ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border/60'}`}>
              <p className="text-sm font-medium">{achievement.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{isUnlocked ? 'Unlocked 🎉' : 'In progress'}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Achievements;
