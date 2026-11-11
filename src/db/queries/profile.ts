import * as Crypto from 'expo-crypto';

import { getDatabase } from '../index';

export type UserProfile = {
  id: string;
  displayName: string | null;
};

/** null mientras no se haya pasado por la bienvenida. */
export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();
  return db.getFirstAsync<UserProfile>(
    'SELECT id, display_name as displayName FROM user_profile LIMIT 1'
  );
}

/** Crea el perfil al terminar la bienvenida. El nombre es opcional. */
export async function createProfile(displayName: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO user_profile (id, display_name, created_at) VALUES (?, ?, ?)',
    [Crypto.randomUUID(), displayName.trim() || null, new Date().toISOString()]
  );
}
