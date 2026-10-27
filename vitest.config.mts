import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://prepledger:prepledger@localhost:5432/prepledger_test',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-123',
      ADMIN_EMAIL: 'admin@test.local',
      ADMIN_PASSWORD: 'admin-test-password',
      PUBLIC_ORIGIN: 'http://localhost:4000',
    },
  },
});
