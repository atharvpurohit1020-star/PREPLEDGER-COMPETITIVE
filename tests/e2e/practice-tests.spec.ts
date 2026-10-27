import { expect, test } from '@playwright/test';
import { register } from './helpers';

test('anonymous timed test: palette states, mark for review, autosave across reload, submit and review', async ({ page }) => {
  await page.goto('/past-years/year-wise/jee/comedk');
  await page.getByRole('link', { name: 'Take test' }).first().click();
  await expect(page.getByTestId('test-intro')).toContainText('3 questions');
  await page.getByTestId('start-test').click();
  await expect(page.getByTestId('timer')).toHaveText(/^\d+:\d\d$/);
  const pal = page.getByTestId('palette').locator('button');
  await expect(pal).toHaveCount(3);
  await expect(pal.nth(0)).toHaveClass(/not-answered/);
  await expect(pal.nth(1)).toHaveClass(/not-visited/);

  // Q1 correct (C: 2 V)
  await page.getByTestId('test-question').locator('[data-option=C]').click();
  await expect(pal.nth(0)).toHaveClass(/answered/);
  await page.getByTestId('save-next').click();
  // Q2 wrong answer, marked for review
  await page.getByTestId('test-question').locator('[data-option=A]').click();
  await page.getByTestId('mark-review').click();
  await expect(pal.nth(1)).toHaveClass(/answered-marked/);

  // autosave: reload keeps state and timer
  await page.reload();
  await expect(page.getByTestId('palette').locator('button').nth(1)).toHaveClass(/answered-marked/);
  await expect(page.getByTestId('palette').locator('button').nth(0)).toHaveClass(/answered/);

  await page.getByTestId('submit-test').click();
  await expect(page.getByRole('dialog', { name: 'Submit test?' })).toContainText('Answered: 2');
  await page.getByTestId('confirm-submit').click();
  // COMEDK +1/0: one correct, one wrong, one unattempted
  await expect(page.getByTestId('score')).toHaveText('1 / 3');
  await expect(page.getByTestId('review-item')).toHaveCount(3);
  await page.getByRole('tab', { name: 'Incorrect' }).click();
  await expect(page.getByTestId('review-item')).toHaveCount(1);
  await expect(page.getByTestId('review-item').getByTestId('solutions')).toBeVisible();
});

test('custom test builder from chapters', async ({ page }) => {
  await page.goto('/practice');
  await page.getByTestId('practice-exam').selectOption('jee-main');
  await page.getByLabel('Laws of Motion').check();
  await page.getByLabel('Probability').check();
  await page.getByTestId('start-custom').click();
  await expect(page).toHaveURL(/\/test\/custom\?exam=jee-main/);
  await page.getByTestId('start-test').click();
  await expect(page.getByTestId('palette').locator('button')).toHaveCount(2);
  await page.getByTestId('submit-test').click();
  await page.getByTestId('confirm-submit').click();
  await expect(page.getByTestId('score')).toHaveText('0 / 8');
});

test('signed-in attempt is saved to the account and reviewable', async ({ page }) => {
  await register(page);
  await page.goto('/past-years/year-wise/jee/kcet');
  await page.getByRole('link', { name: 'Take test' }).first().click();
  await page.getByTestId('start-test').click();
  await page.getByTestId('test-question').locator('[data-option=B]').click();
  await expect(page.getByText(/^Saved /)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('submit-test').click();
  await page.getByTestId('confirm-submit').click();
  await expect(page.getByTestId('test-result')).toBeVisible();
  await page.goto('/account/attempts');
  await expect(page.getByTestId('attempts-table')).toContainText('Submitted');
  await page.getByRole('link', { name: 'Review' }).click();
  await expect(page.getByTestId('score')).toHaveText('1 / 3');
});
