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
  const questionTotal = sectionList.reduce((sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0), 0);

  return {
    id: paper.id,
    title: paper.title,
    durationSec: paper.durationSec,
    sections: sectionList.length,
    totalQuestions: questionTotal,
  };
};
