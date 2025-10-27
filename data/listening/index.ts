import fullExam from './full-exam-001.json';
import practice01 from './listening-practice-01.json';
import practice02 from './listening-practice-02.json';
import practice03 from './listening-practice-03.json';
import practice04 from './listening-practice-04.json';
import practice05 from './listening-practice-05.json';

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
    0
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
  fullExam,
] satisfies ListeningPaper[];

export const listeningPracticePapers: ListeningPaper[] = listeningPracticeJson.map((paper) => ({
  ...paper,
  durationSec: typeof paper.durationSec === 'number' && Number.isFinite(paper.durationSec)
    ? paper.durationSec
    : DEFAULT_DURATION_SEC,
}));

export const listeningPracticeList: ListeningPracticeMeta[] = listeningPracticePapers.map((paper) =>
  buildListeningPracticeMeta(paper)
);
