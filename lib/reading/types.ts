// Type definitions for the Reading module.

// A ReadingTest represents a full IELTS-style Reading mock. Each test
// consists of multiple passages with a fixed number of questions and a
// recommended duration in seconds. The `examType` indicates whether the
// test is for the Academic module or General Training. Most fields map
// directly to columns in the `reading_tests` table.
export type ReadingTest = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  examType: string | null;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

// A ReadingPassage belongs to a ReadingTest and holds the text content
// for one passage. Passages are ordered within a test via the
// `passageOrder` field. The `content` should contain the full body of
// the passage, and `wordCount` is a precomputed count of the words
// (used for speed drills).
export type ReadingPassage = {
  id: string;
  testId: string;
  passageOrder: number;
  title: string | null;
  subtitle: string | null;
  content: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
};

// ReadingQuestion describes an individual question associated with a
// particular passage in a test. The `questionTypeId` denotes what kind
// of question it is (e.g. TFNG, gap-fill, multiple choice, matching). The
// `correctAnswer` can be a string, array of strings, or an object
// depending on the question type. Any additional constraints (such as
// options) live in `constraintsJson`. Tags allow grouping questions by
// theme or difficulty.
export type ReadingQuestion = {
  id: string;
  testId: string;
  passageId: string | null;
  questionOrder: number;
  questionTypeId: string;
  prompt: string;
  instruction: string | null;
  correctAnswer: string | string[] | Record<string, unknown> | null;
  constraintsJson: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// ReadingAttemptSummary captures a short summary of a past attempt. This
// interface is used for analytics and band prediction. `rawScore` and
// `totalQuestions` together indicate how many correct answers were
// achieved out of how many attempted, while `bandScore` is the computed
// IELTS band (if available) for that attempt. `createdAt` records when
// the attempt happened.
export interface ReadingAttemptSummary {
  rawScore: number;
  totalQuestions: number;
  bandScore: number | null;
  createdAt: string;
}
