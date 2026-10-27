import { expect, test } from '@playwright/test';
import { loginAdmin, register } from './helpers';

test('students cannot use admin', async ({ page }) => {
  await register(page);
  await page.goto('/admin');
  await expect(page.getByTestId('empty-state')).toContainText('Access denied');
});

test('bulk import: validate errors, preview, commit, publish, then roll back', async ({ page }) => {
  await loginAdmin(page);
  await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Imports' }).click();

  const bad = { format_version: 1, source: { source_type: 'licensed_dataset', title: 'E2E licensed set', license: 'Licensed', permission_note: 'Permission granted for the e2e test.' },
    questions: [{ ref: 'e2e.bad', exam: 'jee-main', subject: 'physics', chapter: 'nope', type: 'mcq_single', body: 'x $\\frac{$', options: [{ label: 'A', body: 'a' }], answer: { value: { options: ['B'] }, status: 'final', source: 'editorial' } }] };
  await page.getByTestId('import-content').fill(JSON.stringify(bad));
  await page.getByTestId('validate-import').click();
  await expect(page.getByTestId('validation-report')).toContainText('Invalid');
  await expect(page.getByTestId('import-errors')).toContainText('unknown chapter "nope"');
  await expect(page.getByTestId('commit-import')).toHaveCount(0);

  const good = {
    format_version: 1,
    source: { source_type: 'licensed_dataset', title: 'E2E licensed set', license: 'Licensed', permission_note: 'Permission granted for the e2e test.' },
    questions: [{ ref: 'e2e.good.1', exam: 'jee-main', subject: 'physics', chapter: 'waves', type: 'mcq_single', status: 'published',
      body: 'E2E imported question: the speed of a wave is $v = f\\lambda$. Which is correct?', options: [{ label: 'A', body: 'yes' }, { label: 'B', body: 'no' }],
      answer: { value: { options: ['A'] }, status: 'final', source: 'editorial' }, solutions: [{ kind: 'editorial', body: 'Because $v=f\\lambda$.', is_verified: true }] }],
  };
  await page.getByTestId('import-content').fill(JSON.stringify(good));
  await page.getByTestId('validate-import').click();
  await expect(page.getByTestId('validation-report')).toContainText('Valid');
  await expect(page.getByTestId('validation-report').locator('.katex').first()).toBeVisible();
  await page.getByTestId('commit-import').click();
  await expect(page.getByRole('status').filter({ hasText: 'committed' })).toBeVisible();

  await page.goto('/past-years/jee/jee-main/physics/waves');
  await expect(page.getByTestId('question-card')).toHaveCount(1);
  await expect(page.getByTestId('question-card')).toContainText('E2E imported question');

  await page.goto('/admin/imports');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('import-history').getByRole('button', { name: 'Roll back' }).first().click();
  await expect(page.getByRole('status').filter({ hasText: 'Rolled back' })).toContainText('1 questions archived');
  await page.goto('/past-years/jee/jee-main/physics/waves');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('edit a question with live preview, creating a revision and a new answer-key version', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin/questions?exam=gujcet');
  await page.getByTestId('admin-questions').getByRole('link').first().click();
  await expect(page.getByTestId('preview')).toBeVisible();
  const body = page.getByTestId('body-input');
  await body.fill((await body.inputValue()) + ' $\\sqrt{x}$');
  await expect(page.getByTestId('preview').locator('.katex').last()).toBeVisible();
  await page.getByTestId('change-note').fill('E2E edit');
  await page.getByTestId('save-question').click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await expect(page.getByTestId('revisions')).toContainText('E2E edit');

  await page.getByLabel('New answer').fill('A');
  await page.getByLabel('Key status').selectOption('disputed');
  await page.getByLabel('Key note').fill('Raised by a student');
  await page.getByRole('button', { name: 'Add version' }).click();
  await expect(page.getByTestId('admin-key-history')).toContainText('Disputed');

  await page.getByTestId('unpublish').click();
  await expect(page.getByTestId('publish')).toBeVisible();
  await page.getByTestId('publish').click();
  await expect(page.getByTestId('unpublish')).toBeVisible();
});

test('report resolution workflow and audit log', async ({ page }) => {
  await page.goto('/past-years/jee/ojee/physics/electromagnetic-waves');
  await page.getByTestId('question-card').first().getByRole('button', { name: 'Report' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toBeVisible();
  await loginAdmin(page);
  await page.goto('/admin/reports');
  const row = page.getByTestId('report-row').first();
  await row.getByRole('button', { name: 'Accept & flag question' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Report updated' })).toBeVisible();
  await page.goto('/admin/audit');
  await expect(page.getByTestId('audit-log')).toContainText('report.update');
});
