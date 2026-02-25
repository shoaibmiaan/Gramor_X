import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Progress } from '@/components/design-system/Progress';
import { StreakPanel } from '@/components/dashboard/StreakPanel';
import { TodayTasks } from '@/components/dashboard/TodayTasks';
import { SkillProgress } from '@/components/dashboard/SkillProgress';
import { NextTaskCard } from '@/components/reco/NextTaskCard';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { PlanDashboard } from '@/components/study-plan/PlanDashboard';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface DashboardProps {
  user: any;
  profile: any;
  studyPlan: any;
  streak: number;
  nextTask: any;
  todayTasks: any[];
  skillProgress: any;
}

export default function Dashboard({
  user,
  profile,
  studyPlan,
  streak,
  nextTask,
  todayTasks,
  skillProgress
}: DashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Check if user needs to complete onboarding
  if (profile?.onboarding_step < 6) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Card className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Complete Your Profile Setup</h1>
            <p className="text-gray-600 mb-8">
              You're almost there! Complete the onboarding process to get your personalized study plan.
            </p>

            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span>Onboarding Progress</span>
                <span>{Math.round((profile.onboarding_step / 6) * 100)}%</span>
              </div>
              <Progress value={(profile.onboarding_step / 6) * 100} className="h-2" />
            </div>

            <div className="space-y-4">
              <StepStatus
                step={1}
                currentStep={profile.onboarding_step}
                title="Set Target Band"
                href="/onboarding/target-band"
              />
              <StepStatus
                step={2}
                currentStep={profile.onboarding_step}
                title="Set Exam Date"
                href="/onboarding/exam-date"
              />
              <StepStatus
                step={3}
                currentStep={profile.onboarding_step}
                title="Baseline Assessment"
                href="/onboarding/baseline"
              />
              <StepStatus
                step={4}
                currentStep={profile.onboarding_step}
                title="Learning Vibe"
                href="/onboarding/vibe"
              />
              <StepStatus
                step={5}
                currentStep={profile.onboarding_step}
                title="Review & Confirm"
                href="/onboarding/review"
              />
              <StepStatus
                step={6}
                currentStep={profile.onboarding_step}
                title="Generate Study Plan"
                href="/onboarding/thinking"
                isLast
              />
            </div>

            <Button
              onClick={() => router.push(getNextOnboardingStep(profile.onboarding_step))}
              className="mt-8"
              size="lg"
            >
              Continue Onboarding
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Check if study plan exists
  if (!studyPlan) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Card className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Gramor X!</h1>
            <p className="text-gray-600 mb-8">
              Your study plan is being generated. This might take a few moments.
            </p>

            <div className="mb-8">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => router.push('/onboarding/thinking')}
              variant="outline"
            >
              Check Generation Status
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user.email?.split('@')[0]}!</h1>
            <p className="text-gray-600">
              Target Band: {profile.target_band} • Exam in {calculateDaysUntilExam(profile.exam_date)} days
            </p>
          </div>
          <StreakPanel streak={streak} />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Task Card */}
            {nextTask && (
              <NextTaskCard task={nextTask} />
            )}

            {/* Study Plan Dashboard */}
            <PlanDashboard studyPlan={studyPlan} />

            {/* Today's Tasks */}
            <TodayTasks tasks={todayTasks} />

            {/* Skill Progress */}
            <SkillProgress progress={skillProgress} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* AI Insights */}
            <AIInsights userId={user.id} />

            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/practice/reading')}
                >
                  📖 Reading Practice
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/practice/listening')}
                >
                  🎧 Listening Practice
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/practice/writing')}
                >
                  ✍️ Writing Practice
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/practice/speaking')}
                >
                  🎤 Speaking Practice
                </Button>
              </div>
            </Card>

            {/* Study Progress Overview */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Weekly Progress</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tasks Completed</span>
                    <span>8/12</span>
                  </div>
                  <Progress value={66} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Study Time</span>
                    <span>5.5/10 hrs</span>
                  </div>
                  <Progress value={55} className="h-2" />
                </div>
              </div>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Upcoming</h3>
              <div className="space-y-2">
                <div className="text-sm p-2 bg-yellow-50 rounded">
                  <div className="font-medium">Mock Test</div>
                  <div className="text-gray-600">In 3 days</div>
                </div>
                <div className="text-sm p-2 bg-blue-50 rounded">
                  <div className="font-medium">Writing Assignment</div>
                  <div className="text-gray-600">Tomorrow</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper Components
function StepStatus({ step, currentStep, title, href, isLast = false }: any) {
  const isCompleted = currentStep > step;
  const isCurrent = currentStep === step;

  return (
    <Link href={href} className="block">
      <div className={`flex items-center p-3 rounded-lg border transition-colors ${
        isCompleted ? 'bg-green-50 border-green-200' :
        isCurrent ? 'bg-blue-50 border-blue-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
          isCompleted ? 'bg-green-500 text-white' :
          isCurrent ? 'bg-blue-500 text-white' :
          'bg-gray-300 text-gray-600'
        }`}>
          {isCompleted ? '✓' : step}
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium">{title}</div>
          {isCurrent && <div className="text-sm text-blue-600">In Progress</div>}
          {isCompleted && !isLast && <div className="text-sm text-green-600">Completed</div>}
        </div>
        {!isCompleted && !isCurrent && (
          <div className="text-sm text-gray-400">Locked</div>
        )}
      </div>
    </Link>
  );
}

// Helper Functions
function getNextOnboardingStep(step: number): string {
  const steps = [
    '/onboarding/target-band',
    '/onboarding/exam-date',
    '/onboarding/baseline',
    '/onboarding/vibe',
    '/onboarding/review',
    '/onboarding/thinking'
  ];
  return steps[Math.min(step - 1, steps.length - 1)];
}

function calculateDaysUntilExam(examDate: string): number {
  const exam = new Date(examDate);
  const today = new Date();
  const diffTime = exam.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = getServerClient(context);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get study plan
  const { data: studyPlan } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get streak data
  const { data: streakData } = await supabase
    .from('streaks')
    .select('current_streak')
    .eq('user_id', user.id)
    .single();

  // Get next task
  const { data: nextTask } = await supabase
    .from('next_tasks')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get today's tasks
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('scheduled_date', today)
    .order('created_at');

  // Get skill progress
  const { data: skillProgress } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return {
    props: {
      user,
      profile: profile || { onboarding_step: 1 },
      studyPlan,
      streak: streakData?.current_streak || 0,
      nextTask: nextTask || null,
      todayTasks: todayTasks || [],
      skillProgress: skillProgress || {
        reading: 0,
        writing: 0,
        listening: 0,
        speaking: 0
      }
    },
  };
};