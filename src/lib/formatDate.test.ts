import { formatLongDate, formatTimeOfDay } from './formatDate';

describe('formatLongDate', () => {
  it('formatea una fecha entre semana', () => {
    // Miércoles 21 de octubre de 2026.
    expect(formatLongDate(new Date(2026, 9, 21))).toBe(
      'miércoles 21 de octubre',
    );
  });

  it('formatea un domingo de enero', () => {
    expect(formatLongDate(new Date(2026, 0, 4))).toBe('domingo 4 de enero');
  });
});

describe('formatTimeOfDay', () => {
  it('rellena con ceros horas y minutos de un solo dígito', () => {
    expect(formatTimeOfDay(new Date(2026, 0, 1, 8, 5))).toBe('08:05');
  });

  it('formatea mediodía y medianoche', () => {
    expect(formatTimeOfDay(new Date(2026, 0, 1, 0, 0))).toBe('00:00');
    expect(formatTimeOfDay(new Date(2026, 0, 1, 23, 59))).toBe('23:59');
  });
});
