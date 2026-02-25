// lib/listening/questionTypes.schema.ts
import { z } from 'zod';
import { LISTENING_QUESTION_TYPE_KEYS } from './questionTypes';

export const ListeningQuestionTypeSchema = z.enum(
  LISTENING_QUESTION_TYPE_KEYS,
);

export type ListeningQuestionTypeInput = z.infer<
  typeof ListeningQuestionTypeSchema
>;
