import {
  adjustStock,
  buildStockStatus,
  dailyConsumption,
  daysOfStockLeft,
  isLowStock,
  type StockMedication,
} from './stock';

const now = new Date('2026-11-02T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const metformin: StockMedication = {
  id: 'met',
  quantityPerDose: 2,
  frequency: 'daily',
};
const wegovy: StockMedication = {
  id: 'weg',
  quantityPerDose: 4,
  frequency: 'weekly',
};

describe('adjustStock', () => {
  it('discounts and restores a dose', () => {
    expect(adjustStock(30, -2)).toBe(28);
    expect(adjustStock(28, 2)).toBe(30);
  });

  it('avoids floating point drift with half tablets', () => {
    expect(adjustStock(0.3, -0.1)).toBe(0.2);
  });
});

describe('dailyConsumption', () => {
  it('uses the schedule while there are fewer than 14 days of history', () => {
    expect(dailyConsumption(metformin, 0, null, now)).toBe(2);
    expect(dailyConsumption(metformin, 2, daysAgo(3), now)).toBe(2);
    expect(dailyConsumption(wegovy, 0, null, now)).toBeCloseTo(4 / 7);
  });

  it('uses real consumption once there are 14 days of history', () => {
    // 21 tabletas en 14 días (se saltó algunas tomas): 1.5 por día.
    expect(dailyConsumption(metformin, 21, daysAgo(30), now)).toBe(1.5);
  });

  it('uses the schedule for an old medication whose quantity tracking just started', () => {
    // Caso real: medicamento de antes de v2, una sola toma con cantidad.
    // Antes daba 1/14 por día (~56 días con 4 tabletas).
    const status = buildStockStatus(
      [{ ...metformin, quantityPerDose: 1 }],
      [{ medicationId: 'met', remaining: 4, consumedInWindow: 1, trackedSince: daysAgo(1) }],
      now
    );
    expect(status.met).toEqual({ remaining: 4, daysLeft: 4 });
  });

  it('returns null without a quantity per dose', () => {
    expect(dailyConsumption({ ...metformin, quantityPerDose: null }, 0, null, now)).toBeNull();
  });
});

describe('daysOfStockLeft', () => {
  it('rounds down', () => {
    expect(daysOfStockLeft(11, 2)).toBe(5);
  });

  it('is 0 when stock is empty or went negative', () => {
    expect(daysOfStockLeft(0, 2)).toBe(0);
    expect(daysOfStockLeft(-2, 2)).toBe(0);
  });

  it('is null without consumption', () => {
    expect(daysOfStockLeft(10, null)).toBeNull();
    expect(daysOfStockLeft(10, 0)).toBeNull();
  });
});

describe('isLowStock', () => {
  it('flags 7 days or fewer', () => {
    expect(isLowStock({ remaining: 14, daysLeft: 7 })).toBe(true);
    expect(isLowStock({ remaining: 16, daysLeft: 8 })).toBe(false);
    expect(isLowStock({ remaining: 5, daysLeft: null })).toBe(false);
    expect(isLowStock(undefined)).toBe(false);
  });
});

describe('buildStockStatus', () => {
  it('only includes medications with inventory', () => {
    const status = buildStockStatus(
      [metformin, wegovy],
      [{ medicationId: 'weg', remaining: 8, consumedInWindow: 0, trackedSince: null }],
      now
    );
    // Pluma con 8 clicks, 4 por semana: 14 días.
    expect(status).toEqual({ weg: { remaining: 8, daysLeft: 14 } });
  });
});
