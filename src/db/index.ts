import * as SQLite from 'expo-sqlite';

import { pendingMigrations } from './migrations';

const DATABASE_NAME = 'mas-equilibrio.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const { user_version: currentVersion } = (await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  ))!;

  for (const migration of pendingMigrations(currentVersion)) {
    await db.execAsync(migration.statements.join('\n'));
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }

  return db;
}

// Singleton: la conexión se abre una sola vez por proceso.
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = openAndMigrate();
  return dbPromise;
}
