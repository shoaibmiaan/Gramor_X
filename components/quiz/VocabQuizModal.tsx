import React from 'react';

import { Modal } from '@/components/design-system/Modal';
import { Button } from '@/components/design-system/Button';
import useVocabQuiz from '@/hooks/useVocabQuiz';
import { QuizTimer } from '@/components/quiz/QuizTimer';
import { QuizProgressBar } from '@/components/quiz/QuizProgressBar';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';
import { QuizResultSummary } from '@/components/quiz/QuizResultSummary';

export function VocabQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const quiz = useVocabQuiz();
  const { session, loading, resetQuiz, startQuiz } = quiz;

  React.useEffect(() => {
    if (open && !session && !loading) {
      void startQuiz();
    }
    if (!open) {
      resetQuiz();
    }
  }, [loading, open, resetQuiz, session, startQuiz]);

  return (
    <Modal open={open} onClose={onClose} title="60-second IELTS vocab quiz" size="lg">
      <div className="space-y-4">
        {!quiz.result && (
          <div className="flex items-center justify-between gap-3">
            <QuizProgressBar current={quiz.currentQuestion + 1} total={quiz.totalQuestions || 1} />
            <QuizTimer seconds={quiz.remainingSeconds} />
          </div>
        )}

        {quiz.loading ? <p className="text-sm text-muted-foreground">Preparing AI quiz session…</p> : null}
        {quiz.error ? <p role="alert" className="text-sm text-danger">{quiz.error}</p> : null}

        {quiz.current && !quiz.result ? (
          <QuizQuestionCard question={quiz.current} onSelect={quiz.answerQuestion} disabled={quiz.submitting} />
        ) : null}

        {quiz.result ? <QuizResultSummary result={quiz.result} /> : null}

        <div className="flex justify-end gap-2">
          {!quiz.result && (
            <Button type="button" variant="secondary" onClick={() => void quiz.submitQuiz()} loading={quiz.submitting}>
              Submit now
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export default VocabQuizModal;
