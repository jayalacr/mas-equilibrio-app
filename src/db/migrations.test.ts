import { pendingMigrations } from './migrations';
import { MIGRATIONS } from './schema';

describe('pendingMigrations', () => {
  it('returns every migration starting at version 0', () => {
    const pending = pendingMigrations(0);
    expect(pending).toHaveLength(MIGRATIONS.length);
    expect(pending[0].version).toBe(1);
  });

  it('skips migrations already applied', () => {
    const pending = pendingMigrations(MIGRATIONS.length);
    expect(pending).toHaveLength(0);
  });
});
