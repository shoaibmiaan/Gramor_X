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

import practice01 from './listening-practice-01.json';
import practice02 from './listening-practice-02.json';
import practice03 from './listening-practice-03.json';
import practice04 from './listening-practice-04.json';
import practice05 from './listening-practice-05.json';

const listeningPracticeJson = [practice01, practice02, practice03, practice04, practice05] satisfies ListeningPaper[];

export const listeningPracticePapers: ListeningPaper[] = listeningPracticeJson;

export type ListeningPracticeMeta = {
  id: string;
  title: string;
  durationSec: number;
  sections: number;
  totalQuestions: number;
};

export const listeningPracticeList: ListeningPracticeMeta[] = listeningPracticePapers.map((paper) => ({
  id: paper.id,
  title: paper.title,
  durationSec: paper.durationSec,
  sections: paper.sections.length,
  totalQuestions: paper.sections.reduce((sum, section) => sum + section.questions.length, 0),
}));
