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
import readingTest01 from './reading-test-1.json';
import readingTest02 from './reading-test-2.json';
import readingTest03 from './reading-test-3.json';
import readingTest04 from './reading-test-4.json';
import readingTest05 from './reading-test-5.json';
import readingTest06 from './reading-test-6.json';
import readingTest07 from './reading-test-7.json';
import readingTest08 from './reading-test-8.json';
import readingTest09 from './reading-test-9.json';
import readingTest10 from './reading-test-10.json';
import readingTest11 from './reading-test-11.json';

const readingPracticeJson = [
  practice01,
  practice02,
  practice03,
  practice04,
  practice05,
  fullExam,
  readingTest01,
  readingTest02,
  readingTest03,
  readingTest04,
  readingTest05,
  readingTest06,
  readingTest07,
  readingTest08,
  readingTest09,
  readingTest10,
  readingTest11,
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
