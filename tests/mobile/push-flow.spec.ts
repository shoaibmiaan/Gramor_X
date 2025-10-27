import { expect, test } from '@playwright/test';

import { registerPush } from '@/lib/push/client';
import { DEFAULT_TOPICS, diffTopics, sanitizeTopics } from '@/lib/push/topics';

test.describe('mobile push helpers', () => {
  test('falls back to defaults when no topics provided', () => {
    const topics = sanitizeTopics([]);
    expect(topics).toEqual(DEFAULT_TOPICS);
  });

  test('deduplicates and normalizes topics', () => {
    const topics = sanitizeTopics(['GENERAL', 'study-reminders', 'general']);
    expect(topics).toEqual(['general', 'study-reminders']);
  });

  test('computes topic diff correctly', () => {
    const diff = diffTopics(['general', 'product'], ['general', 'study-reminders']);
    expect(diff.added).toEqual(['study-reminders']);
    expect(diff.removed).toEqual(['product']);
  });

  test('returns unsupported registration result in non-browser environment', async () => {
    const result = await registerPush();
    expect(result.ok).toBeFalsy();
    if (!result.ok) {
      expect(result.reason).toBe('unsupported');
    }
  });
});
