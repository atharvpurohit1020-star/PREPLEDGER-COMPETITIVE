import { expect, test } from '@playwright/test';

test('chapter filters change results, sync to URL, show chips and clear', async ({ page }) => {
  await page.goto('/past-years/jee/jee-main/physics/laws-of-motion');
  await expect(page.getByTestId('result-count')).toHaveText(/1 question/);
  await page.getByLabel('Topic').selectOption('inclined-plane');
  await expect(page).toHaveURL(/topic=inclined-plane/);
  await expect(page.getByTestId('result-count')).toHaveText(/1 question match the filters/);
  await page.getByLabel('Source').selectOption('pyq');
  await expect(page).toHaveURL(/source=pyq/);
  await expect(page.getByTestId('empty-state')).toContainText('No questions match these filters');
  await expect(page.getByTestId('active-filters').locator('.chip')).toHaveCount(2);
  await page.reload();
  await expect(page.getByTestId('active-filters').locator('.chip')).toHaveCount(2);
  await page.getByTestId('active-filters').getByRole('button', { name: 'Clear all' }).click();
  await expect(page).toHaveURL('/past-years/jee/jee-main/physics/laws-of-motion');
  await expect(page.getByTestId('question-card')).toHaveCount(1);
});

test('chapter with no questions shows a clear empty state', async ({ page }) => {
  await page.goto('/past-years/jee/jee-main/physics/waves');
  await expect(page.getByTestId('empty-state')).toContainText('No questions in this chapter yet');
  await expect(page.getByTestId('chapter-stats')).toContainText('0');
});

test('search: text, facets, chips, sort, pagination and empty results', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByTestId('result-count')).toHaveText('78 results · page 1 of 4');
  await page.getByRole('navigation', { name: 'Pagination' }).getByRole('link', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByTestId('result-count')).toHaveText('78 results · page 2 of 4');
  await expect(page.getByTestId('question-card').first().locator('.q-num')).toHaveText('Question 21');

  const facets = page.getByTestId('facets');
  await facets.getByRole('button', { name: /^NEET/ }).click();
  await expect(page).toHaveURL(/exam=neet/);
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.getByTestId('result-count')).toHaveText('12 results');
  await facets.getByRole('button', { name: /^Biology/ }).click();
  await expect(page.getByTestId('result-count')).toHaveText('6 results');
  await facets.getByRole('button', { name: /^Assertion/ }).click();
  await expect(page.getByTestId('result-count')).toHaveText('1 result');
  await expect(page.getByTestId('active-filters').locator('.chip')).toHaveCount(3);
  await page.getByRole('button', { name: 'Remove type filter' }).click();
  await expect(page.getByTestId('result-count')).toHaveText('6 results');
  await page.getByLabel('Sort').selectOption('newest');
  await expect(page).toHaveURL(/sort=newest/);
  await page.getByTestId('active-filters').getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByTestId('result-count')).toHaveText('78 results · page 1 of 4');

  await page.getByLabel('Search text').fill('zzzz-nothing-matches');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByTestId('empty-state')).toContainText('No questions found');

  await page.getByLabel('Search text').fill('Thermodynamics');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Matching chapters' })).toBeVisible();
});
