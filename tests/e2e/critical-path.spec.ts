import { expect, test } from '@playwright/test';

test.describe('Critical user journeys', () => {
  test('user can select a role and reach email sign-up', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByText('Sign up as')).toBeVisible();

    await page.getByRole('button', { name: 'Student' }).click();
    await expect(page.getByRole('button', { name: 'Sign up with Email' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign up with Email' }).click();
    await expect(page).toHaveURL(/\/signup\/email/);

    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Password').fill('secret123');
    await page.getByLabel('Confirm Password').fill('secret456');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();

    await page.getByLabel('Email').fill('demo@example.com');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });

  test('reading catalog filters by question type', async ({ page }) => {
    await page.goto('/reading');

    await expect(page.getByRole('heading', { name: 'Reading Practice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Honey Bee Ecosystem' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Migration Patterns' })).toBeVisible();

    await page.getByRole('button', { name: 'Matching' }).click();

    await expect(page.getByRole('heading', { name: 'The Honey Bee Ecosystem' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Migration Patterns' })).not.toBeVisible();

    await page.getByRole('button', { name: 'MCQ' }).click();
    await expect(page.getByRole('heading', { name: 'The Honey Bee Ecosystem' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Migration Patterns' })).toBeVisible();
  });

  test('premium gate encourages upgrade for free users', async ({ page }) => {
    await page.route('**/api/premium/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pinOk: false, loggedIn: false, userId: null, plan: null }),
      });
    });

    await page.goto('/premium');

    await expect(page.getByRole('heading', { name: 'Premium Exam Room' })).toBeVisible();
    await expect(page.getByText('FREE')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Upgrade' })).toBeVisible();
  });
});
