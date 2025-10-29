import { z } from 'zod';

export const Channel = z.enum(['email', 'whatsapp']);
export type Channel = z.infer<typeof Channel>;

export const DeliveryStatus = z.enum(['pending', 'sent', 'failed', 'deferred']);
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export const PreferencesBody = z.object({
  channels: z.record(Channel, z.boolean()).default({ email: true } as Record<Channel, boolean>),
  quietHoursStart: z
    .string()
    .regex(timePattern, 'Expected HH:mm or HH:mm:ss format')
    .nullable()
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(timePattern, 'Expected HH:mm or HH:mm:ss format')
    .nullable()
    .optional(),
  timezone: z.string().min(2).default('UTC'),
});

export type PreferencesBodyInput = z.infer<typeof PreferencesBody>;

export const EnqueueBody = z.object({
  event_key: z.string().min(1),
  user_id: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  channels: z.array(Channel).optional(),
  idempotency_key: z.string().min(1).optional(),
  locale: z.string().min(2).optional(),
  bypass_quiet_hours: z.boolean().optional(),
});

export type EnqueueBodyInput = z.infer<typeof EnqueueBody>;
