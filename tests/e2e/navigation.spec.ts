import { expect, test } from '@playwright/test';
import { noRenderingProblems, trackConsole } from './helpers';

test('home → exam → subject → chapter → question → prev/next → breadcrumbs', async ({ page }) => {
  const errors = trackConsole(page);
  await page.goto('/');
  await expect(page.getByTestId('content-notice')).toContainText('original sample questions');
  await expect(page.getByTestId('exam-card')).toHaveCount(14);
  await page.getByTestId('exam-card').filter({ hasText: 'JEE Main' }).getByRole('link', { name: 'Chapter-wise' }).click();
  await expect(page).toHaveURL('/past-years/jee/jee-main');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('JEE Main');
  await expect(page.getByText('Removed from syllabus (unverified)').first()).toBeVisible();

  await page.getByRole('navigation', { name: 'Subjects' }).getByRole('link', { name: 'Physics' }).click();
  await expect(page).toHaveURL('/past-years/jee/jee-main/physics');
  await page.getByRole('link', { name: 'Laws of Motion' }).click();
  await expect(page).toHaveURL('/past-years/jee/jee-main/physics/laws-of-motion');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/past-years\/jee\/jee-main\/physics\/laws-of-motion$/);
  await expect(page.getByTestId('question-card')).toHaveCount(1);
  await noRenderingProblems(page);

  // subject switch keeps you inside the exam
  await page.getByRole('navigation', { name: 'Subjects' }).getByRole('link', { name: 'Chemistry' }).click();
  await expect(page).toHaveURL('/past-years/jee/jee-main/chemistry');
  await page.goBack();
  await expect(page).toHaveURL('/past-years/jee/jee-main/physics/laws-of-motion');

  // related chapter navigation
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link', { name: /Work Power/ }).click();
  await expect(page).toHaveURL(/work-power-and-energy$/);
  await page.getByRole('complementary', { name: 'Chapters' }).getByRole('link', { name: /Motion in a Straight Line/ }).click();
  await expect(page).toHaveURL(/motion-in-a-straight-line$/);

  // open question detail; chapter context prev/next
  await page.getByRole('link', { name: 'Open ›' }).first().click();
  await expect(page).toHaveURL(/\/question\/[a-z0-9]+$/);
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs).toContainText('JEE Main');
  await expect(crumbs).toContainText('Motion in a Straight Line');
  await crumbs.getByRole('link', { name: 'Physics' }).click();
  await expect(page).toHaveURL('/past-years/jee/jee-main/physics');
  expect(errors).toEqual([]);
});

test('paper-wise browsing, sections, answer key and chapter ↔ paper context switch', async ({ page }) => {
  await page.goto('/past-years/jee/jee-main');
  await page.getByRole('navigation', { name: 'Browse mode' }).getByRole('link', { name: 'Paper-wise' }).click();
  await expect(page).toHaveURL('/past-years/year-wise/jee/jee-main');
  await expect(page.getByTestId('unavailable').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '2024' })).toBeVisible();

  // metadata-only paper shows an explicit unavailable state
  await page.getByRole('link', { name: /27 January Morning Shift/ }).click();
  await expect(page.getByRole('heading', { name: 'Questions not available' })).toBeVisible();
  await page.goBack();

  await page.getByRole('link', { name: 'JEE Main Sample Practice Set 1' }).first().click();
  await expect(page).toHaveURL(/\/past-years\/year-wise\/jee\/jee-main\/sample-practice-set-1\/[a-z0-9]+$/);
  await expect(page.getByTestId('paper-meta')).toContainText('18 questions available');
  await expect(page.getByTestId('question-card')).toHaveCount(18);
  await expect(page.getByTestId('question-card').first().locator('.q-num')).toHaveText('Question 1');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Chemistry' }).click();
  await expect(page.getByTestId('question-card')).toHaveCount(6);
  await expect(page.getByTestId('question-card').first().locator('.q-num')).toHaveText('Question 7');
  await page.getByTestId('answer-key-toggle').click();
  await expect(page.getByTestId('answer-key').locator('tbody tr')).toHaveCount(18);
  await noRenderingProblems(page);

  // open Q7 in paper context, step to Q8, then switch to chapter context without losing the question
  await page.getByTestId('question-card').first().getByRole('link', { name: 'Open ›' }).click();
  await expect(page).toHaveURL(/ctx=paper/);
  await expect(page.getByText('Q7 · 7 of 18 in paper')).toBeVisible();
  await page.getByTestId('next-question').click();
  await expect(page.getByText('Q8 · 8 of 18 in paper')).toBeVisible();
  const url = page.url();
  const qid = url.match(/question\/([a-z0-9]+)/)![1];
  await page.getByRole('tab', { name: /^Chapter:/ }).click();
  await expect(page).toHaveURL(new RegExp(`/question/${qid}$`));
  await expect(page.getByText(/of \d+ in chapter/)).toBeVisible();
});

test('direct-load deep links survive refresh; unknown routes show 404', async ({ page }) => {
  for (const path of ['/past-years/medical/neet/biology/ecosystem', '/past-years/year-wise/medical/neet', '/search?q=lens&exam=jee-main', '/coverage', '/about']) {
    const r = await page.goto(path);
    expect(r!.status(), path).toBe(200);
    await page.reload();
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  const r = await page.goto('/past-years/jee/jee-main/physics/not-a-chapter');
  expect(r!.status()).toBe(404);
  await expect(page.getByTestId('not-found')).toBeVisible();
  const r2 = await page.goto('/past-years/medical/jee-main');
  expect(r2!.status()).toBe(404);
  await expect(page.getByTestId('not-found')).toBeVisible();
  await page.getByRole('link', { name: 'Go to all exams' }).click();
  await expect(page).toHaveURL('/');
});

test('global navigation: exam menu, header search, footer links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Exams ▾' }).click();
  await page.locator('#exam-menu').getByRole('link', { name: /WBJEE/ }).click();
  await expect(page).toHaveURL('/past-years/jee/wbjee');
  await page.getByLabel('Search questions').fill('fringe');
  await page.getByLabel('Search questions').press('Enter');
  await expect(page).toHaveURL('/search?q=fringe');
  await expect(page.getByTestId('result-count')).toHaveText(/1 result/);
  await page.locator('footer').getByRole('link', { name: 'About & content policy' }).click();
  await expect(page).toHaveURL('/about');
});

test('every exam landing page and every listed chapter link resolves', async ({ page, request }) => {
  const exams = (await (await request.get('/api/exams')).json()).categories.flatMap((c: any) => c.exams.map((e: any) => ({ ...e, cat: c.slug })));
  for (const e of exams) {
    const r = await page.goto(`/past-years/${e.cat}/${e.slug}`);
    expect(r!.status()).toBe(200);
    await expect(page.locator('main h1')).toContainText(e.name);
    const hrefs = await page.locator('[data-testid=chapter-item] a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(20);
    for (const h of hrefs.slice(0, 200)) {
      const res = await request.get(h!);
      expect(res.status(), h!).toBe(200);
    }
  }
});

test('mobile menu toggles navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Coverage' })).toBeHidden();
  await page.getByRole('button', { name: '☰ Menu' }).click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Coverage' }).click();
  await expect(page).toHaveURL('/coverage');
  await noRenderingProblems(page);
});
