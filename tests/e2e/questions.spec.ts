import { expect, test } from '@playwright/test';
import { noRenderingProblems } from './helpers';

test('single-choice: incorrect then correct, reveal answer and solution', async ({ page }) => {
  await page.goto('/past-years/jee/jee-main/mathematics/probability');
  const card = page.getByTestId('question-card').first();
  await expect(card.getByTestId('check-answer')).toBeDisabled();
  await card.locator('[data-option=A]').click();
  await card.getByTestId('check-answer').click();
  await expect(card.getByTestId('feedback')).toHaveText(/Incorrect/);
  await expect(card.locator('[data-option=A]')).toHaveClass(/wrong/);
  await card.locator('[data-option=B]').click();
  await card.getByTestId('check-answer').click();
  await expect(card.getByTestId('feedback')).toHaveText(/Correct!/);
  await expect(card.locator('[data-option=B]')).toHaveClass(/correct/);
  await card.getByTestId('toggle-answer').click();
  await expect(card.getByTestId('correct-answer')).toHaveText('B');
  await expect(card.getByTestId('key-source')).toHaveText('Editorial answer (not official)');
  await card.getByTestId('toggle-solution').click();
  await expect(card.getByTestId('solutions')).toContainText('Editorial solution (not official)');
  await expect(card.getByTestId('solutions')).toContainText('Favourable outcomes');
});

test('multi-select partial feedback and numerical answers', async ({ page }) => {
  await page.goto('/past-years/jee/jee-advanced/physics/electrostatics');
  const card = page.getByTestId('question-card').first();
  await expect(card.getByRole('group', { name: /select all that apply/ })).toBeVisible();
  await card.locator('[data-option=A]').click();
  await card.locator('[data-option=B]').click();
  await card.getByTestId('check-answer').click();
  await expect(card.getByTestId('feedback')).toHaveText(/Partially correct/);
  await card.locator('[data-option=C]').click();
  await card.getByTestId('check-answer').click();
  await expect(card.getByTestId('feedback')).toHaveText(/Correct!/);

  await page.goto('/past-years/jee/jee-advanced/physics/simple-harmonic-motion');
  const n = page.getByTestId('question-card').first();
  await n.getByTestId('numeric-input').fill('0.70');
  await n.getByTestId('check-answer').click();
  await expect(n.getByTestId('feedback')).toHaveText(/Incorrect/);
  await n.getByTestId('numeric-input').fill('0.63');
  await n.getByTestId('check-answer').click();
  await expect(n.getByTestId('feedback')).toHaveText(/Correct!/);
  await n.getByTestId('toggle-answer').click();
  await expect(n.getByTestId('correct-answer')).toHaveText('0.62 to 0.64');
});

test('matrix match, assertion–reason, passage and table render', async ({ page }) => {
  await page.goto('/past-years/jee/jee-advanced/physics/units-and-measurements');
  await expect(page.locator('.matrix-lists table')).toHaveCount(2);
  await expect(page.getByRole('columnheader', { name: 'List-II' })).toBeVisible();
  await noRenderingProblems(page);
  await page.goto('/past-years/medical/neet/physics/gravitation');
  await expect(page.getByText('Assertion (A):')).toBeVisible();
  await expect(page.getByText('Reason (R):')).toBeVisible();
  await page.goto('/past-years/jee/jee-advanced/chemistry/chemical-kinetics');
  await expect(page.locator('.q-passage')).toHaveCount(2);
  await page.goto('/past-years/medical/neet/biology/ecosystem');
  await expect(page.locator('.q-body table.q-table')).toBeVisible();
  await noRenderingProblems(page);
});

test('diagram zoom viewer with accessible description', async ({ page }) => {
  await page.goto('/past-years/jee/jee-main/physics/current-electricity');
  const fig = page.locator('.q-figure img').first();
  await expect(fig).toHaveAttribute('alt', /12 V battery/);
  await expect.poll(() => fig.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: /Enlarge diagram/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Diagram viewer' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText('150%')).toBeVisible();
  await dlg.getByRole('button', { name: 'Zoom in' }).click();
  await expect(dlg.getByText('175%')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
});

test('answer-key correction history and report dialog', async ({ page }) => {
  await page.goto('/past-years/jee/jee-main/chemistry/coordination-compounds');
  const card = page.getByTestId('question-card').first();
  await card.getByTestId('toggle-answer').click();
  await expect(card.getByTestId('key-status')).toHaveText('Revised');
  await card.getByRole('button', { name: /Show answer-key history/ }).click();
  await expect(card.getByTestId('key-history').locator('li')).toHaveCount(2);
  await expect(card.getByTestId('key-history')).toContainText('v1: C');
  await card.getByRole('button', { name: 'Report' }).click();
  const dlg = page.getByRole('dialog', { name: 'Report a problem' });
  await dlg.getByLabel('What is wrong?').selectOption('typo');
  await dlg.getByLabel('Details (optional)').fill('E2E report');
  await dlg.getByRole('button', { name: 'Send report' }).click();
  await expect(dlg.getByRole('status')).toContainText('editors will review');
  await dlg.getByRole('button', { name: 'Close' }).click();
});

test('anonymous bookmark redirects to sign-in and returns', async ({ page }) => {
  await page.goto('/past-years/jee/kcet/mathematics/sets-and-relations');
  await page.getByTestId('bookmark').first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fpast-years%2Fjee%2Fkcet/);
});
