// pages/dashboard/index.tsx
import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useUser } from '@/hooks/useUser';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useStreak } from '@/hooks/useStreak';
import { useMemo } from 'react';

import { HeroSection } from '@/components/dashboard/HeroSection';
import { AIOverviewPanel } from '@/components/dashboard/AIOverviewPanel';
import { TodayTasks } from '@/components/dashboard/TodayTasks';
import { SkillsOverview } from '@/components/dashboard/SkillsOverview';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { GamificationSummary } from '@/components/dashboard/GamificationSummary';
import { ChallengeSpotlightCard } from '@/components/dashboard/ChallengeSpotlightCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

// Lazy-loaded heavy sections (ssr: false for better performance)
const InnovationTiles = dynamic(() => import('@/components/dashboard/InnovationTiles'), { ssr: false });
const SavedWhatsAppSection = dynamic(() => import('@/components/dashboard/SavedWhatsAppSection'), { ssr: false });
const AICommandCenter = dynamic(() => import('@/components/dashboard/AICommandCenter'), { ssr: false });
const DailyWeeklyChallenges = dynamic(() => import('@/components/dashboard/DailyWeeklyChallenges'), { ssr: false });

const DashboardPage: NextPage = () => {
  const { user, isLoading: userLoading } = useUser();
  const userId = user?.id ?? null;
  const tier = user?.tier || 'free';

  const { data, isLoading: dataLoading, error } = useDashboardData({ userId, tier });
  const { streak: streakData, loading: streakLoading } = useStreak();
  const insights = useAIInsights(data, tier);

  const isLoading = userLoading || dataLoading || streakLoading;

  // Memoized static tiles (prevents unnecessary re-creations)
  const innovationTiles = useMemo(() => [
    { id: 'ai-coach', title: 'AI Coach', description: 'Personalized guidance based on your mistakes.', icon: 'Sparkles', accent: 'primary', badge: 'New', primary: { label: 'Start', href: '/ai-coach' }, secondary: { label: 'Learn more', href: '/ai-coach/about' } },
    { id: 'study-buddy', title: 'Study Buddy', description: 'Pair with a peer for speaking practice.', icon: 'Users', accent: 'secondary', primary: { label: 'Find buddy', href: '/study-buddy' } },
    { id: 'mistakes-book', title: 'Mistakes Book', description: 'Review and master your past errors.', icon: 'NotebookPen', accent: 'success', primary: { label: 'Review', href: '/mistakes' } },
    { id: 'whatsapp-tasks', title: 'WhatsApp Tasks', description: 'Daily micro-tasks via WhatsApp.', icon: 'MessageCircle', accent: 'info', primary: { label: 'Configure', href: '/whatsapp' } },
  ], []);

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return <div className="p-12 text-center text-danger">Failed to load dashboard. Please refresh.</div>;
  }

  const { profile, tasks, skills, gamification } = data;

  return (
    <div className="flex min-h-screen bg-[#f9fafb] dark:bg-[#111827] text-[#111827] dark:text-[#f9fafb] antialiased">

      {/* Sidebar — exact from HTML mockup */}
      <aside className="w-64 sticky top-0 h-screen border-r border-border bg-white/90 dark:bg-[#111827]/80 px-3 py-6 hidden md:block">
        <div className="mb-8 px-2 text-sm font-semibold tracking-wide text-indigo-600">GramorX AI</div>
        <nav className="space-y-1">
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">Dashboard</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Reading</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Writing</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Speaking</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">AI Reports</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Study Plan</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Billing</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Settings</a>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 min-w-0">
        {/* Top navbar — exact from HTML mockup */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-white/75 px-4 py-3 backdrop-blur-md dark:bg-[#111827]/70">
          <div className="flex items-center gap-3 w-full max-w-sm">
            <input className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary dark:bg-[#111827] dark:border-slate-700" placeholder="Search tasks, reports, prompts..." />
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 text-sm font-medium rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20">Ask AI</button>
            <button className="p-2 rounded-xl hover:bg-muted/20">🔔</button>
            <button className="flex items-center gap-1 p-2 rounded-xl hover:bg-muted/20">
              <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary">AL</span>
              <span>▾</span>
            </button>
          </div>
        </header>

        {/* Content container — exact from HTML mockup */}
        <div className="p-6 space-y-8">
          <HeroSection
            profile={profile}
            profileAvatarUrl={profile?.avatar_url ?? null}
            goalBand={profile?.goal_band ?? null}
            targetStudyTime={profile?.study_rhythm ?? ''}
            streak={streakData?.current ?? 0}
            shields={streakData?.shields ?? 0}
            topBadges={[]}
            onClaimShield={() => {}}
            onUseShield={() => {}}
            onOpenAICoach={() => {}}
            onOpenStudyBuddy={() => {}}
            onOpenMistakesBook={() => {}}
            onOpenWhatsAppTasks={() => {}}
            onShareDashboard={() => {}}
          />

          <AIOverviewPanel
            currentBand={data.currentBandPrediction ?? '6.5'}
            weeklyImprovement={data.weeklyImprovement ?? '+0.2'}
            nextAction={data.nextRecommendedAction ?? 'Complete 2 writing tasks'}
          />

          <TodayTasks tasks={tasks} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <SkillsOverview skills={skills} />
              <AIInsights insights={insights} />
              <GamificationSummary gamification={gamification} />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <ChallengeSpotlightCard cohortId="weekly-challenge-2026" />
              <Suspense fallback={<div className="h-64 rounded-2xl bg-card animate-pulse" />}>
                <DailyWeeklyChallenges />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<div className="h-80 rounded-2xl bg-card animate-pulse" />}>
            <InnovationTiles tiles={innovationTiles} />
          </Suspense>

          <Suspense fallback={<div className="h-96 rounded-2xl bg-card animate-pulse" />}>
            <SavedWhatsAppSection />
          </Suspense>

          <AICommandCenter />
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;