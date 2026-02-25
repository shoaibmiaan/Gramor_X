import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { getServerClient } from '@/lib/supabaseServer';
import { StepShell } from '@/components/onboarding/StepShell';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Progress } from '@/components/design-system/Progress';

interface ReviewPageProps {
  profile: any;
}

export default function ReviewPage({ profile }: ReviewPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm');
      }

      // Redirect to thinking page
      router.push(data.nextStep || '/onboarding/thinking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (step: string) => {
    router.push(step);
  };

  // Calculate weeks until exam
  const weeksUntilExam = Math.ceil(
    (new Date(profile.exam_date).getTime() - new Date().getTime()) /
    (1000 * 60 * 60 * 24 * 7)
  );

  return (
    <StepShell
      title="Review Your Information"
      description="Please review your information before we generate your personalized study plan"
      currentStep={4}
      totalSteps={5}
    >
      <div className="max-w-2xl mx-auto">
        {/* Progress Overview */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Your Journey Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Target Band</span>
                <span className="font-bold text-xl text-blue-600">{profile.target_band}</span>
              </div>
              <Progress value={(profile.target_band / 9) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span>Preparation Time</span>
                <span className="font-medium">{weeksUntilExam} weeks</span>
              </div>
              <Progress value={(weeksUntilExam / 52) * 100} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Review Sections */}
        <div className="space-y-4">
          {/* Target & Date */}
          <ReviewSection
            title="Target & Timeline"
            onEdit={() => handleEdit('/onboarding/target-band')}
          >
            <ReviewItem
              label="Target Band Score"
              value={profile.target_band}
              icon="🎯"
            />
            <ReviewItem
              label="Exam Date"
              value={new Date(profile.exam_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              icon="📅"
            />
          </ReviewSection>

          {/* Baseline Scores */}
          <ReviewSection
            title="Current Level"
            onEdit={() => handleEdit('/onboarding/baseline')}
          >
            <div className="grid grid-cols-2 gap-4">
              <ReviewItem
                label="Reading"
                value={profile.baseline_scores?.reading}
                icon="📖"
              />
              <ReviewItem
                label="Writing"
                value={profile.baseline_scores?.writing}
                icon="✍️"
              />
              <ReviewItem
                label="Listening"
                value={profile.baseline_scores?.listening}
                icon="🎧"
              />
              <ReviewItem
                label="Speaking"
                value={profile.baseline_scores?.speaking}
                icon="🎤"
              />
            </div>
          </ReviewSection>

          {/* Learning Preferences */}
          <ReviewSection
            title="Learning Preferences"
            onEdit={() => handleEdit('/onboarding/vibe')}
          >
            <ReviewItem
              label="Learning Style"
              value={profile.learning_style}
              icon={
                profile.learning_style === 'video' ? '🎥' :
                profile.learning_style === 'tips' ? '💡' :
                profile.learning_style === 'practice' ? '✍️' : '🃏'
              }
            />
            <ReviewItem
              label="Weekly Availability"
              value={`${profile.weekly_availability} hours`}
              icon="⏰"
            />
          </ReviewSection>

          {/* Gap Analysis */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-800">📊 Gap Analysis</h3>
            <p className="text-blue-700 text-sm">
              Based on your current scores and target, you need to improve by:
            </p>
            <div className="mt-2 space-y-1">
              {calculateGaps(profile.baseline_scores, profile.target_band).map((gap, i) => (
                <div key={i} className="text-sm text-blue-600">
                  {gap.skill}: {gap.current} → {profile.target_band} (need +{gap.improvement})
                </div>
              ))}
            </div>
          </Card>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding/vibe')}
          >
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm & Generate Plan'}
          </Button>
        </div>
      </div>
    </StepShell>
  );
}

// Helper Components
function ReviewSection({ title, children, onEdit }: any) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </Card>
  );
}

function ReviewItem({ label, value, icon }: any) {
  return (
    <div className="flex items-center">
      <span className="text-2xl mr-3">{icon}</span>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

// Helper Functions
function calculateGaps(scores: any, target: number) {
  const skills = ['reading', 'writing', 'listening', 'speaking'];
  return skills.map(skill => ({
    skill: skill.charAt(0).toUpperCase() + skill.slice(1),
    current: scores[skill],
    improvement: target - scores[skill]
  })).filter(gap => gap.improvement > 0);
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
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) {
    return {
      redirect: {
        destination: '/onboarding',
        permanent: false,
      },
    };
  }

  // Redirect if not at correct step
  if (profile.onboarding_step < 4) {
    return {
      redirect: {
        destination: getRedirectStep(profile.onboarding_step),
        permanent: false,
      },
    };
  }

  return {
    props: {
      profile,
    },
  };
};

function getRedirectStep(step: number): string {
  const steps = [
    '/onboarding/target-band',
    '/onboarding/exam-date',
    '/onboarding/baseline',
    '/onboarding/vibe',
  ];
  return steps[Math.min(step - 1, steps.length - 1)];
}