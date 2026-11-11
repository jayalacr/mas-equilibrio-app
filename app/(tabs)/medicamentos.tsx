import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { MedicationCard } from '@/components/MedicationCard';
import {
  createMedication,
  listMedicationsWithSchedule,
  type Frequency,
  type MedicationWithSchedule,
  type Presentation,
} from '@/db/queries/medications';
import { listStock } from '@/db/queries/inventory';
import {
  buildStockStatus,
  consumptionWindowStart,
  type StockStatus,
} from '@/features/inventory/stock';
import { DOSE_UNITS, QUANTITY_UNIT } from '@/features/medications/doseUnits';
import { validateMedicationForm } from '@/features/medications/validateMedicationForm';
import { enableReminders, remindersEnabled, syncReminders } from '@/notifications';
import { formatTimeOfDay } from '@/lib/formatDate';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function makeEmptyForm() {
  return {
    name: '',
    presentation: 'pen' as Presentation,
    doseAmount: '',
    doseUnit: 'mg',
    quantityPerDose: '',
    time: new Date(),
    frequency: 'daily' as Frequency,
    dayOfWeek: null as number | null,
  };
}

export default function MedicamentosScreen() {
  const [medications, setMedications] = useState<MedicationWithSchedule[]>([]);
  const [stock, setStock] = useState<Record<string, StockStatus>>({});
  const [showForm, setShowForm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [remindersOff, setRemindersOff] = useState(false);

  const reloadMedications = useCallback(async () => {
    const now = new Date();
    const [meds, rows] = await Promise.all([
      listMedicationsWithSchedule(),
      listStock(consumptionWindowStart(now).toISOString()),
    ]);
    setMedications(meds);
    setStock(buildStockStatus(meds, rows, now));
    setRemindersOff(!(await remindersEnabled()));
  }, []);

  // Al entrar a la pestaña: en Hoy pudo haberse registrado una toma que descontó existencias.
  useFocusEffect(
    useCallback(() => {
      reloadMedications();
    }, [reloadMedications])
  );

  function handleTimeChange(_event: unknown, selectedDate: Date) {
    setShowTimePicker(false);
    setForm((f) => ({ ...f, time: selectedDate }));
  }

  async function handleSave() {
    const validationError = validateMedicationForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await createMedication(form);
      syncReminders();
      setForm(makeEmptyForm());
      setShowForm(false);
      setError(null);
      await reloadMedications();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Medicamentos</Text>
          <Pressable
            onPress={() => setShowForm((v) => !v)}
            style={[styles.addButton, showForm && styles.addButtonActive]}>
            <Text style={styles.addButtonText}>{showForm ? 'Cancelar' : '+ Agregar'}</Text>
          </Pressable>
        </View>

        {remindersOff && (
          <Pressable onPress={() => enableReminders().then(reloadMedications)}>
            <Text style={styles.remindersOff}>
              Los recordatorios están desactivados ·{' '}
              <Text style={styles.remindersOffLink}>Activar</Text>
            </Text>
          </Pressable>
        )}

        {showForm && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej. Wegovy)"
              placeholderTextColor={colors.textMuted}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            />

            <View style={styles.segmentRow}>
              {(['pen', 'tablet'] as Presentation[]).map((presentation) => (
                <Pressable
                  key={presentation}
                  onPress={() => setForm((f) => ({ ...f, presentation }))}
                  style={[
                    styles.segment,
                    form.presentation === presentation && styles.segmentActive,
                  ]}>
                  <Text
                    style={[
                      styles.segmentText,
                      form.presentation === presentation && styles.segmentTextActive,
                    ]}>
                    {presentation === 'pen' ? 'Pluma' : 'Tabletas'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.doseRow}>
              <TextInput
                style={[styles.input, styles.doseAmountInput]}
                placeholder="Dosis indicada por tu médico"
                placeholderTextColor={colors.textMuted}
                value={form.doseAmount}
                onChangeText={(doseAmount) => setForm((f) => ({ ...f, doseAmount }))}
                keyboardType="decimal-pad"
              />
              <View style={styles.unitRow}>
                {DOSE_UNITS.map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => setForm((f) => ({ ...f, doseUnit: unit }))}
                    style={[styles.day, form.doseUnit === unit && styles.segmentActive]}>
                    <Text
                      style={[
                        styles.segmentText,
                        form.doseUnit === unit && styles.segmentTextActive,
                      ]}>
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.quantityRow}>
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder="Cantidad por toma"
                placeholderTextColor={colors.textMuted}
                value={form.quantityPerDose}
                onChangeText={(quantityPerDose) => setForm((f) => ({ ...f, quantityPerDose }))}
                keyboardType="decimal-pad"
              />
              <Text style={styles.quantityUnit}>{QUANTITY_UNIT[form.presentation]}</Text>
            </View>

            <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
              <Text style={{ ...typography.bodyMd, color: colors.text }}>
                Hora: {formatTimeOfDay(form.time)}
              </Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={form.time}
                mode="time"
                onValueChange={handleTimeChange}
                onDismiss={() => setShowTimePicker(false)}
              />
            )}

            <View style={styles.segmentRow}>
              {(['daily', 'weekly'] as Frequency[]).map((frequency) => (
                <Pressable
                  key={frequency}
                  onPress={() => setForm((f) => ({ ...f, frequency, dayOfWeek: null }))}
                  style={[styles.segment, form.frequency === frequency && styles.segmentActive]}>
                  <Text
                    style={[
                      styles.segmentText,
                      form.frequency === frequency && styles.segmentTextActive,
                    ]}>
                    {frequency === 'daily' ? 'Diario' : 'Semanal'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {form.frequency === 'weekly' && (
              <View style={styles.segmentRow}>
                {DAYS.map((label, index) => (
                  <Pressable
                    key={label}
                    onPress={() => setForm((f) => ({ ...f, dayOfWeek: index }))}
                    style={[styles.day, form.dayOfWeek === index && styles.segmentActive]}>
                    <Text
                      style={[
                        styles.segmentText,
                        form.dayOfWeek === index && styles.segmentTextActive,
                      ]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        )}

        {medications.length === 0 && !showForm && (
          <Text style={styles.placeholder}>
            Aún no tienes medicamentos. Toca &quot;+ Agregar&quot; para dar de alta el primero.
          </Text>
        )}

        {medications.map((med) => (
          <MedicationCard
            key={med.id}
            medication={med}
            stock={stock[med.id]}
            onChanged={reloadMedications}
          />
        ))}
      </ScrollView>
      <MedicalDisclaimer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  title: {
    ...typography.headlineLg,
    fontFamily: fontFamilyBold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addButtonActive: {
    backgroundColor: colors.surfaceWarm,
  },
  addButtonText: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.surface,
  },
  placeholder: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  remindersOff: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  remindersOffLink: {
    fontFamily: fontFamilyMedium,
    color: colors.primaryDark,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    ...typography.bodyMd,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  doseRow: {
    gap: spacing.sm,
  },
  doseAmountInput: {
    width: '100%',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityInput: {
    flex: 1,
  },
  quantityUnit: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  unitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
  },
  day: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  segmentText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primaryDark,
    fontFamily: fontFamilyMedium,
  },
  error: {
    ...typography.bodySm,
    color: colors.terracottaText,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  saveButtonText: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.surface,
  },
});
