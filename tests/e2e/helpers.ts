import { expect, type Page } from '@playwright/test';

export async function noRenderingProblems(page: Page) {
  expect(await page.locator('.katex-error').count(), 'formula errors').toBe(0);
  expect(await page.locator('.diagram-missing').count(), 'missing diagrams').toBe(0);
  const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  expect(broken, 'broken images').toEqual([]);
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hscroll, 'horizontal page scroll').toBe(false);
}

export function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 40[134]/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export async function register(page: Page, name = 'E2E Student') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('student-pass-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account/);
  return email;
}

export async function loginAdmin(page: Page) {
  await page.goto('/login?next=/admin');
  await page.getByLabel('Email').fill('admin@e2e.local');
  await page.getByLabel('Password').fill('admin-e2e-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin/);
}
