import { buildTodayDoses, type ScheduledMedication, type TakenDose } from './todayDoses';

// Sábado 31 de octubre de 2026, 10:00 hora local. Lunes = 26 de octubre.
const NOW = new Date(2026, 9, 31, 10, 0);
const CREATED = new Date(2026, 9, 1).toISOString();

function med(overrides: Partial<ScheduledMedication>): ScheduledMedication {
  return {
    id: 'm1',
    timeOfDay: '08:00',
    frequency: 'daily',
    dayOfWeek: null,
    createdAt: CREATED,
    ...overrides,
  };
}

function taken(medicationId: string, scheduledAt: Date, takenAt: Date): TakenDose {
  return {
    id: `t-${medicationId}`,
    medicationId,
    scheduledTime: scheduledAt.toISOString(),
    takenAt: takenAt.toISOString(),
    injectionSite: null,
  };
}

describe('buildTodayDoses', () => {
  it('incluye los diarios ordenados por hora', () => {
    const doses = buildTodayDoses(
      [med({ id: 'b', timeOfDay: '20:00' }), med({ id: 'a', timeOfDay: '08:00' })],
      [],
      NOW
    );
    expect(doses.map((d) => d.medication.id)).toEqual(['a', 'b']);
    expect(doses[0].scheduledAt).toEqual(new Date(2026, 9, 31, 8, 0));
    expect(doses[0].fromPastDay).toBe(false);
  });

  it('marca como tomada la toma de hoy, pero no la de ayer', () => {
    const yesterday = taken('m1', new Date(2026, 9, 30, 8, 0), new Date(2026, 9, 30, 8, 5));
    expect(buildTodayDoses([med({})], [yesterday], NOW)[0].taken).toBeNull();

    const today = taken('m1', new Date(2026, 9, 31, 8, 0), new Date(2026, 9, 31, 8, 30));
    expect(buildTodayDoses([med({})], [today], NOW)[0].taken?.id).toBe('t-m1');
  });

  it('muestra la semanal en su día (sábado = 5)', () => {
    const [dose] = buildTodayDoses([med({ frequency: 'weekly', dayOfWeek: 5 })], [], NOW);
    expect(dose.scheduledAt).toEqual(new Date(2026, 9, 31, 8, 0));
    expect(dose.fromPastDay).toBe(false);
  });

  it('sigue mostrando una semanal pendiente de un día anterior', () => {
    // Lunes 26 sin marcar.
    const [dose] = buildTodayDoses([med({ frequency: 'weekly', dayOfWeek: 0 })], [], NOW);
    expect(dose.scheduledAt).toEqual(new Date(2026, 9, 26, 8, 0));
    expect(dose.fromPastDay).toBe(true);
    expect(dose.taken).toBeNull();
  });

  it('oculta la semanal de un día anterior si ya se marcó ese día', () => {
    const t = taken('m1', new Date(2026, 9, 26, 8, 0), new Date(2026, 9, 26, 9, 0));
    expect(buildTodayDoses([med({ frequency: 'weekly', dayOfWeek: 0 })], [t], NOW)).toEqual([]);
  });

  it('deja visible la semanal atrasada si se marcó hoy (para poder deshacer)', () => {
    const t = taken('m1', new Date(2026, 9, 26, 8, 0), new Date(2026, 9, 31, 9, 0));
    const [dose] = buildTodayDoses([med({ frequency: 'weekly', dayOfWeek: 0 })], [t], NOW);
    expect(dose.taken?.id).toBe('t-m1');
  });

  it('no muestra pendientes de antes de dar de alta el medicamento', () => {
    const createdAt = new Date(2026, 9, 29).toISOString();
    expect(
      buildTodayDoses([med({ frequency: 'weekly', dayOfWeek: 0, createdAt })], [], NOW)
    ).toEqual([]);
  });
});
