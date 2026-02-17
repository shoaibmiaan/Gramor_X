// data/writing/tips.ts
import { z } from 'zod';

export const FocusEnum = z.enum(['task_response', 'coherence', 'lexical', 'grammar']);
export const LevelEnum = z.enum(['beginner', 'advanced']);

export const TipSchema = z.object({
  id: z.string(),
  title: z.string(),
  twoLiner: z.string(),
  practicePrompt: z.string(),
  focus: FocusEnum,
  level: LevelEnum,
});

export type Focus = z.infer<typeof FocusEnum>;
export type Level = z.infer<typeof LevelEnum>;
export type Tip = z.infer<typeof TipSchema>;

// 5 beginner + 5 advanced. Practice-first wording; concise and actionable.
const data: Tip[] = [
  // BEGINNER (5)
  {
    id: 'tip-01',
    title: 'Write a direct thesis (Task 2)',
    twoLiner:
      'Answer the question in one clean sentence. No examples, no lists—just your position.',
    practicePrompt:
      'Prompt: “Some believe unpaid community work should be mandatory in high school.” Write ONE thesis sentence that clearly states your view.',
    focus: 'task_response',
    level: 'beginner',
  },
  {
    id: 'tip-02',
    title: 'One clear topic sentence',
    twoLiner:
      'Start each body paragraph with a sentence that previews its single main idea.',
    practicePrompt:
      'Draft a topic sentence for a paragraph arguing that remote work improves work–life balance (Task 2).',
    focus: 'coherence',
    level: 'beginner',
  },
  {
    id: 'tip-03',
    title: 'Cohesion with reference words',
    twoLiner:
      'Use “this/these/it/such” to avoid repeating nouns and to link ideas naturally.',
    practicePrompt:
      'Improve cohesion: “Online classes are flexible. Online classes help parents. Online classes reduce commuting.” Rewrite using 2 reference words.',
    focus: 'coherence',
    level: 'beginner',
  },
  {
    id: 'tip-04',
    title: 'One accurate complex sentence',
    twoLiner:
      'Use one complex sentence per paragraph with “because/although/which”—accuracy first.',
    practicePrompt:
      'Combine: “Many graduates move abroad. Salaries are higher.” into ONE accurate complex sentence.',
    focus: 'grammar',
    level: 'beginner',
  },
  {
    id: 'tip-05',
    title: 'Replace vague words with precise collocations',
    twoLiner:
      'Avoid “a lot/very big/very good”. Use topic-appropriate, precise phrases.',
    practicePrompt:
      'Upgrade three items in: “A lot of people think traffic is a very big problem. A very good solution is better buses.”',
    focus: 'lexical',
    level: 'beginner',
  },

  // ADVANCED (5)
  {
    id: 'tip-06',
    title: 'Task 1: Overview first, figures later',
    twoLiner:
      'Summarise the big picture in 1–2 sentences before any numbers. That’s Band 7+ behavior.',
    practicePrompt:
      'Data: Country A climbs to 90% internet use by 2020; B flat ~40%; C surges post-2010 to ~75%. Write a one-sentence overview with no numbers.',
    focus: 'task_response',
    level: 'advanced',
  },
  {
    id: 'tip-07',
    title: 'Logical sequencing without over-linking',
    twoLiner:
      'Order ideas so they flow. Use few, meaningful linkers—quality over quantity.',
    practicePrompt:
      'Reorder and minimally link: “Many cities expand metro lines. Commuters avoid traffic. Property near stations becomes expensive.”',
    focus: 'coherence',
    level: 'advanced',
  },
  {
    id: 'tip-08',
    title: 'Paraphrase without sounding forced',
    twoLiner:
      'Vary key words naturally (policy → regulation → measure). Never distort meaning.',
    practicePrompt:
      'Paraphrase this sentence once: “Government policies should encourage small businesses.” Keep meaning and tone.',
    focus: 'lexical',
    level: 'advanced',
  },
  {
    id: 'tip-09',
    title: 'Clause variety (clean > fancy)',
    twoLiner:
      'Mix relative, concessive, and non-finite clauses. Prioritise clarity over showmanship.',
    practicePrompt:
      'Rewrite to add a concessive clause: “Car use is rising. Cities invest in bike lanes.”',
    focus: 'grammar',
    level: 'advanced',
  },
  {
    id: 'tip-10',
    title: 'Counterargument + rebuttal (Task 2)',
    twoLiner:
      'A short concession line followed by a stronger rebuttal boosts depth and balance.',
    practicePrompt:
      'Write one sentence that concedes a valid opposing point on “cashless payments should replace cash” and rebuts it logically.',
    focus: 'task_response',
    level: 'advanced',
  },
];

export const QUICK_TIPS = z.array(TipSchema).parse(data);
