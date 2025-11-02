import { z } from 'zod';

export const NotificationNudgeSchema = z.object({
  id: z.string().min(1),
  message: z.string(),
  url: z.string().url().nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});

export type NotificationNudge = z.infer<typeof NotificationNudgeSchema>;

export const NotificationListQuerySchema = z.object({
  cursor: z
    .string()
    .datetime()
    .optional(),
  limit: z
    .preprocess((value) => {
      if (value === undefined) return undefined;
      const asNumber = Number(value);
      return Number.isNaN(asNumber) ? undefined : asNumber;
    }, z.number().int().min(1).max(50))
    .optional()
    .default(20),
});

export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationNudgeSchema),
  nextCursor: z.string().datetime().nullable(),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const MarkNotificationReadParamsSchema = z.object({
  id: z.string().min(1),
});

export const CreateNudgeSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
});

export const CreateNotificationSchema = z.object({
  message: z.string().min(1),
  url: z.string().url().optional().nullable(),
});

export const NotificationPreferencesSchema = z.object({
  email: z.string().email().nullable(),
  emailOptIn: z.boolean(),
  whatsappOptIn: z.boolean(),
  smsOptIn: z.boolean(),
  phone: z.string().nullable(),
  phoneVerified: z.boolean(),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const UpdateNotificationPreferencesSchema = z.object({
  emailOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (+XXXXXXXXXXX)')
    .optional(),
  phoneVerified: z.boolean().optional(),
  sendTest: z.boolean().optional(),
});

export type UpdateNotificationPreferences = z.infer<typeof UpdateNotificationPreferencesSchema>;
