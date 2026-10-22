import { MIGRATIONS } from './schema';

export type PendingMigration = { version: number; statements: string[] };

// Pura e independiente de SQLite para poder probarla sin una base real.
export function pendingMigrations(currentVersion: number): PendingMigration[] {
  return MIGRATIONS.slice(currentVersion).map((statements, i) => ({
    version: currentVersion + i + 1,
    statements,
  }));
}
