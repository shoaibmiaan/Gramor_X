export type SpeakingAttemptParts = Record<'p1' | 'p2' | 'p3', number | null>;

export type SpeakingAttemptSummary = {
  id: string;
  created_at: string;
  overall: number | null;
  parts: SpeakingAttemptParts;
};

export type SpeakingPracticeHubProps = {
  attempts: SpeakingAttemptSummary[];
  attemptsToday: number;
  limit: number;
  signedIn: boolean;
};
