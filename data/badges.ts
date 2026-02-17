export type Badge = {
  id: string;
  label: string;
  icon: string;
  description?: string;
};

export const streaks: Badge[] = [
  { id: 'streak-7', label: '7-Day Streak', icon: '🔥', description: 'Maintain a 7-day study streak.' },
  { id: 'streak-30', label: '30-Day Streak', icon: '🔥', description: 'Keep studying for 30 days straight.' },
  { id: 'streak-100', label: '100-Day Streak', icon: '🔥', description: 'Hit an incredible 100-day streak!' },
];

export const milestones: Badge[] = [
  { id: 'lesson-1', label: 'First Lesson', icon: '📘', description: 'Complete your first lesson.' },
  { id: 'lesson-10', label: '10 Lessons', icon: '📗', description: 'Finish 10 lessons.' },
  { id: 'lesson-100', label: '100 Lessons', icon: '📕', description: 'Finish 100 lessons.' },
  {
    id: 'first-100-mastered',
    label: 'First 100 Mastered',
    icon: '🎯',
    description: 'Master 100 vocabulary or collocations across challenges.',
  },
  {
    id: 'collocation-crusher',
    label: 'Collocation Crusher',
    icon: '🧠',
    description: 'Crush 250 collocations in challenge mode.',
  },
  {
    id: 'pronunciation-50',
    label: 'Pronunciation 50',
    icon: '🎤',
    description: 'Complete 50 pronunciation practice attempts.',
  },
];

export const community: Badge[] = [
  { id: 'comment-1', label: 'First Comment', icon: '💬', description: 'Leave your first comment.' },
  { id: 'helper', label: 'Helpful Member', icon: '🙌', description: 'Receive 5 upvotes from peers.' },
  { id: 'top-contributor', label: 'Top Contributor', icon: '🏆', description: 'Lead the community leaderboard.' },
];

export const badges = { streaks, milestones, community };
