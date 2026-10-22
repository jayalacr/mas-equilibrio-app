export const DOSE_UNITS = ['mg', 'ml', 'clicks', 'tabletas', 'UI'] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number];
