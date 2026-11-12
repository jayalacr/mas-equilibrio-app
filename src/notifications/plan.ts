import type { Presentation } from '@/db/queries/medications';
import {
  findTakenForOccurrence,
  type ScheduledMedication,
  type TakenDose,
} from '@/features/doses/todayDoses';

/** Minutos después de la hora programada para el segundo aviso. */
export const FOLLOW_UP_MINUTES = 30;
/** Días (hoy incluido) para los que se programa el segundo aviso. */
export const FOLLOW_UP_DAYS = 2;

export type ReminderMedication = ScheduledMedication & {
  name: string;
  presentation: Presentation;
};

export type ReminderTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  /** weekday como lo usa expo-notifications: 1 = domingo … 7 = sábado. */
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  | { kind: 'date'; date: Date };

export type Reminder = {
  /** Estable: volver a programar con el mismo id reemplaza al anterior. */
  id: string;
  title: string;
  body: string;
  trigger: ReminderTrigger;
};

/** En la app 0 = lunes … 6 = domingo; en expo-notifications 1 = domingo … 7 = sábado. */
export function toExpoWeekday(dayOfWeek: number): number {
  return ((dayOfWeek + 1) % 7) + 1;
}

// Textos de Liria: sin culpa ni presión, y sin palabras que dependan del género.
function withName(name: string | null, sentence: string): string {
  // Mayúscula en la primera letra, aunque empiece con «¿».
  if (!name) return sentence.replace(/\p{L}/u, (letter) => letter.toUpperCase());
  return `${name}, ${sentence}`;
}

export function reminderBody(med: ReminderMedication, name: string | null): string {
  return withName(name, `es hora de tu ${med.name} 🌱`);
}

export function followUpBody(med: ReminderMedication, name: string | null): string {
  const verb = med.presentation === 'pen' ? 'aplicarte' : 'tomar';
  return withName(name, `¿ya pudiste ${verb} tu ${med.name}? Si ya lo hiciste, márcalo en Hoy.`);
}

function parseTime(timeOfDay: string): { hour: number; minute: number } {
  const [hour, minute] = timeOfDay.split(':').map(Number);
  return { hour, minute };
}

/**
 * Todos los recordatorios que deben estar programados ahora:
 * uno repetitivo por medicamento (diario o semanal) y, para hoy y mañana,
 * un segundo aviso de una sola vez si esa toma no está marcada.
 */
// ponytail: los segundos avisos solo cubren 2 días; si la app no se abre en
// más tiempo, siguen llegando los principales pero no los segundos.
export function planReminders(
  medications: ReminderMedication[],
  taken: TakenDose[],
  name: string | null,
  now: Date
): Reminder[] {
  const reminders: Reminder[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const med of medications) {
    const { hour, minute } = parseTime(med.timeOfDay);
    const weekly = med.frequency === 'weekly' && med.dayOfWeek !== null;

    reminders.push({
      id: `dose:${med.id}`,
      title: 'Liria',
      body: reminderBody(med, name),
      trigger: weekly
        ? { kind: 'weekly', weekday: toExpoWeekday(med.dayOfWeek!), hour, minute }
        : { kind: 'daily', hour, minute },
    });

    const created = new Date(med.createdAt);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());

    for (let offset = 0; offset < FOLLOW_UP_DAYS; offset++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      if (weekly && (day.getDay() + 6) % 7 !== med.dayOfWeek) continue;
      if (day < createdDay) continue;

      const scheduledAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
      const followUpAt = new Date(scheduledAt.getTime() + FOLLOW_UP_MINUTES * 60_000);
      if (followUpAt <= now) continue;

      if (findTakenForOccurrence(med, taken, day)) continue;
      const scheduledTime = scheduledAt.toISOString();

      reminders.push({
        id: `followup:${med.id}:${scheduledTime}`,
        title: 'Liria',
        body: followUpBody(med, name),
        trigger: { kind: 'date', date: followUpAt },
      });
    }
  }

  return reminders;
}
