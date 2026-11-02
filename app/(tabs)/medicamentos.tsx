import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
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
import { DOSE_UNITS } from '@/features/medications/doseUnits';
import { validateMedicationForm } from '@/features/medications/validateMedicationForm';
import { formatTimeOfDay } from '@/lib/formatDate';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const DEFAULT_UNIT_BY_PRESENTATION: Record<Presentation, string> = {
  pen: 'clicks',
  tablet: 'tabletas',
};

function makeEmptyForm() {
  return {
    name: '',
    presentation: 'pen' as Presentation,
    doseAmount: '',
    doseUnit: DEFAULT_UNIT_BY_PRESENTATION.pen,
    time: new Date(),
    frequency: 'daily' as Frequency,
    dayOfWeek: null as number | null,
  };
}

export default function MedicamentosScreen() {
  const [medications, setMedications] = useState<MedicationWithSchedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMedicationsWithSchedule().then((meds) => {
      if (!cancelled) setMedications(meds);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleTimeChange(_event: unknown, selectedDate: Date) {
    setShowTimePicker(false);
    setForm((f) => ({ ...f, time: selectedDate }));
  }

  async function reloadMedications() {
    setMedications(await listMedicationsWithSchedule());
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
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      presentation,
                      doseUnit: DEFAULT_UNIT_BY_PRESENTATION[presentation],
                    }))
                  }
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
                placeholder="Dosis"
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
          <MedicationCard key={med.id} medication={med} onDoseChanged={reloadMedications} />
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
