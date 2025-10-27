export type ReadingQuestion = {
  id: string;
  type: string;
  prompt?: string;
  answer: string;
  options?: string[];
};

export type ReadingPassage = {
  id: string;
  title: string;
  text: string;
  questions: ReadingQuestion[];
};

export type ReadingPaper = {
  id: string;
  title: string;
  durationSec?: number;
  passages: ReadingPassage[];
};

import practice01 from './reading-practice-01.json';
import practice02 from './reading-practice-02.json';
import practice03 from './reading-practice-03.json';
import practice04 from './reading-practice-04.json';
import practice05 from './reading-practice-05.json';
import fullExam from './full-exam-001.json';

const readingPracticeJson = [
  practice01,
  practice02,
  practice03,
  practice04,
  practice05,
  fullExam,
] satisfies ReadingPaper[];

export const readingPracticePapers: ReadingPaper[] = readingPracticeJson;

export type ReadingPracticeMeta = {
  id: string;
  title: string;
  durationSec: number;
  passages: number;
  totalQuestions: number;
};

const DEFAULT_DURATION_SEC = 60 * 60;

export const readingPracticeList: ReadingPracticeMeta[] = readingPracticePapers.map((paper) => ({
  id: paper.id,
  title: paper.title ?? paper.id,
  durationSec: paper.durationSec ?? DEFAULT_DURATION_SEC,
  passages: paper.passages?.length ?? 0,
  totalQuestions:
    paper.passages?.reduce(
      (sum, passage) => sum + (passage.questions?.length ?? 0),
      0,
    ) ?? 0,
}));
