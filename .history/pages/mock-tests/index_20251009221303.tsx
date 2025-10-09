// data/mock-tests.ts
export type MockTest = {
  slug: string;
  title: string;
  section: 'Listening' | 'Reading' | 'Writing' | 'Speaking' | 'All';
  description: string;
  href: string;
  tier?: 'Free' | 'Premium';
};

export const mockTests: readonly MockTest[] = [
  {
    slug: 'listening-practice',
    title: 'Listening — Practice Sets',
    section: 'Listening',
    description: 'Timed Parts 1–4 with auto-marking and transcripts.',
    href: '/mock-tests/listening',
    tier: 'Free',
  },
  {
    slug: 'reading-academic',
    title: 'Reading — Academic',
    section: 'Reading',
    description: 'Passages with all question types and AI explanations.',
    href: '/mock-tests/reading',
    tier: 'Free',
  },
  {
    slug: 'writing-tasks',
    title: 'Writing — Tasks 1 & 2',
    section: 'Writing',
    description: 'AI band breakdown, highlights, and model answers.',
    href: '/mock-tests/writing',
    tier: 'Free',
  },
  {
    slug: 'speaking-simulator',
    title: 'Speaking — Simulator',
    section: 'Speaking',
    description: 'Record, auto-transcribe, and get instant feedback.',
    href: '/mock-tests/speaking',
    tier: 'Free',
  },
  {
    slug: 'full-mock',
    title: 'Full Mock Exam',
    section: 'All',
    description: 'Full 4-module exam flow with focus mode and review.',
    href: '/mock-tests/full',
    tier: 'Premium',
  },
] as const;
