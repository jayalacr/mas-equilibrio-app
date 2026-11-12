export type MedicationFormState = {
  name: string;
  doseAmount: string;
  doseUnit: string;
  quantityPerDose: string;
  frequency: 'daily' | 'weekly';
  dayOfWeek: number | null;
};

/** Acepta coma o punto decimal; null si no es un número. */
export function parseDecimal(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

// Compartida con validateDoseChange: la dosis y su unidad se validan igual
// al dar de alta un medicamento o al registrar un cambio de dosis.
export function validateDoseAmountAndUnit(doseAmount: string, doseUnit: string): string | null {
  const amount = parseDecimal(doseAmount);
  if (amount === null || amount <= 0) {
    return 'Escribe la dosis indicada por tu médico (un número mayor a 0).';
  }
  if (!doseUnit) return 'Elige la unidad de la dosis.';
  return null;
}

export function validateQuantityPerDose(quantity: string): string | null {
  const value = parseDecimal(quantity);
  if (value === null || value <= 0) {
    return 'Escribe cuántos clicks o tabletas usas en cada toma (un número mayor a 0).';
  }
  return null;
}

export function validateStock(remaining: string): string | null {
  const value = parseDecimal(remaining);
  if (value === null || value < 0) return 'Escribe cuántos te quedan (0 o más).';
  return null;
}

// Devuelve el mensaje de error a mostrar, o null si el formulario es válido.
export function validateMedicationForm(form: MedicationFormState): string | null {
  if (!form.name.trim()) return 'Escribe el nombre del medicamento.';
  const doseError = validateDoseAmountAndUnit(form.doseAmount, form.doseUnit);
  if (doseError) return doseError;
  const quantityError = validateQuantityPerDose(form.quantityPerDose);
  if (quantityError) return quantityError;
  if (form.frequency === 'weekly' && form.dayOfWeek === null) {
    return 'Elige el día de la semana para la toma semanal.';
  }
  return null;
}

export type MedicationEditState = Pick<MedicationFormState, 'name' | 'frequency' | 'dayOfWeek'>;

/** Al editar solo cambian nombre y horario; la dosis va por "Cambiar dosis". */
export function validateMedicationEdit(form: MedicationEditState): string | null {
  if (!form.name.trim()) return 'Escribe el nombre del medicamento.';
  if (form.frequency === 'weekly' && form.dayOfWeek === null) {
    return 'Elige el día de la semana para la toma semanal.';
  }
  return null;
}
