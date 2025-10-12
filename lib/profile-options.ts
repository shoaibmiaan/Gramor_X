export const COUNTRIES = [
  'Pakistan',
  'India',
  'Bangladesh',
  'United Arab Emirates',
  'Saudi Arabia',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'New Zealand',
] as const;

export const LEVELS = [
  'Beginner',
  'Elementary',
  'Pre-Intermediate',
  'Intermediate',
  'Upper-Intermediate',
  'Advanced',
] as const;

export const TIME = ['1h/day', '2h/day', 'Flexible'] as const;

export const PREFS = ['Listening', 'Reading', 'Writing', 'Speaking'] as const;

export const TOPICS = [
  'Environment',
  'Education',
  'Technology',
  'Work',
  'Health',
  'Community',
  'Travel',
  'Arts & Culture',
  'Society',
  'Finance',
] as const;

export const DAILY_QUOTA_RANGE = { min: 2, max: 10 } as const;

export const WEAKNESSES = ['Listening', 'Reading', 'Writing', 'Speaking'] as const;

export const GOAL_REASONS = ['study_abroad', 'career', 'immigration', 'personal'] as const;

export const LEARNING_STYLES = ['visual', 'auditory', 'kinesthetic', 'reading_writing'] as const;