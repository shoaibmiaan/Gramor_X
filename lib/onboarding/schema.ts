import { z } from 'zod';

export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
] as const;

export const LanguageBody = z.object({
  language: z.enum(['en', 'ur']),
});

export const TargetBandBody = z.object({
  targetBand: z.number().min(4).max(9),
});

export const ExamDateBody = z.object({
  timeframe: z.enum(['0-30', '30-60', '60-90', '90-plus', 'not-booked']),
  examDate: z.string().nullable(),
});

export const StudyRhythmBody = z.object({
  rhythm: z.enum(['daily', '5days', 'weekends', 'flexible', 'intensive']),
});

export const NotificationChannelEnum = z.enum(['email', 'whatsapp', 'in-app']);

export const NotificationsBody = z.object({
  channels: z.array(NotificationChannelEnum).min(1),
  preferredTime: z.string().nullable().optional(),
});
