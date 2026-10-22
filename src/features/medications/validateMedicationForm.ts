export type MedicationFormState = {
  name: string;
  doseAmount: string;
  doseUnit: string;
  frequency: 'daily' | 'weekly';
  dayOfWeek: number | null;
};

// Compartida con validateDoseChange: la dosis y su unidad se validan igual
// al dar de alta un medicamento o al registrar un cambio de dosis.
export function validateDoseAmountAndUnit(doseAmount: string, doseUnit: string): string | null {
  const amount = Number(doseAmount.replace(',', '.'));
  if (!doseAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
    return 'Escribe la dosis indicada por tu médico (un número mayor a 0).';
  }
  if (!doseUnit) return 'Elige la unidad de la dosis.';
  return null;
}

// Devuelve el mensaje de error a mostrar, o null si el formulario es válido.
export function validateMedicationForm(form: MedicationFormState): string | null {
  if (!form.name.trim()) return 'Escribe el nombre del medicamento.';
  const doseError = validateDoseAmountAndUnit(form.doseAmount, form.doseUnit);
  if (doseError) return doseError;
  if (form.frequency === 'weekly' && form.dayOfWeek === null) {
    return 'Elige el día de la semana para la toma semanal.';
  }
  return null;
}
