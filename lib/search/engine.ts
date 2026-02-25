// lib/search/engine.ts
import { courses } from '@/data/courses';
import wordBank from '@/data/word-bank.json';

import type { SearchResult } from './types';

type ModuleEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
  boost?: number;
  type?: SearchResult['type'];
};

type WordBankEntry = {
  word: string;
  meaning: string;
  example?: string;
  synonyms?: string[];
  frequency?: number;
};

type Candidate = SearchResult & { score: number };

const modules: ModuleEntry[] = [
  {
    id: 'module-reading',
    title: 'IELTS Reading Lab',
    description: 'Skim, scan, and analyse band-level passages with guided explanations.',
    href: '/reading',
    keywords: ['reading', 'passage', 'true or false', 'matching headings', 'ielts reading'],
    boost: 9,
    type: 'module',
  },
  {
    id: 'module-listening',
    title: 'IELTS Listening Studio',
    description: 'Practice all four sections with instant transcripts and smart review notes.',
    href: '/listening',
    keywords: ['listening', 'audio', 'fill in the blanks', 'ielts listening'],
    boost: 8,
    type: 'module',
  },
  {
    id: 'module-writing',
    title: 'Writing Mock Workbench',
    description: 'Task 1 and Task 2 mock tests with AI scoring, annotations, and feedback history.',
    href: '/writing',
    keywords: ['writing', 'essay', 'task 2', 'task 1', 'ielts writing'],
    boost: 10,
    type: 'module',
  },
  {
    id: 'module-speaking',
    title: 'Speaking Simulator',
    description: 'Simulate live examiner interviews, record answers, and review transcripts.',
    href: '/speaking',
    keywords: ['speaking', 'mock interview', 'pronunciation', 'ielts speaking'],
    boost: 7,
    type: 'module',
  },
  {
    id: 'module-mock-tests',
    title: 'Full Mock Tests',
    description: 'Timed, auto-saving IELTS simulations across listening, reading, and writing.',
    href: '/mock',
    keywords: ['mock tests', 'practice test', 'exam simulator', 'timed'],
    boost: 8,
    type: 'module',
  },
  {
    id: 'module-study-plan',
    title: 'Study Plan Dashboard',
    description: 'Personalised weekly plans that adapt as you complete lessons and drills.',
    href: '/study-plan',
    keywords: ['plan', 'planner', 'schedule', 'roadmap'],
    boost: 6,
    type: 'resource',
  },
  {
    id: 'module-progress',
    title: 'Progress Analytics',
    description: 'Visualise band growth, streaks, and challenge milestones in one place.',
    href: '/progress',
    keywords: ['analytics', 'progress', 'dashboard', 'reports'],
    boost: 6,
    type: 'resource',
  },
  {
    id: 'module-vocabulary',
    title: 'Vocabulary Hub',
    description: 'Curated word lists, quizzes, and review drills to boost lexical resource.',
    href: '/vocabulary',
    keywords: ['vocabulary', 'lexis', 'word list', 'synonyms'],
    boost: 7,
    type: 'module',
  },
  {
    id: 'module-ai-coach',
    title: 'AI Coach',
    description: 'Chat with an IELTS-focused AI coach for instant clarifications and drills.',
    href: '/ai',
    keywords: ['ai', 'coach', 'assistant', 'chatbot'],
    boost: 5,
    type: 'resource',
  },
];

const vocabularyEntries = wordBank as WordBankEntry[];

function keywordScore(keyword: string, query: string): number {
  const k = keyword.toLowerCase();
  const q = query.toLowerCase();
  if (k === q) return 6;
  if (k.startsWith(q)) return 4;
  if (k.includes(q)) return 2;
  return 0;
}

function textScore(text: string | undefined, query: string): number {
  if (!text) return 0;
  const source = text.toLowerCase();
  const q = query.toLowerCase();
  if (source === q) return 10;
  if (source.startsWith(q)) return 6;
  if (source.includes(q)) return 3;
  return 0;
}

function mapModuleToCandidate(entry: ModuleEntry, query: string, hasQuery: boolean): Candidate {
  const base = entry.boost ?? 4;
  let score = base;
  if (hasQuery) {
    const titleScore = textScore(entry.title, query) * 2;
    const descriptionScore = textScore(entry.description, query);
    const keywordMatches = entry.keywords.reduce((acc, keyword) => acc + keywordScore(keyword, query), 0);
    const queryScore = titleScore + descriptionScore + keywordMatches;
    score = queryScore > 0 ? queryScore + base : 0;
  }

  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    href: entry.href,
    type: entry.type ?? 'module',
    score,
  };
}

function moduleResults(query: string, hasQuery: boolean): Candidate[] {
  return modules
    .map((module) => mapModuleToCandidate(module, query, hasQuery))
    .filter((candidate) => (hasQuery ? candidate.score > 0 : true));
}

function courseResults(query: string, hasQuery: boolean): Candidate[] {
  return courses
    .map((course) => {
      const baseScore = hasQuery ? 0 : 3;
      let score = baseScore;
      if (hasQuery) {
        score += textScore(course.title, query) * 2;
        score += textScore(course.description, query);
        score += keywordScore(course.skill, query);
      }

      return {
        id: `course-${course.slug}`,
        title: course.title,
        description: course.description,
        href: `/learning/${course.slug}`,
        type: 'course' as const,
        snippet: `Skill focus: ${course.skill.charAt(0).toUpperCase()}${course.skill.slice(1)}`,
        score,
      } satisfies Candidate;
    })
    .filter((candidate) => (hasQuery ? candidate.score > 0 : true));
}

function vocabularyResults(query: string, limit = 6): Candidate[] {
  const matches: Candidate[] = [];
  const q = query.toLowerCase();

  for (const entry of vocabularyEntries) {
    const word = entry.word.toLowerCase();
    let score = 0;
    if (word === q) score += 18;
    else if (word.startsWith(q)) score += 12;
    else if (word.includes(q)) score += 6;

    if (entry.meaning?.toLowerCase().includes(q)) score += 4;
    if (entry.synonyms?.some((syn) => syn.toLowerCase().includes(q))) score += 2;
    if (entry.frequency) score += Math.min(entry.frequency, 5);

    if (score <= 0) continue;

    matches.push({
      id: `vocab-${word}`,
      title: entry.word,
      description: entry.meaning,
      href: `/vocabulary/${encodeURIComponent(entry.word.toLowerCase())}`,
      type: 'vocabulary',
      snippet: entry.example,
      score,
    });
  }

  matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return matches.slice(0, limit);
}

function dedupe(results: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const item of results) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export function searchContent(query: string, limit = 20): SearchResult[] {
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const candidates: Candidate[] = [];
  candidates.push(...moduleResults(trimmed, hasQuery));
  candidates.push(...courseResults(trimmed, hasQuery));

  if (hasQuery) {
    candidates.push(...vocabularyResults(trimmed));
  }

  const sorted = dedupe(candidates).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return sorted.slice(0, limit).map(({ score: _score, ...result }) => result);
}

