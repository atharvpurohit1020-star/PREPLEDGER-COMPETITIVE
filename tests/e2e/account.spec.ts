import { expect, test } from '@playwright/test';
import { register } from './helpers';

test('account features are optional and persist per user', async ({ page }) => {
  // login boundary
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=\/account/);

  await register(page);
  await expect(page.getByTestId('empty-state')).toContainText('No practice yet');

  // practice → progress, wrong-answer revision, practice state restored
  await page.goto('/past-years/medical/neet/biology/molecular-basis-of-inheritance');
  const card = page.getByTestId('question-card').first();
  await card.locator('[data-option=A]').click();
  await card.getByTestId('check-answer').click();
  await expect(card.getByTestId('feedback')).toHaveText(/Incorrect/);
  await card.getByTestId('bookmark').click();
  await expect(card.getByTestId('bookmark')).toHaveText('★ Bookmarked');
  await page.reload();
  await expect(page.getByTestId('question-card').first().getByTestId('feedback')).toHaveText(/Incorrect/);

  // recently viewed
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/me/recent/') && r.request().method() === 'POST'),
    page.getByTestId('question-card').first().getByRole('link', { name: 'Open ›' }).click(),
  ]);
  await page.goto('/account');
  await expect(page.getByTestId('progress-table')).toContainText('Molecular Basis of Inheritance');
  await page.getByRole('link', { name: 'Bookmarks' }).click();
  await expect(page.getByTestId('question-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Recently viewed' }).click();
  await expect(page.getByRole('main')).toContainText('Molecular Basis of Inheritance');
  await page.getByRole('link', { name: 'Wrong-answer revision' }).click();
  const rev = page.getByTestId('question-card').first();
  await rev.locator('[data-option=B]').click();
  await rev.getByTestId('check-answer').click();
  await expect(rev.getByTestId('feedback')).toHaveText(/Correct!/);
  await page.reload();
  await expect(page.getByTestId('empty-state')).toContainText('Nothing to revise');

  // reset practice on the chapter page
  await page.goto('/past-years/medical/neet/biology/molecular-basis-of-inheritance');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset practice' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Practice reset' })).toContainText('2 saved answers cleared');

  // preferences + export + delete
  await page.goto('/account/settings');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-data').click()]);
  expect(download.suggestedFilename()).toBe('prepledger-my-data.json');
  await page.getByLabel('Password').fill('student-pass-1');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('wrong login shows a clear error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@test.local');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password');
});
