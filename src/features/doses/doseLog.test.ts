import { groupDosesByDay, type DoseLogEntry } from './doseLog';

function entry(id: string, scheduled: Date): DoseLogEntry {
  return {
    id,
    medicationId: 'm1',
    medicationName: 'Metformina',
    presentation: 'tablet',
    doseDescription: '850 mg',
    quantityTaken: 1,
    scheduledTime: scheduled.toISOString(),
    takenAt: scheduled.toISOString(),
    injectionSite: null,
    sideEffectNote: null,
  };
}

describe('groupDosesByDay', () => {
  it('groups by local day, newest first', () => {
    const days = groupDosesByDay([
      entry('a', new Date(2026, 10, 9, 8, 0)),
      entry('c', new Date(2026, 10, 10, 20, 0)),
      entry('b', new Date(2026, 10, 10, 8, 0)),
    ]);
    expect(days.map((d) => d.day)).toEqual([new Date(2026, 10, 10), new Date(2026, 10, 9)]);
    expect(days[0].data.map((e) => e.id)).toEqual(['c', 'b']);
  });

  it('keeps a late-night dose on its local day', () => {
    // 23:30 local puede ser del día siguiente en UTC.
    const [day] = groupDosesByDay([entry('late', new Date(2026, 10, 10, 23, 30))]);
    expect(day.day).toEqual(new Date(2026, 10, 10));
  });

  it('returns nothing for no doses', () => {
    expect(groupDosesByDay([])).toEqual([]);
  });
});
