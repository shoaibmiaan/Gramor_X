import practice01 from './listening-practice-01.json';
import practice02 from './listening-practice-02.json';
import practice03 from './listening-practice-03.json';
import practice04 from './listening-practice-04.json';
import practice05 from './listening-practice-05.json';

import fullExam001 from './full-exam-001.json';
import fullExam002 from './full-exam-002.json';
import fullExam003 from './full-exam-003.json';
import fullExam004 from './full-exam-004.json';
import fullExam005 from './full-exam-005.json';
import fullExam006 from './full-exam-006.json';
import fullExam007 from './full-exam-007.json';
import fullExam008 from './full-exam-008.json';
import fullExam009 from './full-exam-009.json';
import fullExam010 from './full-exam-010.json';
import fullExam011 from './full-exam-011.json';

export type ListeningQuestion = {
  id: string;
  type: 'mcq' | 'gap' | 'map' | 'short';
  prompt: string;
  answer: string;
  options?: string[];
};

export type ListeningSection = {
  id: string;
  title: string;
  audioUrl?: string;
  questions: ListeningQuestion[];
};

export type ListeningPaper = {
  id: string;
  title: string;
  durationSec: number;
  transcript?: string;
  sections: ListeningSection[];
};

export type ListeningPracticeMeta = {
  id: string;
  title: string;
  durationSec: number;
  sections: number;
  totalQuestions: number;
};

export const buildListeningPracticeMeta = (paper: ListeningPaper): ListeningPracticeMeta => {
  const sectionList = Array.isArray(paper.sections) ? paper.sections : [];
  const questionTotal = sectionList.reduce(
    (sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0),
    0,
  );

  return {
    id: paper.id,
    title: paper.title,
    durationSec: paper.durationSec,
    sections: sectionList.length,
    totalQuestions: questionTotal,
  };
};

const DEFAULT_DURATION_SEC = 40 * 60;

const listeningPracticeJson = [
  practice01,
  practice02,
  practice03,
  practice04,
  practice05,
  // Full mock exams
  fullExam001,
  fullExam002,
  fullExam003,
  fullExam004,
  fullExam005,
  fullExam006,
  fullExam007,
  fullExam008,
  fullExam009,
  fullExam010,
  fullExam011,
] satisfies ListeningPaper[];

export const listeningPracticePapers: ListeningPaper[] = listeningPracticeJson.map((paper) => ({
  ...paper,
  durationSec:
    typeof paper.durationSec === 'number' && Number.isFinite(paper.durationSec)
      ? paper.durationSec
      : DEFAULT_DURATION_SEC,
}));

export const listeningPracticeList: ListeningPracticeMeta[] = listeningPracticePapers.map((paper) =>
  buildListeningPracticeMeta(paper),
);

export function getListeningPaperById(id: string): ListeningPaper | undefined {
  if (!id) return undefined;
  return listeningPracticePapers.find((paper) => paper.id === id || paper.title === id);
}
