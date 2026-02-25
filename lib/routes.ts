// lib/routes.ts

export const routes = {
  home: () => '/',
  dashboard: () => '/dashboard',

  // Onboarding
  onboarding: {
    root: () => '/onboarding',
  },

  // Mocks
  listeningMock: (id: string) => `/mock/listening/${id}`,
  readingMock: (id: string) => `/mock/reading/${id}`,
  writingMock: (testId: string) => `/writing/mock/${testId}/start`,
  speakingMock: (id: string) => `/mock/speaking/${id}`,

  // Reviews
  listeningReview: (id: string) => `/review/listening/${id}`,
  readingReview: (id: string) => `/review/reading/${id}`,
  writingReview: (id: string) => `/review/writing/${id}`,
  speakingReview: (id: string) => `/review/speaking/${id}`,

  // Modules pickers
  listeningIndex: () => '/listening',
  readingIndex: () => '/reading',
  writingIndex: () => '/writing',
  speakingSimulator: () => '/speaking/simulator',

  // Paywall/Billing (canonical)
  pricing: () => '/pricing',
  checkout: (plan?: string) =>
    plan ? `/checkout?plan=${encodeURIComponent(plan)}` : '/checkout',
  billing: () => '/settings/billing',

  /** @deprecated Use routes.billing() instead */
  settingsBilling: () => '/settings/billing',

  // Platform
  studyPlan: () => '/study-plan',
  progress: () => '/progress',

  // Optional AI hub
  ai: () => '/ai',
} as const;

export type RouteBuilder = typeof routes;
