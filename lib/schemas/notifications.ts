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
