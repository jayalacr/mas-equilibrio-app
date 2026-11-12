import type { MedicationWithSchedule } from '@/db/queries/medications';
import type { StockStatus } from '@/features/inventory/stock';
import { formatQuantity } from '@/features/medications/doseUnits';

/** Abreviados para las fichas de selección; índice 0 = lunes, igual que dayOfWeek. */
export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** "Diario 08:00" o "Domingo 09:00". */
export function describeSchedule(med: MedicationWithSchedule): string {
  return med.frequency === 'weekly' && med.dayOfWeek !== null
    ? `${WEEKDAY_NAMES[med.dayOfWeek]} ${med.timeOfDay}`
    : `Diario ${med.timeOfDay}`;
}

export function describePresentation(med: MedicationWithSchedule): string {
  return med.presentation === 'pen' ? 'Pluma' : 'Tabletas';
}

/** "Quedan 12 clicks · ~21 días" (sin días si todavía no hay consumo para estimarlos). */
export function describeStock(stock: StockStatus, unit: string): string {
  const remaining = `Quedan ${formatQuantity(Math.max(0, stock.remaining))} ${unit}`;
  return stock.daysLeft === null ? remaining : `${remaining} · ~${stock.daysLeft} días`;
}
