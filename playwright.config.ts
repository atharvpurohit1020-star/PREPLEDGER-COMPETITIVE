import { defineConfig, devices } from '@playwright/test';

const PORT = 4100;
const env = [
  'NODE_ENV=test',
  `PORT=${PORT}`,
  `PUBLIC_ORIGIN=http://localhost:${PORT}`,
  `DATABASE_URL=${process.env.E2E_DATABASE_URL ?? 'postgres://prepledger:prepledger@localhost:5432/prepledger_e2e'}`,
  'SESSION_SECRET=e2e-secret-e2e-secret-e2e-secret-1234',
  'ADMIN_EMAIL=admin@e2e.local',
  'ADMIN_PASSWORD=admin-e2e-password',
].join(' ');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `env ${env} npx tsx scripts/seed.ts --reset --no-practice && env ${env} npx tsx server/index.ts`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
