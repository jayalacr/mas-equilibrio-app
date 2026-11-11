import type { TakenDose } from '@/features/doses/todayDoses';

import { followUpBody, planReminders, reminderBody, toExpoWeekday, type ReminderMedication } from './plan';

// Lunes 2 de noviembre de 2026, 07:00 hora local.
const now = new Date(2026, 10, 2, 7, 0);

const metformin: ReminderMedication = {
  id: 'met',
  name: 'Metformina',
  presentation: 'tablet',
  timeOfDay: '08:00',
  frequency: 'daily',
  dayOfWeek: null,
  createdAt: new Date(2026, 9, 1).toISOString(),
};

const wegovy: ReminderMedication = {
  id: 'weg',
  name: 'Wegovy',
  presentation: 'pen',
  timeOfDay: '09:30',
  frequency: 'weekly',
  dayOfWeek: 0, // lunes
  createdAt: new Date(2026, 9, 1).toISOString(),
};

const takenAt = (med: ReminderMedication, day: number, time: string): TakenDose => {
  const [h, m] = time.split(':').map(Number);
  const scheduled = new Date(2026, 10, day, h, m).toISOString();
  return { id: 'x', medicationId: med.id, scheduledTime: scheduled, takenAt: scheduled, injectionSite: null };
};

describe('toExpoWeekday', () => {
  it('maps monday-first days to sunday-first 1–7', () => {
    expect(toExpoWeekday(0)).toBe(2); // lunes
    expect(toExpoWeekday(5)).toBe(7); // sábado
    expect(toExpoWeekday(6)).toBe(1); // domingo
  });
});

describe('texts', () => {
  it('uses the name when there is one', () => {
    expect(reminderBody(metformin, 'Ana')).toBe('Ana, es hora de tu Metformina 🌱');
    expect(followUpBody(wegovy, 'Ana')).toBe(
      'Ana, ¿ya pudiste aplicarte tu Wegovy? Si ya lo hiciste, márcalo en Hoy.'
    );
  });

  it('capitalizes without a name', () => {
    expect(reminderBody(metformin, null)).toBe('Es hora de tu Metformina 🌱');
    expect(followUpBody(metformin, null)).toBe(
      '¿Ya pudiste tomar tu Metformina? Si ya lo hiciste, márcalo en Hoy.'
    );
  });
});

describe('planReminders', () => {
  it('schedules one repeating reminder per medication', () => {
    const reminders = planReminders([metformin, wegovy], [], null, now);
    expect(reminders.find((r) => r.id === 'dose:met')?.trigger).toEqual({
      kind: 'daily',
      hour: 8,
      minute: 0,
    });
    expect(reminders.find((r) => r.id === 'dose:weg')?.trigger).toEqual({
      kind: 'weekly',
      weekday: 2,
      hour: 9,
      minute: 30,
    });
  });

  it('adds follow-ups 30 min later for today and tomorrow (daily)', () => {
    const followUps = planReminders([metformin], [], null, now).filter((r) => r.trigger.kind === 'date');
    expect(followUps.map((r) => r.trigger)).toEqual([
      { kind: 'date', date: new Date(2026, 10, 2, 8, 30) },
      { kind: 'date', date: new Date(2026, 10, 3, 8, 30) },
    ]);
  });

  it('only adds a weekly follow-up on its day', () => {
    const followUps = planReminders([wegovy], [], null, now).filter((r) => r.trigger.kind === 'date');
    expect(followUps).toHaveLength(1);
    expect(followUps[0].trigger).toEqual({ kind: 'date', date: new Date(2026, 10, 2, 10, 0) });
  });

  it('skips the follow-up when the dose is already marked', () => {
    const reminders = planReminders([metformin], [takenAt(metformin, 2, '08:00')], null, now);
    const followUps = reminders.filter((r) => r.trigger.kind === 'date');
    expect(followUps).toHaveLength(1);
    expect(followUps[0].trigger).toEqual({ kind: 'date', date: new Date(2026, 10, 3, 8, 30) });
  });

  it('skips follow-ups whose time already passed', () => {
    const late = new Date(2026, 10, 2, 9, 0);
    const followUps = planReminders([metformin], [], null, late).filter((r) => r.trigger.kind === 'date');
    expect(followUps).toHaveLength(1);
  });

  it('skips follow-ups before the medication was created', () => {
    const created = { ...metformin, createdAt: new Date(2026, 10, 3, 6, 0).toISOString() };
    const followUps = planReminders([created], [], null, now).filter((r) => r.trigger.kind === 'date');
    expect(followUps.map((r) => r.trigger)).toEqual([
      { kind: 'date', date: new Date(2026, 10, 3, 8, 30) },
    ]);
  });
});
