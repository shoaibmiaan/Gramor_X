import type { WordOfDay } from '@/lib/vocabulary/today';

export const sampleWord: WordOfDay = {
  id: '11111111-1111-1111-1111-111111111111',
  headword: 'Eloquent',
  definition: 'Fluent or persuasive in speaking or writing.',
  meaning: 'Able to express ideas clearly and effectively.',
  example: 'She delivered an eloquent speech that captivated the judges.',
  exampleTranslation: null,
  partOfSpeech: 'adjective',
  register: 'formal',
  cefr: 'C1',
  ipa: '/ˈɛləkwənt/',
  audioUrl: null,
  synonyms: ['articulate', 'expressive', 'persuasive'],
  topics: ['Speaking', 'Writing'],
};

export const rewardAttempts = {
  meaning: { xpAwarded: 12, correct: true, attempts: 1 },
  sentence: { xpAwarded: 18, score: 3 },
  synonyms: { xpAwarded: 9, score: 82, accuracy: 0.78 },
};
