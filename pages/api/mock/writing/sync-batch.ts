// pages/api/mock/writing/sync-batch.ts
// Re-use the shared offline sync handler so mobile mock exams can replay
// queued drafts/events when connectivity returns.

export { default } from '@/pages/api/offline/sync';
