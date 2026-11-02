import * as Crypto from 'expo-crypto';

import type { InjectionSite, TakenDose } from '@/features/doses/todayDoses';

import { getDatabase } from '../index';

export type RecordDoseInput = {
  medicationId: string;
  scheduledTime: string;
  takenAt: Date;
  doseDescription: string;
  injectionSite: InjectionSite | null;
  sideEffectNote: string;
};

export async function recordDoseTaken(input: RecordDoseInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO doses_taken
       (id, medication_id, scheduled_time, taken_at, dose_description, injection_site, side_effect_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      Crypto.randomUUID(),
      input.medicationId,
      input.scheduledTime,
      input.takenAt.toISOString(),
      input.doseDescription,
      input.injectionSite,
      input.sideEffectNote.trim() || null,
    ]
  );
}

// ponytail: borrado físico; en la 1.5 también debe regresar el inventario descontado.
export async function undoDoseTaken(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM doses_taken WHERE id = ?', [id]);
}

/** Tomas cuyo momento programado es igual o posterior a `fromIso` (UTC). */
export async function listDosesTakenSince(fromIso: string): Promise<TakenDose[]> {
  const db = await getDatabase();
  return db.getAllAsync<TakenDose>(
    `SELECT id as id, medication_id as medicationId, scheduled_time as scheduledTime,
            taken_at as takenAt, injection_site as injectionSite
     FROM doses_taken
     WHERE scheduled_time >= ?`,
    [fromIso]
  );
}

export async function getLastInjectionSite(medicationId: string): Promise<InjectionSite | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ injection_site: InjectionSite }>(
    `SELECT injection_site FROM doses_taken
     WHERE medication_id = ? AND injection_site IS NOT NULL
     ORDER BY taken_at DESC LIMIT 1`,
    [medicationId]
  );
  return row?.injection_site ?? null;
}
