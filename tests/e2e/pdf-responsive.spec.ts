import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { noRenderingProblems, trackConsole } from './helpers';

test('chapter print preview includes questions, key and solutions; toggles work', async ({ page }) => {
  await page.goto('/print/chapter/jee-main/physics/current-electricity');
  const doc = page.getByTestId('print-doc');
  await expect(doc).toHaveAttribute('data-print-state', 'ready');
  await expect(doc).toContainText('JEE Main · Physics · Current Electricity');
  await expect(doc.getByRole('heading', { name: 'Answer key' })).toBeVisible();
  await expect(doc.getByRole('heading', { name: 'Solutions' })).toBeVisible();
  await expect(doc).toContainText('Method 2: conductance');
  await page.getByLabel('Solutions').uncheck();
  await expect(page).toHaveURL(/solutions=0/);
  await expect(doc.getByRole('heading', { name: 'Solutions' })).toHaveCount(0);
  await noRenderingProblems(page);
});

test('server-side PDF download for chapter and paper', async ({ request }) => {
  const ch = await request.get('/api/pdf?path=/print/chapter/jee-main/physics/current-electricity&filename=ce.pdf');
  expect(ch.status()).toBe(200);
  expect(ch.headers()['content-type']).toBe('application/pdf');
  expect(ch.headers()['content-disposition']).toContain('ce.pdf');
  const buf = await ch.body();
  expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  expect(buf.length).toBeGreaterThan(10_000);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/sample-chapter.pdf', buf);

  const papers = await (await request.get('/api/exams/neet/papers')).json();
  const p = await request.get(`/api/pdf?path=/print/paper/${papers.samples[0].public_id}&filename=neet.pdf`);
  expect(p.status()).toBe(200);
  expect((await p.body()).subarray(0, 4).toString()).toBe('%PDF');
});

test('PDF export errors are explicit for empty chapters and unknown pages', async ({ request }) => {
  const empty = await request.get('/api/pdf?path=/print/chapter/jee-main/physics/waves');
  expect(empty.status()).toBe(409);
  expect((await empty.json()).error).toMatch(/nothing to export/);
  const missing = await request.get('/api/pdf?path=/print/chapter/jee-main/physics/nope');
  expect(missing.status()).toBe(404);
});

const PAGES = [
  '/',
  '/past-years/jee/jee-main',
  '/past-years/medical/neet',
  '/account',
  '/about',
  '/past-years/jee/jee-main/physics',
  '/past-years/jee/jee-main/physics/current-electricity',
  '/past-years/jee/jee-advanced/physics/units-and-measurements',
  '/past-years/medical/neet/biology/ecosystem',
  '/past-years/year-wise/jee/jee-main',
  '/search?q=acid',
  '/coverage',
  '/practice?exam=neet',
];

for (const width of [390, 820, 1280]) {
  test(`responsive layout at ${width}px: no overflow, formula or image errors`, async ({ page }) => {
    const errors = trackConsole(page);
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await noRenderingProblems(page);
      await page.screenshot({ path: `test-results/screens/${width}${path.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: false });
    }
    expect(errors).toEqual([]);
  });
}

test('keyboard focus is visible and skip link works', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
