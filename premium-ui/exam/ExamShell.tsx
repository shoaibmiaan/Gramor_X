import * as React from 'react';

export type Props = {
  title: string;
  totalQuestions: number;
  currentQuestion: number;
  seconds?: number;
  onNavigate?: (q: number) => void;
  onTimeUp?: () => void;
  answerSheet?: React.ReactNode;
  children?: React.ReactNode;
};

export function ExamShell(props: Props) {
  return <div>{props.children}</div>;
}

export default ExamShell;
