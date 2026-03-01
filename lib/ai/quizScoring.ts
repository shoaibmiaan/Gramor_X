import type { QuizAnswer, QuizScoreBreakdown, VocabQuizQuestion, VocabDifficulty } from '@/lib/services/vocabQuizService';

export type AiQuizScoringInput = {
  score: QuizScoreBreakdown;
  questions: VocabQuizQuestion[];
  answers: QuizAnswer[];
};

export type WordStrengthUpdate = {
  wordId: string;
  attempts: number;
  correctCount: number;
  lastSeen: string;
  strengthScore: number;
  responseTimeMs: number;
  difficulty: VocabDifficulty;
};

export type AiQuizScoringResult = {
  estimatedBandImpact: { before: number; after: number; delta: number };
  strengths: string[];
  weaknesses: string[];
  recommendedNextWords: string[];
  suggestedDifficulty: 'easy' | 'medium' | 'hard';
  wordStrengthUpdates: WordStrengthUpdate[];
};

const difficultyFactor: Record<VocabDifficulty, number> = {
  easy: 0.9,
  medium: 1.1,
  hard: 1.35,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreWord(params: {
  correct: boolean;
  responseTimeMs: number;
  difficulty: VocabDifficulty;
}) {
  const accuracyPoints = params.correct ? 65 : 20;
  const speedFactor = clamp(1 - params.responseTimeMs / 20_000, 0.45, 1.05);
  const weighted = accuracyPoints * speedFactor * difficultyFactor[params.difficulty];
  return Math.round(clamp(weighted, 5, 98));
}

export function evaluateQuizWithAI(input: AiQuizScoringInput): AiQuizScoringResult {
  const answerById = new Map(input.answers.map((answer) => [answer.questionId, answer]));

  const weak: string[] = [];
  const strong: string[] = [];

  const wordStrengthUpdates: WordStrengthUpdate[] = input.questions.map((question) => {
    const answer = answerById.get(question.id);
    const correct = Boolean(answer && answer.selectedIndex === question.correctIndex);
    const responseTimeMs = answer?.responseTimeMs ?? 60_000;
    const strengthScore = scoreWord({
      correct,
      responseTimeMs,
      difficulty: question.difficulty,
    });

    if (correct && strengthScore >= 65) {
      strong.push(question.options[question.correctIndex]);
    } else {
      weak.push(question.options[question.correctIndex]);
    }

    return {
      wordId: question.wordId,
      attempts: 1,
      correctCount: correct ? 1 : 0,
      lastSeen: new Date().toISOString(),
      strengthScore,
      difficulty: question.difficulty,
      responseTimeMs,
    };
  });

  const baseBand = 5.5 + input.score.weightedAccuracy / 100;
  const speedAdjust = input.score.avgResponseMs < 5_000 ? 0.2 : input.score.avgResponseMs > 9_000 ? -0.2 : 0;
  const nextBand = clamp(Number((baseBand + speedAdjust).toFixed(1)), 4.5, 8.5);

  const suggestedDifficulty = nextBand >= 7 ? 'hard' : nextBand >= 6 ? 'medium' : 'easy';

  return {
    estimatedBandImpact: {
      before: Number(baseBand.toFixed(1)),
      after: nextBand,
      delta: Number((nextBand - baseBand).toFixed(2)),
    },
    strengths: strong.slice(0, 5),
    weaknesses: weak.slice(0, 5),
    recommendedNextWords: [...weak, ...strong].slice(0, 6),
    suggestedDifficulty,
    wordStrengthUpdates,
  };
}
