import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface WordBankEntry {
  word: string;
  meaning: string;
  frequency?: number;
}

interface TopicTemplate {
  key: string;
  label: string;
  contextNoun: string;
  scenario: string;
  collocationTemplates: {
    pattern: string;
    suffix: string;
    prefix?: string;
    note: string;
    exampleTemplate: string;
  }[];
  gapTemplate: string;
}

interface GeneratedWord {
  id: string;
  headword: string;
  definition: string;
  freq_rank: number | null;
  register: 'neutral';
  cefr: 'B1' | 'B2' | 'C1';
  ielts_topics: string[];
}

interface GeneratedCollocation {
  id: string;
  word_id: string;
  chunk: string;
  pattern: string;
  note: string;
}

interface GeneratedExample {
  id: string;
  word_id: string;
  text: string;
  source: 'crafted';
  is_gap_ready: boolean;
  ielts_topic: string;
}

const ROOT = path.resolve(__dirname, '..');
const WORD_BANK_PATH = path.join(ROOT, 'data', 'word-bank.json');
const OUTPUT_DIR = path.join(ROOT, 'data', 'generated');
const SQL_PATH = path.join(ROOT, 'supabase', 'migrations', '20251026_vocab_phase2_seed.sql');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function uuidFrom(value: string): string {
  const hash = crypto.createHash('sha1').update(value).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = hash.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

function normaliseWord(raw: string): string {
  return raw.trim().toLowerCase();
}

const topics: TopicTemplate[] = [
  {
    key: 'education',
    label: 'Education',
    contextNoun: 'curriculum',
    scenario: 'classroom discussions and policy essays',
    collocationTemplates: [
      {
        pattern: 'adjective+noun',
        prefix: 'comprehensive',
        suffix: 'programme',
        note: 'Useful when outlining structured study plans.',
        exampleTemplate: 'Many schools design a comprehensive {word} programme to boost critical thinking.',
      },
      {
        pattern: 'verb+noun',
        prefix: 'integrate',
        suffix: 'modules',
        note: 'Highlights modern curriculum planning.',
        exampleTemplate: 'Progressive educators integrate {word} modules into project-based learning.',
      },
    ],
    gapTemplate: 'In modern classrooms, ____ is essential for preparing learners for future careers.',
  },
  {
    key: 'environment',
    label: 'Environment',
    contextNoun: 'policy',
    scenario: 'essays about sustainability and climate action',
    collocationTemplates: [
      {
        pattern: 'noun+noun',
        prefix: 'climate-resilient',
        suffix: 'strategy',
        note: 'Great for Writing Task 2 responses on environmental planning.',
        exampleTemplate: 'Cities develop climate-resilient {word} strategies to withstand extreme weather.',
      },
      {
        pattern: 'verb+noun',
        prefix: 'mitigate',
        suffix: 'impact',
        note: 'Helps when describing cause-and-effect chains in sustainability reports.',
        exampleTemplate: 'Community programmes mitigate {word} impact through recycling drives.',
      },
    ],
    gapTemplate: 'To safeguard biodiversity, governments invest in ____ initiatives across protected areas.',
  },
  {
    key: 'technology',
    label: 'Technology',
    contextNoun: 'innovation',
    scenario: 'IELTS speaking answers about digital life',
    collocationTemplates: [
      {
        pattern: 'noun+noun',
        prefix: 'cutting-edge',
        suffix: 'platform',
        note: 'Fits descriptions of emerging tools in Part 3 discussions.',
        exampleTemplate: 'Start-ups launch cutting-edge {word} platforms to streamline services.',
      },
      {
        pattern: 'adjective+noun',
        prefix: 'interactive',
        suffix: 'solution',
        note: 'Ideal when evaluating apps or software.',
        exampleTemplate: 'Developers craft interactive {word} solutions for remote teams.',
      },
    ],
    gapTemplate: 'Learners rely on ____ tools to collaborate with classmates online.',
  },
  {
    key: 'health',
    label: 'Health',
    contextNoun: 'care',
    scenario: 'discussions on wellbeing and medical services',
    collocationTemplates: [
      {
        pattern: 'adjective+noun',
        prefix: 'preventive',
        suffix: 'programme',
        note: 'Supports arguments about public health campaigns.',
        exampleTemplate: 'Hospitals implement preventive {word} programmes to reduce chronic illness.',
      },
      {
        pattern: 'noun+noun',
        prefix: 'patient-centred',
        suffix: 'policy',
        note: 'Useful for essays on medical reforms.',
        exampleTemplate: 'Governments draft patient-centred {word} policies to improve access.',
      },
    ],
    gapTemplate: 'Rural clinics struggle without adequate ____ services for residents.',
  },
  {
    key: 'work',
    label: 'Work & Careers',
    contextNoun: 'development',
    scenario: 'career planning and productivity topics',
    collocationTemplates: [
      {
        pattern: 'verb+noun',
        prefix: 'accelerate',
        suffix: 'growth',
        note: 'Helps describe career advancement in Speaking Part 2.',
        exampleTemplate: 'Mentorship schemes accelerate {word} growth among graduates.',
      },
      {
        pattern: 'adjective+noun',
        prefix: 'transferable',
        suffix: 'skillset',
        note: 'Great for highlighting employability.',
        exampleTemplate: 'Internships build transferable {word} skillsets valued by employers.',
      },
    ],
    gapTemplate: 'To remain competitive, professionals constantly refine their ____ abilities.',
  },
  {
    key: 'culture',
    label: 'Culture & Society',
    contextNoun: 'heritage',
    scenario: 'speaking narratives about traditions',
    collocationTemplates: [
      {
        pattern: 'adjective+noun',
        prefix: 'vibrant',
        suffix: 'festival',
        note: 'Great for storytelling in Speaking Part 2.',
        exampleTemplate: 'Communities host vibrant {word} festivals to celebrate identity.',
      },
      {
        pattern: 'noun+noun',
        prefix: 'community',
        suffix: 'initiative',
        note: 'Supports writing about civic engagement.',
        exampleTemplate: 'Local leaders sponsor community {word} initiatives for inclusion.',
      },
    ],
    gapTemplate: 'Many cities promote ____ events to keep cultural traditions alive.',
  },
  {
    key: 'travel',
    label: 'Travel & Tourism',
    contextNoun: 'tourism',
    scenario: 'essays on global mobility',
    collocationTemplates: [
      {
        pattern: 'adjective+noun',
        prefix: 'sustainable',
        suffix: 'tour',
        note: 'Supports Writing Task 2 on eco-tourism.',
        exampleTemplate: 'Operators curate sustainable {word} tours for conscious travellers.',
      },
      {
        pattern: 'noun+noun',
        prefix: 'visitor',
        suffix: 'experience',
        note: 'Ideal for marketing-focused prompts.',
        exampleTemplate: 'Cities enhance visitor {word} experiences with local guides.',
      },
    ],
    gapTemplate: 'Destination marketers craft ____ packages to attract international guests.',
  },
  {
    key: 'economy',
    label: 'Economy',
    contextNoun: 'policy',
    scenario: 'macroeconomic reports and debates',
    collocationTemplates: [
      {
        pattern: 'noun+noun',
        prefix: 'fiscal',
        suffix: 'framework',
        note: 'Useful when explaining government budgets.',
        exampleTemplate: 'Analysts design fiscal {word} frameworks to manage growth.',
      },
      {
        pattern: 'verb+noun',
        prefix: 'stimulate',
        suffix: 'activity',
        note: 'Great for discussing recession recovery.',
        exampleTemplate: 'Authorities stimulate {word} activity through targeted subsidies.',
      },
    ],
    gapTemplate: 'During downturns, leaders implement ____ measures to protect jobs.',
  },
  {
    key: 'science',
    label: 'Science & Research',
    contextNoun: 'research',
    scenario: 'academic presentations and reports',
    collocationTemplates: [
      {
        pattern: 'verb+noun',
        prefix: 'advance',
        suffix: 'knowledge',
        note: 'Great for task 2 essays on innovation.',
        exampleTemplate: 'Laboratories advance {word} knowledge through collaborative trials.',
      },
      {
        pattern: 'adjective+noun',
        prefix: 'rigorous',
        suffix: 'methodology',
        note: 'Useful when evaluating experiments.',
        exampleTemplate: 'Universities adopt rigorous {word} methodologies to ensure accuracy.',
      },
    ],
    gapTemplate: 'Funding enables researchers to pursue ____ projects that push boundaries.',
  },
  {
    key: 'community',
    label: 'Community',
    contextNoun: 'development',
    scenario: 'social cohesion and volunteer work',
    collocationTemplates: [
      {
        pattern: 'noun+noun',
        prefix: 'grassroots',
        suffix: 'project',
        note: 'Highlights local engagement.',
        exampleTemplate: 'Volunteers launch grassroots {word} projects to support neighbours.',
      },
      {
        pattern: 'verb+noun',
        prefix: 'empower',
        suffix: 'leaders',
        note: 'Great for leadership themes.',
        exampleTemplate: 'Workshops empower {word} leaders to solve shared problems.',
      },
    ],
    gapTemplate: 'Neighbourhood councils rely on ____ volunteers to run initiatives.',
  },
];

const words: GeneratedWord[] = [];
const collocations: GeneratedCollocation[] = [];
const examples: GeneratedExample[] = [];

const wordBank: WordBankEntry[] = JSON.parse(fs.readFileSync(WORD_BANK_PATH, 'utf8'));

function pickCefr(index: number): 'B1' | 'B2' | 'C1' {
  if (index < 350) return 'B1';
  if (index < 700) return 'B2';
  return 'C1';
}

wordBank.forEach((entry, index) => {
  const headword = normaliseWord(entry.word);
  const definition = entry.meaning?.trim() || `Definition for ${headword}`;
  const topic = topics[index % topics.length];
  const wordId = uuidFrom(`word:${headword}`);

  const freqRank = typeof entry.frequency === 'number' ? Math.round(entry.frequency * 1000) : null;

  words.push({
    id: wordId,
    headword,
    definition,
    freq_rank: Number.isFinite(freqRank) ? freqRank : null,
    register: 'neutral',
    cefr: pickCefr(index),
    ielts_topics: [topic.key],
  });

  topic.collocationTemplates.forEach((template, templateIndex) => {
    const collocationId = uuidFrom(`collocation:${headword}:${templateIndex}`);
    const prefix = template.prefix ? `${template.prefix} ` : '';
    const chunk = `${prefix}${headword} ${template.suffix}`.replace(/\s+/g, ' ').trim();
    const note = `${template.note} Focus: ${topic.label.toLowerCase()} (${topic.scenario}).`;

    collocations.push({
      id: collocationId,
      word_id: wordId,
      chunk,
      pattern: template.pattern,
      note,
    });

    const exampleId = uuidFrom(`example:${headword}:${templateIndex}`);
    const exampleText = template.exampleTemplate.replace('{word}', headword);

    examples.push({
      id: exampleId,
      word_id: wordId,
      text: exampleText,
      source: 'crafted',
      is_gap_ready: false,
      ielts_topic: topic.key,
    });
  });

  const gapExampleId = uuidFrom(`example:${headword}:gap`);

  examples.push({
    id: gapExampleId,
    word_id: wordId,
    text: topic.gapTemplate,
    source: 'crafted',
    is_gap_ready: true,
    ielts_topic: topic.key,
  });
});

ensureDir(OUTPUT_DIR);

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'words-phase2.json'),
  JSON.stringify(words, null, 2),
);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'collocations-phase2.json'),
  JSON.stringify(collocations, null, 2),
);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'examples-phase2.json'),
  JSON.stringify(examples, null, 2),
);

function sqlValue(value: string | number | null, type: 'uuid' | 'text' | 'int' | 'bool' | 'array'): string {
  if (value === null) return 'null';
  switch (type) {
    case 'uuid':
      return `'${value}'::uuid`;
    case 'text':
      return `'${(value as string).replace(/'/g, "''")}'`;
    case 'int':
      return String(value);
    case 'bool':
      return value ? 'true' : 'false';
    case 'array':
      if (Array.isArray(value)) {
        return `ARRAY[${value.map((item) => sqlValue(item, 'text')).join(', ')}]::text[]`;
      }
      return 'ARRAY[]::text[]';
    default:
      return 'null';
  }
}

function chunkStatements<T>(items: T[], chunkSize: number, buildRow: (item: T) => string): string[] {
  const statements: string[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    const values = slice.map((item) => `(${buildRow(item)})`).join(',\n    ');
    statements.push(values);
  }
  return statements;
}

const nowExpression = 'timezone(\'utc\', now())';

const wordStatements = chunkStatements(words, 200, (item) =>
  [
    sqlValue(item.id, 'uuid'),
    sqlValue(item.headword, 'text'),
    sqlValue(item.headword, 'text'),
    sqlValue(item.definition, 'text'),
    sqlValue(item.definition, 'text'),
    item.freq_rank === null ? 'null' : sqlValue(item.freq_rank, 'int'),
    sqlValue(item.register, 'text'),
    sqlValue(item.cefr, 'text'),
    sqlValue(item.ielts_topics, 'array'),
    nowExpression,
    nowExpression,
  ].join(', '),
);

const collocationStatements = chunkStatements(collocations, 250, (item) =>
  [
    sqlValue(item.id, 'uuid'),
    sqlValue(item.word_id, 'uuid'),
    sqlValue(item.chunk, 'text'),
    sqlValue(item.pattern, 'text'),
    item.note ? sqlValue(item.note, 'text') : 'null',
    nowExpression,
    nowExpression,
  ].join(', '),
);

const exampleStatements = chunkStatements(examples, 250, (item) =>
  [
    sqlValue(item.id, 'uuid'),
    sqlValue(item.word_id, 'uuid'),
    sqlValue(item.text, 'text'),
    sqlValue(item.source, 'text'),
    sqlValue(item.is_gap_ready, 'bool'),
    sqlValue(item.ielts_topic, 'text'),
    nowExpression,
    nowExpression,
  ].join(', '),
);

const sqlChunks: string[] = [];

sqlChunks.push(`-- Phase 2 vocabulary content seed\n`);
wordStatements.forEach((values) => {
  sqlChunks.push(`insert into public.words (id, headword, word, definition, meaning, freq_rank, register, cefr, ielts_topics, created_at, updated_at)\nvalues\n    ${values}\non conflict (id) do update set\n  headword = excluded.headword,\n  word = excluded.word,\n  definition = excluded.definition,\n  meaning = excluded.meaning,\n  freq_rank = excluded.freq_rank,\n  register = excluded.register,\n  cefr = excluded.cefr,\n  ielts_topics = excluded.ielts_topics,\n  updated_at = ${nowExpression};\n`);
});

collocationStatements.forEach((values) => {
  sqlChunks.push(`insert into public.word_collocations (id, word_id, chunk, pattern, note, created_at, updated_at)\nvalues\n    ${values}\non conflict (id) do update set\n  word_id = excluded.word_id,\n  chunk = excluded.chunk,\n  pattern = excluded.pattern,\n  note = excluded.note,\n  updated_at = ${nowExpression};\n`);
});

exampleStatements.forEach((values) => {
  sqlChunks.push(`insert into public.word_examples (id, word_id, text, source, is_gap_ready, ielts_topic, created_at, updated_at)\nvalues\n    ${values}\non conflict (id) do update set\n  word_id = excluded.word_id,\n  text = excluded.text,\n  source = excluded.source,\n  is_gap_ready = excluded.is_gap_ready,\n  ielts_topic = excluded.ielts_topic,\n  updated_at = ${nowExpression};\n`);
});

fs.writeFileSync(SQL_PATH, sqlChunks.join('\n'));

console.log('Generated Phase 2 seed data:');
console.log(`  Words: ${words.length}`);
console.log(`  Collocations: ${collocations.length}`);
console.log(`  Examples: ${examples.length}`);
console.log(`  SQL written to ${SQL_PATH}`);
