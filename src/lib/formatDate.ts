const DAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Fecha larga en español de México para el encabezado de la pantalla Hoy,
 * ej. "miércoles 21 de octubre". Usa la hora local del dispositivo (regla
 * de CLAUDE.md: fechas y horas en la zona horaria del dispositivo).
 */
export function formatLongDate(date: Date): string {
  const day = DAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  return `${day} ${date.getDate()} de ${month}`;
}

/** Nombre del día en español, ej. "sábado". */
export function formatWeekday(date: Date): string {
  return DAYS[date.getDay()];
}

/**
 * Hora local en formato "HH:MM" (horario de recordatorio: sin fecha ni
 * zona, regla de CLAUDE.md), ej. para guardar lo elegido en el selector
 * nativo de hora.
 */
export function formatTimeOfDay(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
