import { z } from 'zod';

export const MarkNotificationReadParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateNotificationSchema = z.object({
  message: z.string().min(1).max(500),
  url: z.string().url().optional().or(z.literal('')),
});

export const NotificationNudgeSchema = z.object({
  id: z.string().uuid().or(z.literal('welcome')),
  message: z.string(),
  url: z.string().url().nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});

export const NotificationListQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationNudgeSchema),
  nextCursor: z.string().datetime().nullable(),
  unreadCount: z.number().int().min(0),
});

export type MarkNotificationReadParams = z.infer<typeof MarkNotificationReadParamsSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type NotificationNudge = z.infer<typeof NotificationNudgeSchema>;
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;