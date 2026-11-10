import {
  validateMedicationForm,
  validateStock,
  type MedicationFormState,
} from './validateMedicationForm';

const base: MedicationFormState = {
  name: 'Wegovy',
  doseAmount: '1',
  doseUnit: 'mg',
  quantityPerDose: '4',
  frequency: 'daily',
  dayOfWeek: null,
};

describe('validateMedicationForm', () => {
  it('accepts a complete daily form', () => {
    expect(validateMedicationForm(base)).toBeNull();
  });

  it('requires a name', () => {
    expect(validateMedicationForm({ ...base, name: '  ' })).toMatch(/nombre/);
  });

  it('requires a positive dose amount', () => {
    expect(validateMedicationForm({ ...base, doseAmount: '0' })).toMatch(/dosis/);
    expect(validateMedicationForm({ ...base, doseAmount: 'abc' })).toMatch(/dosis/);
    expect(validateMedicationForm({ ...base, doseAmount: '' })).toMatch(/dosis/);
  });

  it('accepts a decimal dose amount with a comma', () => {
    expect(validateMedicationForm({ ...base, doseAmount: '0,25' })).toBeNull();
  });

  it('requires a dose unit', () => {
    expect(validateMedicationForm({ ...base, doseUnit: '' })).toMatch(/unidad/);
  });

  it('requires a day of week when frequency is weekly', () => {
    expect(
      validateMedicationForm({ ...base, frequency: 'weekly', dayOfWeek: null })
    ).toMatch(/día de la semana/);
  });

  it('accepts weekly when a day of week is set', () => {
    expect(
      validateMedicationForm({ ...base, frequency: 'weekly', dayOfWeek: 1 })
    ).toBeNull();
  });

  it('requires a positive quantity per dose', () => {
    expect(validateMedicationForm({ ...base, quantityPerDose: '' })).toMatch(/clicks o tabletas/);
    expect(validateMedicationForm({ ...base, quantityPerDose: '0' })).toMatch(/clicks o tabletas/);
    expect(validateMedicationForm({ ...base, quantityPerDose: '0,5' })).toBeNull();
  });
});

describe('validateStock', () => {
  it('accepts zero or more', () => {
    expect(validateStock('0')).toBeNull();
    expect(validateStock('30')).toBeNull();
  });

  it('rejects negatives and text', () => {
    expect(validateStock('-1')).toMatch(/quedan/);
    expect(validateStock('abc')).toMatch(/quedan/);
    expect(validateStock('')).toMatch(/quedan/);
  });
});
