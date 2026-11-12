import * as Crypto from 'expo-crypto';

import type { DoseLogEntry } from '@/features/doses/doseLog';
import type { InjectionSite, TakenDose } from '@/features/doses/todayDoses';

import { getDatabase } from '../index';
import { adjustStockBy } from './inventory';

export type RecordDoseInput = {
  medicationId: string;
  scheduledTime: string;
  takenAt: Date;
  doseDescription: string;
  /** Lo que se descuenta del inventario; null si el medicamento aún no lo tiene. */
  quantity: number | null;
  injectionSite: InjectionSite | null;
  sideEffectNote: string;
};

// La toma y el descuento van en una transacción: o se guardan ambos o ninguno.
export async function recordDoseTaken(input: RecordDoseInput): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO doses_taken
         (id, medication_id, scheduled_time, taken_at, dose_description, quantity_taken,
          injection_site, side_effect_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        input.medicationId,
        input.scheduledTime,
        input.takenAt.toISOString(),
        input.doseDescription,
        input.quantity,
        input.injectionSite,
        input.sideEffectNote.trim() || null,
      ]
    );
    if (input.quantity) await adjustStockBy(db, input.medicationId, -input.quantity);
  });
}

// ponytail: borrado físico; si hace falta auditar tomas deshechas, marcar con `undone_at`.
export async function undoDoseTaken(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const dose = await db.getFirstAsync<{ medication_id: string; quantity_taken: number | null }>(
      'SELECT medication_id, quantity_taken FROM doses_taken WHERE id = ?',
      [id]
    );
    if (!dose) return;
    if (dose.quantity_taken) await adjustStockBy(db, dose.medication_id, dose.quantity_taken);
    await db.runAsync('DELETE FROM doses_taken WHERE id = ?', [id]);
  });
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

/** Todas las tomas registradas, incluidas las de medicamentos suspendidos. */
// ponytail: sin paginación; SectionList solo dibuja lo visible. Paginar si se nota lento.
export async function listDoseLog(): Promise<DoseLogEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseLogEntry>(
    `SELECT d.id as id, d.medication_id as medicationId, m.name as medicationName,
            m.presentation as presentation, d.dose_description as doseDescription,
            d.quantity_taken as quantityTaken, d.scheduled_time as scheduledTime,
            d.taken_at as takenAt, d.injection_site as injectionSite,
            d.side_effect_note as sideEffectNote
     FROM doses_taken d
     JOIN medications m ON m.id = d.medication_id
     ORDER BY d.scheduled_time DESC`
  );
}
