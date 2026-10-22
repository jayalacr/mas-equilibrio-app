import { validateDoseAmountAndUnit } from './validateMedicationForm';

describe('validateDoseAmountAndUnit', () => {
  it('accepts a valid amount and unit', () => {
    expect(validateDoseAmountAndUnit('2.5', 'mg')).toBeNull();
  });

  it('rejects a non-positive amount', () => {
    expect(validateDoseAmountAndUnit('0', 'mg')).toMatch(/dosis/);
  });

  it('rejects a missing unit', () => {
    expect(validateDoseAmountAndUnit('2.5', '')).toMatch(/unidad/);
  });
});
