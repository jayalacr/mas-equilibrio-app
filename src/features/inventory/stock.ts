import type { Frequency } from '@/db/queries/medications';

/** Con estos días o menos se muestra el aviso de compra. */
export const LOW_STOCK_DAYS = 7;
/** Días hacia atrás que se usan para medir el consumo real. */
export const CONSUMPTION_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export type StockMedication = {
  id: string;
  quantityPerDose: number | null;
  frequency: Frequency;
};

export type StockRow = {
  medicationId: string;
  remaining: number;
  /** Suma de `quantity_taken` desde el inicio de la ventana de consumo. */
  consumedInWindow: number;
  /** Primera toma registrada con cantidad (ISO UTC); null si aún no hay. Las tomas de antes de v2 no cuentan. */
  trackedSince: string | null;
};

export type StockStatus = {
  remaining: number;
  /** null cuando no hay forma de estimarlo (sin cantidad por toma o sin consumo). */
  daysLeft: number | null;
};

export function consumptionWindowStart(now: Date): Date {
  return new Date(now.getTime() - CONSUMPTION_WINDOW_DAYS * DAY_MS);
}

/** Suma un cambio (negativo al tomar, positivo al deshacer) sin arrastrar errores de punto flotante. */
export function adjustStock(remaining: number, delta: number): number {
  return Math.round((remaining + delta) * 100) / 100;
}

/**
 * Cantidad física que se consume por día. Con al menos 14 días de tomas
 * registradas con cantidad usa lo que realmente se registró; antes de eso, el horario.
 */
// ponytail: si la cantidad por toma cambió dentro de la ventana, el promedio
// mezcla ambas; se corrige solo al pasar 14 días.
export function dailyConsumption(
  med: StockMedication,
  consumedInWindow: number,
  trackedSince: string | null,
  now: Date
): number | null {
  const hasFullWindow =
    trackedSince !== null && new Date(trackedSince) <= consumptionWindowStart(now);
  if (hasFullWindow) {
    return consumedInWindow > 0 ? consumedInWindow / CONSUMPTION_WINDOW_DAYS : null;
  }
  if (!med.quantityPerDose) return null;
  return med.frequency === 'weekly' ? med.quantityPerDose / 7 : med.quantityPerDose;
}

export function daysOfStockLeft(remaining: number, perDay: number | null): number | null {
  if (!perDay || perDay <= 0) return null;
  return Math.floor(Math.max(0, remaining) / perDay);
}

export function isLowStock(status: StockStatus | undefined): boolean {
  return status?.daysLeft != null && status.daysLeft <= LOW_STOCK_DAYS;
}

/** Estado de existencias por medicamento; solo incluye los que tienen inventario registrado. */
export function buildStockStatus(
  medications: StockMedication[],
  rows: StockRow[],
  now: Date
): Record<string, StockStatus> {
  const result: Record<string, StockStatus> = {};
  for (const row of rows) {
    const med = medications.find((m) => m.id === row.medicationId);
    if (!med) continue;
    const perDay = dailyConsumption(med, row.consumedInWindow, row.trackedSince, now);
    result[med.id] = { remaining: row.remaining, daysLeft: daysOfStockLeft(row.remaining, perDay) };
  }
  return result;
}
