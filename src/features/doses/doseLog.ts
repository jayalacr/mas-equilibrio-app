import type { Presentation } from '@/db/queries/medications';

import type { InjectionSite } from './todayDoses';

export type DoseLogEntry = {
  id: string;
  medicationId: string;
  medicationName: string;
  presentation: Presentation;
  doseDescription: string;
  quantityTaken: number | null;
  scheduledTime: string; // ISO UTC
  takenAt: string; // ISO UTC
  injectionSite: InjectionSite | null;
  sideEffectNote: string | null;
};

export type DoseLogDay = {
  /** Medianoche local del día. */
  day: Date;
  data: DoseLogEntry[];
};

/**
 * Agrupa por día local de la hora programada (no por fecha UTC: una toma de
 * las 23:30 en México ya es del día siguiente en UTC). Días y tomas, de la
 * más reciente a la más vieja.
 */
export function groupDosesByDay(entries: DoseLogEntry[]): DoseLogDay[] {
  const sorted = [...entries].sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime));
  const days: DoseLogDay[] = [];
  for (const entry of sorted) {
    const scheduled = new Date(entry.scheduledTime);
    const day = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
    const last = days[days.length - 1];
    if (last && last.day.getTime() === day.getTime()) last.data.push(entry);
    else days.push({ day, data: [entry] });
  }
  return days;
}
