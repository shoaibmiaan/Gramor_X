import type { ReadingClozeBlank, ReadingClozeSegment } from '@/types/review';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReadingSegments(
  template: string,
  tokens: Array<{ id: string; token: string; placeholder: string }>,
): ReadingClozeSegment[] {
  const segments: ReadingClozeSegment[] = [];
  let cursor = 0;

  tokens.forEach((entry) => {
    const index = template.indexOf(entry.token, cursor);
    if (index === -1) {
      return;
    }

    const slice = template.slice(cursor, index);
    if (slice) {
      segments.push({ type: 'text', content: slice });
    }

    segments.push({ type: 'blank', id: entry.id, placeholder: entry.placeholder });
    cursor = index + entry.token.length;
  });

  if (cursor < template.length) {
    segments.push({ type: 'text', content: template.slice(cursor) });
  }

  return segments;
}

function selectTopic(word: any) {
  if (!word) return null;
  const topics = Array.isArray(word.ielts_topics) ? word.ielts_topics : [];
  return topics.length > 0 ? topics[0] : null;
}

export interface ReadingMiniClozePayload {
  passage: string;
  segments: ReadingClozeSegment[];
  blanks: ReadingClozeBlank[];
  headword: string;
  topic: string;
  definition: string;
  suggestedCollocations: string[];
}

export function buildReadingMiniCloze(options: {
  word: any | undefined;
  collocations: any[];
  examples: any[];
}): ReadingMiniClozePayload | null {
  const { word, collocations, examples } = options;
  if (!word) return null;

  const headword = word.headword ?? '';
  const topic = selectTopic(word) ?? 'IELTS Task 2';
  const definition = word.definition ?? 'describe the idea clearly';
  const collocationChunks = collocations
    .map((row) => row?.chunk)
    .filter((chunk: any): chunk is string => typeof chunk === 'string');

  const suggestedCollocations = collocationChunks.slice(0, 3);
  while (suggestedCollocations.length < 3) {
    suggestedCollocations.push(`use ${headword}`);
  }

  const readingCollocationOne = suggestedCollocations[0];
  const readingCollocationTwo = suggestedCollocations[1] ?? suggestedCollocations[0];
  const exampleSentence = examples[1]?.text ?? `This ensures you can ${readingCollocationTwo} during the exam.`;

  const blankTokens = [
    { id: 'blank-headword', token: '__BLANK_HEADWORD__', placeholder: 'Blank 1', answer: headword, label: 'Headword' },
    {
      id: 'blank-collocation-1',
      token: '__BLANK_COLLOC_ONE__',
      placeholder: 'Blank 2',
      answer: readingCollocationOne,
      label: 'Collocation 1',
    },
    {
      id: 'blank-collocation-2',
      token: '__BLANK_COLLOC_TWO__',
      placeholder: 'Blank 3',
      answer: readingCollocationTwo,
      label: 'Collocation 2',
    },
  ];

  const readingTemplate = [
    `IELTS passages about ${topic} often rely on ${blankTokens[0].token} to ${definition}.`,
    `Writers sound fluent when they use ${blankTokens[1].token} in introductions.`,
    `Link your ideas by pairing ${blankTokens[2].token}. ${exampleSentence}`,
  ].join(' ');

  const readingSegments = buildReadingSegments(
    readingTemplate,
    blankTokens.map((token) => ({ id: token.id, token: token.token, placeholder: token.placeholder })),
  );
  const readingPassage = blankTokens.reduce(
    (acc, token) => acc.replace(new RegExp(escapeRegExp(token.token), 'g'), '_____'),
    readingTemplate,
  );

  return {
    passage: readingPassage,
    segments: readingSegments,
    blanks: blankTokens.map((token) => ({ id: token.id, label: token.label, answer: token.answer })),
    headword,
    topic,
    definition,
    suggestedCollocations,
  };
}
