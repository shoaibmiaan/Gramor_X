import { z } from 'zod';

export const Channel = z.enum(['email', 'whatsapp', 'sms']);
export type NotificationChannel = z.infer<typeof Channel>;

export const EnqueueBody = z.object({
  user_id: z.string().uuid(),
  event_key: z.string().min(1).max(100),
  payload: z.record(z.any()).optional(),
  channels: z.array(Channel).optional(),
  locale: z.string().default('en'),
  bypass_quiet_hours: z.boolean().default(false),
  idempotency_key: z.string().optional(),
});

export const PreferencesBody = z.object({
  channels: z.object({
    email: z.boolean().default(true),
    whatsapp: z.boolean().default(false),
  }),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  timezone: z.string().default('UTC'),
});

export type EnqueueBodyInput = z.infer<typeof EnqueueBody>;
export type PreferencesBodyInput = z.infer<typeof PreferencesBody>;