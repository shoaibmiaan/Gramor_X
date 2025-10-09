// data/mock-tests.ts
export type MockTest = {
  slug: string;
  title: string;
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking' | 'Full';
  description: string;
  href: string;
};

export const mockTests: readonly MockTest[] = [
  {
    slug: 'listening-practice',
    title: 'Listening — Practice Sets',
    skill: 'Listening',
    description: 'Timed Parts 1–4 with auto-marking and transcripts.',
    href: '/mock-tests/listening',
  },
  {
    slug: 'reading-academic',
    title: 'Reading — Academic',
    skill: 'Reading',
    description: 'Passages with all question types and AI explanations.',
    href: '/mock-tests/reading',
  },
  {
    slug: 'writing-tasks',
    title: 'Writing — Tasks 1 & 2',
    skill: 'Writing',
    description: 'AI band breakdown, highlights, and model answers.',
    href: '/mock-tests/writing',
  },
  {
    slug: 'speaking-simulator',
    title: 'Speaking — Simulator',
    skill: 'Speaking',
    description: 'Record, auto-transcribe, and get instant feedback.',
    href: '/mock-tests/speaking',
  },
  {
    slug: 'full-mock',
    title: 'Full Mock Exam',
    skill: 'Full',
    description: 'Full 4-module exam flow with focus mode and review.',
    href: '/mock-tests/full',
  },
] as const;
