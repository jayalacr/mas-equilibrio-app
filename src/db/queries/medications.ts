import * as Crypto from 'expo-crypto';

import { parseDecimal } from '@/features/medications/validateMedicationForm';
import { formatTimeOfDay } from '@/lib/formatDate';

import { getDatabase } from '../index';

export type Presentation = 'pen' | 'tablet';
export type Frequency = 'daily' | 'weekly';

export type NewMedicationInput = {
  name: string;
  presentation: Presentation;
  doseAmount: string;
  doseUnit: string;
  quantityPerDose: string;
  time: Date;
  frequency: Frequency;
  dayOfWeek: number | null;
};

export type MedicationWithSchedule = {
  id: string;
  name: string;
  presentation: Presentation;
  unitLabel: string;
  doseDescription: string;
  /** Clicks o tabletas por toma; null en medicamentos dados de alta antes de v2. */
  quantityPerDose: number | null;
  timeOfDay: string;
  frequency: Frequency;
  dayOfWeek: number | null;
  createdAt: string;
};

export type DoseHistoryEntry = {
  id: string;
  doseDescription: string;
  quantityPerDose: number | null;
  changedAt: string;
  note: string | null;
};

export type DoseChangeInput = {
  medicationId: string;
  doseAmount: string;
  doseUnit: string;
  quantityPerDose: string;
  note: string;
};

export async function createMedication(input: NewMedicationInput): Promise<string> {
  const db = await getDatabase();
  const medicationId = Crypto.randomUUID();
  const now = new Date().toISOString();
  const doseDescription = `${input.doseAmount.replace(',', '.')} ${input.doseUnit}`;
  const quantityPerDose = parseDecimal(input.quantityPerDose);
  const timeOfDay = formatTimeOfDay(input.time);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO medications (id, name, presentation, unit_label, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [medicationId, input.name, input.presentation, input.doseUnit, now]
    );
    await db.runAsync(
      `INSERT INTO dose_schedules
         (id, medication_id, dose_description, quantity_per_dose, time_of_day, frequency,
          day_of_week, active_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        medicationId,
        doseDescription,
        quantityPerDose,
        timeOfDay,
        input.frequency,
        input.dayOfWeek,
        now,
      ]
    );
    await db.runAsync(
      `INSERT INTO dose_history
         (id, medication_id, dose_description, quantity_per_dose, changed_at, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), medicationId, doseDescription, quantityPerDose, now, 'Alta inicial']
    );
  });

  return medicationId;
}

export async function changeDose(input: DoseChangeInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const doseDescription = `${input.doseAmount.replace(',', '.')} ${input.doseUnit}`;
  const quantityPerDose = parseDecimal(input.quantityPerDose);

  await db.withTransactionAsync(async () => {
    const activeSchedule = await db.getFirstAsync<{
      id: string;
      time_of_day: string;
      frequency: Frequency;
      day_of_week: number | null;
    }>(
      `SELECT id, time_of_day, frequency, day_of_week FROM dose_schedules
       WHERE medication_id = ? AND active_to IS NULL`,
      [input.medicationId]
    );
    if (!activeSchedule) return;

    await db.runAsync('UPDATE dose_schedules SET active_to = ? WHERE id = ?', [
      now,
      activeSchedule.id,
    ]);
    await db.runAsync(
      `INSERT INTO dose_schedules
         (id, medication_id, dose_description, quantity_per_dose, time_of_day, frequency,
          day_of_week, active_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        input.medicationId,
        doseDescription,
        quantityPerDose,
        activeSchedule.time_of_day,
        activeSchedule.frequency,
        activeSchedule.day_of_week,
        now,
      ]
    );
    await db.runAsync(
      `INSERT INTO dose_history
         (id, medication_id, dose_description, quantity_per_dose, changed_at, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        input.medicationId,
        doseDescription,
        quantityPerDose,
        now,
        input.note.trim() || null,
      ]
    );
    await db.runAsync('UPDATE medications SET unit_label = ? WHERE id = ?', [
      input.doseUnit,
      input.medicationId,
    ]);
  });
}

export async function listDoseHistory(medicationId: string): Promise<DoseHistoryEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseHistoryEntry>(
    `SELECT id as id, dose_description as doseDescription,
            quantity_per_dose as quantityPerDose, changed_at as changedAt, note as note
     FROM dose_history
     WHERE medication_id = ?
     ORDER BY changed_at DESC`,
    [medicationId]
  );
}

export async function listMedicationsWithSchedule(): Promise<MedicationWithSchedule[]> {
  const db = await getDatabase();
  return db.getAllAsync<MedicationWithSchedule>(
    `SELECT
       m.id as id,
       m.name as name,
       m.presentation as presentation,
       m.unit_label as unitLabel,
       s.dose_description as doseDescription,
       s.quantity_per_dose as quantityPerDose,
       s.time_of_day as timeOfDay,
       s.frequency as frequency,
       s.day_of_week as dayOfWeek,
       m.created_at as createdAt
     FROM medications m
     JOIN dose_schedules s ON s.medication_id = m.id AND s.active_to IS NULL
     WHERE m.archived_at IS NULL
     ORDER BY m.created_at DESC`
  );
}

export type MedicationEditInput = {
  name: string;
  time: Date;
  frequency: Frequency;
  dayOfWeek: number | null;
};

export type ArchivedMedication = {
  id: string;
  name: string;
  archivedAt: string;
};

/**
 * Cambia nombre y horario. Si el horario cambia, se cierra el vigente y se abre
 * uno nuevo (igual que en changeDose) para conservar a qué hora tocaba cada toma.
 */
export async function updateMedication(id: string, input: MedicationEditInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const timeOfDay = formatTimeOfDay(input.time);
  const dayOfWeek = input.frequency === 'weekly' ? input.dayOfWeek : null;

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE medications SET name = ? WHERE id = ?', [input.name.trim(), id]);

    const active = await db.getFirstAsync<{
      id: string;
      dose_description: string;
      quantity_per_dose: number | null;
      time_of_day: string;
      frequency: Frequency;
      day_of_week: number | null;
    }>(
      `SELECT id, dose_description, quantity_per_dose, time_of_day, frequency, day_of_week
       FROM dose_schedules WHERE medication_id = ? AND active_to IS NULL`,
      [id]
    );
    if (
      !active ||
      (active.time_of_day === timeOfDay &&
        active.frequency === input.frequency &&
        active.day_of_week === dayOfWeek)
    ) {
      return;
    }

    await db.runAsync('UPDATE dose_schedules SET active_to = ? WHERE id = ?', [now, active.id]);
    await db.runAsync(
      `INSERT INTO dose_schedules
         (id, medication_id, dose_description, quantity_per_dose, time_of_day, frequency,
          day_of_week, active_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        id,
        active.dose_description,
        active.quantity_per_dose,
        timeOfDay,
        input.frequency,
        dayOfWeek,
        now,
      ]
    );
  });
}

/** Suspender: deja de aparecer en Hoy y en recordatorios. No borra nada. */
export async function archiveMedication(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE medications SET archived_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

export async function unarchiveMedication(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE medications SET archived_at = NULL WHERE id = ?', [id]);
}

export async function listArchivedMedications(): Promise<ArchivedMedication[]> {
  const db = await getDatabase();
  return db.getAllAsync<ArchivedMedication>(
    `SELECT id, name, archived_at as archivedAt FROM medications
     WHERE archived_at IS NOT NULL ORDER BY archived_at DESC`
  );
}
