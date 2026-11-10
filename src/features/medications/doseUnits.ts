import type { Presentation } from '@/db/queries/medications';

/** Unidades de la dosis clínica (lo que indicó el médico). */
export const DOSE_UNITS = ['mg', 'ml', 'UI'] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number];

/** Unidad física que se descuenta del inventario, según la presentación. */
export const QUANTITY_UNIT: Record<Presentation, string> = {
  pen: 'clicks',
  tablet: 'tabletas',
};

export function formatQuantity(value: number): string {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

/** "2.5 mg · 4 clicks", o solo la dosis si aún no tiene cantidad por toma. */
export function describeDose(med: {
  doseDescription: string;
  quantityPerDose: number | null;
  presentation: Presentation;
}): string {
  if (med.quantityPerDose == null) return med.doseDescription;
  return `${med.doseDescription} · ${formatQuantity(med.quantityPerDose)} ${QUANTITY_UNIT[med.presentation]}`;
}
