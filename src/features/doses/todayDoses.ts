import type { Frequency } from '@/db/queries/medications';

export type InjectionSite = 'abdomen' | 'thigh' | 'arm';

export const INJECTION_SITE_LABELS: Record<InjectionSite, string> = {
  abdomen: 'Abdomen',
  thigh: 'Muslo',
  arm: 'Brazo',
};

export type ScheduledMedication = {
  id: string;
  timeOfDay: string; // "HH:MM" hora local
  frequency: Frequency;
  dayOfWeek: number | null; // 0 = lunes … 6 = domingo (como en Medicamentos)
  createdAt: string; // ISO UTC
};

export type TakenDose = {
  id: string;
  medicationId: string;
  scheduledTime: string; // ISO UTC del momento programado
  takenAt: string; // ISO UTC
  injectionSite: InjectionSite | null;
};

export type TodayDose<M extends ScheduledMedication> = {
  medication: M;
  scheduledAt: Date;
  /** Clave de la toma en `doses_taken.scheduled_time`. */
  scheduledTime: string;
  /** Semanal de un día anterior que sigue sin marcarse (o se marcó tarde, hoy). */
  fromPastDay: boolean;
  taken: TakenDose | null;
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Fecha local del día de hoy o, si es semanal, de su ocurrencia más reciente. */
function occurrenceDay(med: ScheduledMedication, now: Date): Date {
  const today = startOfLocalDay(now);
  if (med.frequency === 'daily' || med.dayOfWeek === null) return today;
  // getDay(): 0 = domingo. En la app 0 = lunes, así que se recorre un lugar.
  const todayIndex = (now.getDay() + 6) % 7;
  const daysBack = (todayIndex - med.dayOfWeek + 7) % 7;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBack);
}

/**
 * Toma registrada que cubre la ocurrencia de `day`: cualquiera del mismo
 * medicamento programada dentro del periodo que termina ese día (1 día si es
 * diario, 7 si es semanal). Así, cambiar la hora o el día de la semana no hace
 * que una toma ya hecha se vuelva a pedir (evita una doble dosis).
 */
export function findTakenForOccurrence(
  medication: ScheduledMedication,
  takenDoses: TakenDose[],
  day: Date
): TakenDose | null {
  const periodDays = medication.frequency === 'weekly' ? 7 : 1;
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - periodDays);
  return (
    takenDoses.find((t) => {
      const scheduled = new Date(t.scheduledTime);
      return t.medicationId === medication.id && scheduled >= start && scheduled < end;
    }) ?? null
  );
}

/**
 * Lista de tomas que se muestran hoy, ordenadas por hora programada.
 * Las semanales sin marcar siguen apareciendo hasta que se marquen o llegue
 * su siguiente día.
 */
export function buildTodayDoses<M extends ScheduledMedication>(
  medications: M[],
  takenDoses: TakenDose[],
  now: Date
): TodayDose<M>[] {
  const result: TodayDose<M>[] = [];

  for (const medication of medications) {
    const day = occurrenceDay(medication, now);
    // No mostrar como pendiente algo de antes de dar de alta el medicamento.
    if (day < startOfLocalDay(new Date(medication.createdAt))) continue;

    const [hours, minutes] = medication.timeOfDay.split(':').map(Number);
    const scheduledAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
    const scheduledTime = scheduledAt.toISOString();
    const taken = findTakenForOccurrence(medication, takenDoses, day);

    const fromPastDay = !isSameLocalDay(day, now);
    if (fromPastDay && taken && !isSameLocalDay(new Date(taken.takenAt), now)) continue;

    result.push({ medication, scheduledAt, scheduledTime, fromPastDay, taken });
  }

  return result.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}
