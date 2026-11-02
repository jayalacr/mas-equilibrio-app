import * as Crypto from 'expo-crypto';

import { formatTimeOfDay } from '@/lib/formatDate';

import { getDatabase } from '../index';

export type Presentation = 'pen' | 'tablet';
export type Frequency = 'daily' | 'weekly';

export type NewMedicationInput = {
  name: string;
  presentation: Presentation;
  doseAmount: string;
  doseUnit: string;
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
  timeOfDay: string;
  frequency: Frequency;
  dayOfWeek: number | null;
  createdAt: string;
};

export type DoseHistoryEntry = {
  id: string;
  doseDescription: string;
  changedAt: string;
  note: string | null;
};

export type DoseChangeInput = {
  medicationId: string;
  doseAmount: string;
  doseUnit: string;
  note: string;
};

export async function createMedication(input: NewMedicationInput): Promise<string> {
  const db = await getDatabase();
  const medicationId = Crypto.randomUUID();
  const now = new Date().toISOString();
  const doseDescription = `${input.doseAmount.replace(',', '.')} ${input.doseUnit}`;
  const timeOfDay = formatTimeOfDay(input.time);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO medications (id, name, presentation, unit_label, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [medicationId, input.name, input.presentation, input.doseUnit, now]
    );
    await db.runAsync(
      `INSERT INTO dose_schedules
         (id, medication_id, dose_description, time_of_day, frequency, day_of_week, active_from)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        medicationId,
        doseDescription,
        timeOfDay,
        input.frequency,
        input.dayOfWeek,
        now,
      ]
    );
    await db.runAsync(
      `INSERT INTO dose_history (id, medication_id, dose_description, changed_at, note)
       VALUES (?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), medicationId, doseDescription, now, 'Alta inicial']
    );
  });

  return medicationId;
}

export async function changeDose(input: DoseChangeInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const doseDescription = `${input.doseAmount.replace(',', '.')} ${input.doseUnit}`;

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
         (id, medication_id, dose_description, time_of_day, frequency, day_of_week, active_from)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        input.medicationId,
        doseDescription,
        activeSchedule.time_of_day,
        activeSchedule.frequency,
        activeSchedule.day_of_week,
        now,
      ]
    );
    await db.runAsync(
      `INSERT INTO dose_history (id, medication_id, dose_description, changed_at, note)
       VALUES (?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), input.medicationId, doseDescription, now, input.note.trim() || null]
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
    `SELECT id as id, dose_description as doseDescription, changed_at as changedAt, note as note
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
