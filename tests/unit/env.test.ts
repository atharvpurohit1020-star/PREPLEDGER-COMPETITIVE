import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../server/env';

describe('loadEnv', () => {
  const ok = { DATABASE_URL: 'postgres://u:p@localhost:5432/db', SESSION_SECRET: 'x'.repeat(32) };
  it('accepts a valid config with defaults', () => {
    const e = loadEnv(ok as any);
    expect(e.PORT).toBe(4000);
    expect(e.CHROMIUM_PATH).toBeUndefined();
  });
  it('rejects short secrets and non-postgres URLs with readable messages', () => {
    expect(() => loadEnv({ ...ok, SESSION_SECRET: 'short' } as any)).toThrow(/SESSION_SECRET/);
    expect(() => loadEnv({ ...ok, DATABASE_URL: 'mysql://x/y' } as any)).toThrow(/DATABASE_URL/);
  });
});
