// data/writing/micro.ts
import { z } from 'zod';
import { FocusEnum, LevelEnum } from './tips';

export const MicroTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  minutes: z.number().int().positive(),
  level: LevelEnum,
  focus: FocusEnum,
  prompt: z.string(),
});

export type MicroTask = z.infer<typeof MicroTaskSchema>;

const data: MicroTask[] = [
  {
    id: 'mt-01',
    title: 'Error Hunt: Articles',
    minutes: 3,
    level: 'beginner',
    focus: 'grammar',
    prompt:
      'Fix article errors: "People go to university for improving a knowledge. In many countries, the education is expensive."',
  },
  {
    id: 'mt-02',
    title: 'Cohesion Mini-Rewrite',
    minutes: 4,
    level: 'beginner',
    focus: 'coherence',
    prompt:
      'Make this flow naturally using 2–3 cohesive devices: "Cities are crowded. Public transport is slow. People still prefer cars."',
  },
  {
    id: 'mt-03',
    title: 'Task 2: One-Minute Plan',
    minutes: 2,
    level: 'advanced',
    focus: 'task_response',
    prompt:
      'Question: "Some believe unpaid community work should be mandatory in high school." Write a bullet-plan: thesis + 2 body ideas + 1 example seed.',
  },
  {
    id: 'mt-04',
    title: 'Lexical Upgrade (6.5 → 7+)',
    minutes: 3,
    level: 'advanced',
    focus: 'lexical',
    prompt:
      'Replace 3 basics with precise alternatives: "a lot of people", "very important", "big problem" in a 2-sentence opinion on climate policy.',
  },
];

export const MICRO_TASKS = z.array(MicroTaskSchema).parse(data);
