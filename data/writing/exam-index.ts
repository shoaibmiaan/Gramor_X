import type { WritingPaper } from '@/components/writing/Editor';

export type WritingExamSummary = {
  id: string;
  title: string;
  description: string;
  task1Type: 'Academic' | 'General Training';
  task1Focus: string;
  task2Focus: string;
  durationMinutes: number;
  tags: string[];
  register: 'Formal' | 'Semi-formal' | 'Informal' | 'Neutral';
};

export const writingExamSummaries: WritingExamSummary[] = [
  {
    id: 'ielts-writing-full-001',
    title: 'Academic Set — Urban Futures',
    description: 'Charts on international student mobility paired with an essay about housing versus green space investment.',
    task1Type: 'Academic',
    task1Focus: 'Dual bar charts • overseas enrolments • 2010 vs 2020',
    task2Focus: 'Discuss priorities for city governments',
    durationMinutes: 60,
    tags: ['education', 'cities']
  },
  {
    id: 'ielts-writing-exam-01',
    title: 'Academic Set 1 — Energy & Remote Work',
    description: 'Line graph on renewable energy adoption paired with an essay about working from home.',
    task1Type: 'Academic',
    task1Focus: 'Line graph • four countries • 2000–2020',
    task2Focus: 'Discuss work–life balance impacts of remote work',
    durationMinutes: 60,
    tags: ['charts', 'environment', 'work'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-02',
    title: 'Academic Set 2 — Urban Transport & Higher Education',
    description: 'Transport usage table followed by a discussion on work versus university after school.',
    task1Type: 'Academic',
    task1Focus: 'Table • commuting habits • 3 years',
    task2Focus: 'Evaluate starting work compared with continuing study',
    durationMinutes: 60,
    tags: ['transport', 'education'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-03',
    title: 'Academic Set 3 — Recycling & Gap Years',
    description: 'Process diagram on recycling plastic bottles and an essay exploring gap years.',
    task1Type: 'Academic',
    task1Focus: 'Process diagram • recycling stages',
    task2Focus: 'Analyse pros and cons of taking a gap year',
    durationMinutes: 60,
    tags: ['process', 'education', 'environment'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-04',
    title: 'Academic Set 4 — International Students & Public Funding',
    description: 'Bar chart of overseas enrolments with an essay on science versus arts funding.',
    task1Type: 'Academic',
    task1Focus: 'Bar chart • university enrolments • 5 countries',
    task2Focus: 'Debate government investment priorities',
    durationMinutes: 60,
    tags: ['education', 'finance'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-05',
    title: 'Academic Set 5 — Town Development & Online Shopping',
    description: 'Compare town maps from 1990 to today and discuss online shopping trends.',
    task1Type: 'Academic',
    task1Focus: 'Maps • town redevelopment',
    task2Focus: 'Assess advantages and drawbacks of e-commerce',
    durationMinutes: 60,
    tags: ['maps', 'technology'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-06',
    title: 'General Training Set 1 — Lost Luggage & Athlete Salaries',
    description: 'Formal complaint letter followed by an essay on professional athletes’ pay.',
    task1Type: 'General Training',
    task1Focus: 'Formal letter • airline complaint',
    task2Focus: 'Discuss whether elite athletes earn too much',
    durationMinutes: 60,
    tags: ['letters', 'sports'],
    register: 'Formal'
  },
  {
    id: 'ielts-writing-exam-07',
    title: 'Academic Set 6 — Energy Mix & Ageing Societies',
    description: 'Energy source pie charts paired with a problem/solution essay on ageing populations.',
    task1Type: 'Academic',
    task1Focus: 'Pie charts • electricity sources',
    task2Focus: 'Suggest solutions for ageing societies',
    durationMinutes: 60,
    tags: ['charts', 'society'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-08',
    title: 'General Training Set 2 — Noisy Neighbours & Libraries',
    description: 'Neighbour complaint letter plus an essay on the value of public libraries.',
    task1Type: 'General Training',
    task1Focus: 'Semi-formal letter • neighbourhood issue',
    task2Focus: 'Debate the role of public libraries',
    durationMinutes: 60,
    tags: ['letters', 'community'],
    register: 'Semi-formal'
  },
  {
    id: 'ielts-writing-exam-09',
    title: 'Academic Set 7 — Water Usage & Urbanisation',
    description: 'Water consumption table combined with an essay on urbanisation.',
    task1Type: 'Academic',
    task1Focus: 'Table • sectoral water use',
    task2Focus: 'Discuss urban migration advantages and drawbacks',
    durationMinutes: 60,
    tags: ['environment', 'cities'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-10',
    title: 'Academic Set 8 — Metro Extension & Arts Education',
    description: 'Commute time graph followed by an essay on arts in school curricula.',
    task1Type: 'Academic',
    task1Focus: 'Line graph • commute times • infrastructure change',
    task2Focus: 'Consider the importance of arts in education',
    durationMinutes: 60,
    tags: ['transport', 'education', 'arts'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-11',
    title: 'Academic Set 11 — Urban Cycling & Creative Funding',
    description: 'Cycling trend line graph with an opinion essay about public arts grants.',
    task1Type: 'Academic',
    task1Focus: 'Line graph • cycling journeys • 3 cities',
    task2Focus: 'Debate prioritising community art programmes',
    durationMinutes: 60,
    tags: ['charts', 'arts', 'cities'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-12',
    title: 'General Training Set 12 — Community Centre & Flexible Hours',
    description: 'Community hall request letter paired with an essay on flexible schedules.',
    task1Type: 'General Training',
    task1Focus: 'Semi-formal letter • facilities request',
    task2Focus: 'Evaluate flexible working timetables',
    durationMinutes: 60,
    tags: ['letters', 'work', 'community'],
    register: 'Semi-formal'
  },
  {
    id: 'ielts-writing-exam-13',
    title: 'Academic Set 13 — Remote Clinics & Ageing Cities',
    description: 'Telehealth adoption bar chart and a problem-solution essay on ageing populations.',
    task1Type: 'Academic',
    task1Focus: 'Bar chart • telehealth uptake • 4 regions',
    task2Focus: 'Address challenges in ageing cities',
    durationMinutes: 60,
    tags: ['health', 'charts', 'society'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-14',
    title: 'Academic Set 14 — Smart Homes & Youth Engagement',
    description: 'Energy management process diagram with an essay on youth councils.',
    task1Type: 'Academic',
    task1Focus: 'Process diagram • smart home energy system',
    task2Focus: 'Argue for or against youth policy councils',
    durationMinutes: 60,
    tags: ['process', 'technology', 'civics'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-15',
    title: 'General Training Set 15 — Fitness Programme & Social Media',
    description: 'Informal colleague letter followed by an essay on social media breaks.',
    task1Type: 'General Training',
    task1Focus: 'Informal letter • workplace challenge invitation',
    task2Focus: 'Discuss merits of social media breaks',
    durationMinutes: 60,
    tags: ['letters', 'health', 'technology'],
    register: 'Informal'
  },
  {
    id: 'ielts-writing-exam-16',
    title: 'Academic Set 16 — Remote Collaboration & Coworking',
    description: 'Bar chart on telecommuting paired with an essay about funding coworking spaces.',
    task1Type: 'Academic',
    task1Focus: 'Bar chart • remote work frequency • 2015–2022',
    task2Focus: 'Evaluate company support for coworking memberships',
    durationMinutes: 60,
    tags: ['work', 'technology'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-17',
    title: 'General Training Set 17 — Community Garden & Digital Payments',
    description: 'Semi-formal garden proposal letter with an essay debating a cashless society.',
    task1Type: 'General Training',
    task1Focus: 'Semi-formal letter • residents’ association proposal',
    task2Focus: 'Discuss pros and cons of a cashless economy',
    durationMinutes: 60,
    tags: ['letters', 'community', 'technology'],
    register: 'Semi-formal'
  },
  {
    id: 'ielts-writing-exam-18',
    title: 'Academic Set 18 — Streaming Habits & Cultural Heritage',
    description: 'Line graph on music streaming followed by a problem-solution essay on traditional arts.',
    task1Type: 'Academic',
    task1Focus: 'Line graph • music subscribers • 2014–2023',
    task2Focus: 'Address threats to cultural heritage',
    durationMinutes: 60,
    tags: ['charts', 'culture', 'technology'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-19',
    title: 'General Training Set 19 — Volunteer Fair & Four-day Weeks',
    description: 'Friendly invitation letter coupled with an essay on four-day work schedules.',
    task1Type: 'General Training',
    task1Focus: 'Informal letter • invite a friend to volunteer',
    task2Focus: 'Weigh advantages and drawbacks of shorter weeks',
    durationMinutes: 60,
    tags: ['letters', 'community', 'work'],
    register: 'Informal'
  },
  {
    id: 'ielts-writing-exam-20',
    title: 'Academic Set 20 — Urban Cycling Hubs & Public Health',
    description: 'Bike-share usage table paired with an essay on city health initiatives.',
    task1Type: 'Academic',
    task1Focus: 'Table • bike-share journeys • 2019 vs 2023',
    task2Focus: 'Examine effects of municipal health programmes',
    durationMinutes: 60,
    tags: ['transport', 'health', 'cities'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-21',
    title: 'General Training Set 21 — Language Club & Public Transport',
    description: 'Formal workplace letter and an essay on subsidised transport.',
    task1Type: 'General Training',
    task1Focus: 'Formal letter • propose a workplace language club',
    task2Focus: 'Argue for or against free public transport',
    durationMinutes: 60,
    tags: ['letters', 'work', 'transport'],
    register: 'Formal'
  },
  {
    id: 'ielts-writing-exam-22',
    title: 'Academic Set 22 — Household Energy Storage & Climate Action',
    description: 'Process diagram on home batteries paired with a climate responsibility essay.',
    task1Type: 'Academic',
    task1Focus: 'Process diagram • solar and battery system',
    task2Focus: 'Discuss individual vs institutional climate action',
    durationMinutes: 60,
    tags: ['process', 'environment', 'technology'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-23',
    title: 'General Training Set 23 — Library Workshop & Screen Time',
    description: 'Semi-formal library letter combined with an essay on children’s screen time.',
    task1Type: 'General Training',
    task1Focus: 'Semi-formal letter • request resources for a workshop',
    task2Focus: 'Debate managing children’s device use',
    durationMinutes: 60,
    tags: ['letters', 'education', 'family'],
    register: 'Semi-formal'
  },
  {
    id: 'ielts-writing-exam-24',
    title: 'Academic Set 24 — Apprenticeships & Innovation Funding',
    description: 'Apprenticeship completion chart followed by an essay on funding innovation.',
    task1Type: 'Academic',
    task1Focus: 'Bar chart • apprenticeship completion • 2016–2022',
    task2Focus: 'Compare funding for universities and start-ups',
    durationMinutes: 60,
    tags: ['education', 'economy', 'charts'],
    register: 'Neutral'
  },
  {
    id: 'ielts-writing-exam-25',
    title: 'General Training Set 25 — Fitness Class & Shared Workspaces',
    description: 'Neighbour invitation letter paired with an essay on shared offices for freelancers.',
    task1Type: 'General Training',
    task1Focus: 'Informal letter • invite neighbour to fitness class',
    task2Focus: 'Assess pros and cons of shared workspaces',
    durationMinutes: 60,
    tags: ['letters', 'health', 'work'],
    register: 'Informal'
  }
];

export type NormalizedWritingPaper = WritingPaper & {
  title?: string;
  description?: string;
  durationSec?: number;
};

export const normalizeWritingPaper = (raw: any): NormalizedWritingPaper => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid writing paper payload');
  }

  const base = raw as Record<string, any>;

  // Support legacy mock format where task prompts live at top level.
  if (!base.task1 && base.task1Prompt) {
    base.task1 = {
      title: base.title || 'Task 1',
      prompt: base.task1Prompt,
      minWords: base.minWordsTask1 ?? 150,
      maxTimeMinutes: base.maxTimeTask1 ?? 20,
      type: base.task1Type ?? 'academic'
    } satisfies WritingPaper['task1'];
  }
  if (!base.task2 && base.task2Prompt) {
    base.task2 = {
      title: base.title ? `${base.title} — Task 2` : 'Task 2',
      prompt: base.task2Prompt,
      minWords: base.minWordsTask2 ?? 250,
      maxTimeMinutes: base.maxTimeTask2 ?? 40
    } satisfies WritingPaper['task2'];
  }

  return base as NormalizedWritingPaper;
};

export const toMockPaper = (paper: NormalizedWritingPaper) => {
  const task1Prompt = paper.task1?.prompt ?? (paper as any).task1Prompt ?? '';
  const task2Prompt = paper.task2?.prompt ?? (paper as any).task2Prompt ?? '';
  return {
    id: paper.id,
    title: paper.title ?? 'Writing paper',
    task1Prompt,
    task2Prompt,
    minWordsTask1: paper.task1?.minWords ?? (paper as any).minWordsTask1 ?? 150,
    minWordsTask2: paper.task2?.minWords ?? (paper as any).minWordsTask2 ?? 250,
    durationSec: paper.durationSec ?? (paper as any).durationSec ?? 3600
  };
};

export const findExamSummary = (id?: string) =>
  id ? writingExamSummaries.find((item) => item.id === id) ?? null : null;
