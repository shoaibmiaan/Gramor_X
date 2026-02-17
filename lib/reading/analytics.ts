// Analytics helpers for the Reading module.

// Inputs for computing accuracy by question type. Each question must
// include its identifier and the type of question (e.g. TFNG, gap, match).
export type AnalyticsQuestionInput = {
  id: string;
  questionTypeId: string;
};

// Inputs for answers when computing accuracy. Each answer references
// a question ID and whether the user's answer was correct. `correctAnswer`
// and `selectedAnswer` are included for completeness but unused here.
export type AnalyticsAnswerInput = {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: any;
  selectedAnswer: any;
};

// Output shape describing accuracy for a given question type.
export type QuestionTypeAccuracy = {
  questionTypeId: string;
  correct: number;
  total: number;
  // A fraction between 0 and 1 representing correct/total.
  accuracy: number;
};

/**
 * computeAccuracyByQuestionType groups questions by their type and tallies
 * the number of correct answers versus total questions. It returns an
 * array of objects, one per question type, containing the raw counts and
 * the accuracy fraction. If a question appears in the `questions` input
 * but no corresponding answer exists, it is considered unanswered (and
 * therefore incorrect).
 */
export function computeAccuracyByQuestionType(
  questions: AnalyticsQuestionInput[],
  answers: AnalyticsAnswerInput[],
): QuestionTypeAccuracy[] {
  // Build a lookup for answers keyed by question ID.
  const answerMap = new Map<string, AnalyticsAnswerInput>();
  answers.forEach((ans) => {
    answerMap.set(ans.questionId, ans);
  });
  // Tally counts per question type.
  const tally: Record<string, { correct: number; total: number }> = {};
  questions.forEach((q) => {
    if (!tally[q.questionTypeId]) {
      tally[q.questionTypeId] = { correct: 0, total: 0 };
    }
    tally[q.questionTypeId].total += 1;
    const ans = answerMap.get(q.id);
    if (ans && ans.isCorrect) {
      tally[q.questionTypeId].correct += 1;
    }
  });
  return Object.entries(tally).map(([questionTypeId, { correct, total }]) => {
    const accuracy = total > 0 ? correct / total : 0;
    return { questionTypeId, correct, total, accuracy };
  });
}
