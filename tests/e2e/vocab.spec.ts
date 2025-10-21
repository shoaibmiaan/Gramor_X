import { expect, test } from '@playwright/test';

const sampleWord = {
  id: '11111111-1111-1111-1111-111111111111',
  headword: 'Eloquent',
  definition: 'Fluent or persuasive in speaking or writing.',
  meaning: 'Able to express ideas clearly and effectively.',
  example: 'She delivered an eloquent speech that captivated the judges.',
  exampleTranslation: null,
  partOfSpeech: 'adjective',
  register: 'formal',
  cefr: 'C1',
  ipa: '/ˈɛləkwənt/',
  audioUrl: null,
  synonyms: ['articulate', 'expressive', 'persuasive'],
  topics: ['Speaking', 'Writing'],
};

test.describe('/vocab daily ritual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/vocab/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2025-03-15',
          source: 'rpc',
          word: sampleWord,
        }),
      });
    });

    await page.route('**/api/vocab/attempt/meaning', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ correct: true, xpAwarded: 12 }),
      });
    });

    await page.route('**/api/vocab/attempt/sentence', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ score: 3, feedback: 'Excellent use!', xpAwarded: 20 }),
      });
    });

    await page.route('**/api/vocab/attempt/synonyms', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ score: 82, accuracy: 0.78, xpAwarded: 9 }),
      });
    });

    await page.route('**/api/vocab/leaderboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            { rank: 1, userId: 'user-1', displayName: 'Ayesha', avatarUrl: null, xp: 120 },
            { rank: 2, userId: 'user-2', displayName: 'Hassan', avatarUrl: null, xp: 95 },
          ],
        }),
      });
    });

    await page.route('**/api/streak', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            current_streak: 3,
            longest_streak: 5,
            last_activity_date: '2025-03-14',
            next_restart_date: null,
            shields: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            current_streak: 4,
            longest_streak: 5,
            last_activity_date: '2025-03-15',
            next_restart_date: null,
            shields: 1,
          }),
        });
      }
    });
  });

  test('allows the learner to complete the ritual flows', async ({ page }) => {
    await page.goto('/vocab');

    await expect(page.getByRole('heading', { name: 'Vocabulary Ritual' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Eloquent' })).toBeVisible();

    const meaningOptions = page.getByRole('radio');
    await expect(meaningOptions.first()).toBeVisible();
    await meaningOptions.first().check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.getByText('+12 XP')).toBeVisible();

    await page.getByLabel('Your sentence').fill('The candidate gave an eloquent response.');
    await page.getByRole('button', { name: 'Get AI feedback' }).click();
    await expect(page.getByText('Band-ready! 🎉 · +20 XP')).toBeVisible();
    await expect(page.getByText('Excellent use!')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Submit selections' })).toBeVisible();
    const optionButtons = page.locator('button[aria-pressed]');
    await expect(optionButtons.nth(0)).toBeVisible();
    await optionButtons.nth(0).click();
    await optionButtons.nth(1).click();
    await page.getByRole('button', { name: 'Submit selections' }).click();
    await expect(page.getByText('Score 82 · +9 XP')).toBeVisible();

    await expect(page.getByText('Total XP today · 41')).toBeVisible();
    await expect(page.getByText('Ayesha')).toBeVisible();
  });
});
