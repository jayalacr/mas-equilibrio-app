import { formatLongDate } from './formatDate';

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
