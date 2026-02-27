import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user's complete profile data for review
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }

  // Format the data for display
  const reviewData = {
    target: {
      label: 'Target Band',
      value: profile.target_band,
      icon: '🎯'
    },
    examDate: {
      label: 'Exam Date',
      value: new Date(profile.exam_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      icon: '📅'
    },
    baselineScores: {
      label: 'Current Scores',
      value: profile.baseline_scores,
      icon: '📊'
    },
    weeklyHours: {
      label: 'Weekly Study Time',
      value: `${profile.weekly_availability} hours`,
      icon: '⏰'
    },
    learningStyle: {
      label: 'Learning Style',
      value: profile.learning_style,
      icon: profile.learning_style === 'video' ? '🎥' :
             profile.learning_style === 'tips' ? '💡' :
             profile.learning_style === 'practice' ? '✍️' : '🃏'
    },
    totalWeeks: {
      label: 'Study Duration',
      value: calculateWeeksUntilExam(profile.exam_date),
      icon: '📆'
    }
  };

  return res.status(200).json(reviewData);
}

function calculateWeeksUntilExam(examDate: string): string {
  const exam = new Date(examDate);
  const today = new Date();
  const diffTime = exam.getTime() - today.getTime();
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return `${diffWeeks} weeks`;
}