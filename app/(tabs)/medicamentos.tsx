import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { MedicationCard } from '@/components/MedicationCard';
import {
  createMedication,
  listArchivedMedications,
  listMedicationsWithSchedule,
  unarchiveMedication,
  type ArchivedMedication,
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
import { DAYS } from '@/features/medications/describe';
import { DOSE_UNITS, QUANTITY_UNIT } from '@/features/medications/doseUnits';
import { validateMedicationForm } from '@/features/medications/validateMedicationForm';
import { enableReminders, remindersEnabled, syncReminders } from '@/notifications';
import { formatTimeOfDay } from '@/lib/formatDate';
import { colors, fontFamilyBold, fontFamilyMedium, opacity, radii, spacing, typography } from '@/theme';

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
  const [archived, setArchived] = useState<ArchivedMedication[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const reloadMedications = useCallback(async () => {
    const now = new Date();
    const [meds, rows, archivedMeds] = await Promise.all([
      listMedicationsWithSchedule(),
      listStock(consumptionWindowStart(now).toISOString()),
      listArchivedMedications(),
    ]);
    setMedications(meds);
    setArchived(archivedMeds);
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

  async function handleUnarchive(id: string) {
    await unarchiveMedication(id);
    syncReminders();
    await reloadMedications();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* automaticallyAdjustKeyboardInsets (iOS): deja hacer scroll hasta el campo que el teclado tapaba.
          keyboardShouldPersistTaps: tocar una ficha con el teclado abierto la selecciona al primer toque. */}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Medicamentos</Text>
          <Button
            label={showForm ? 'Cancelar' : '+ Agregar'}
            variant={showForm ? 'secondary' : 'primary'}
            onPress={() => setShowForm((v) => !v)}
            style={styles.addButton}
          />
        </View>

        {remindersOff && (
          <Pressable
            onPress={() => enableReminders().then(reloadMedications)}
            accessibilityRole="button"
            hitSlop={12}
            style={({ pressed }) => pressed && { opacity: opacity.pressed }}>
            <Text style={styles.remindersOff}>
              Los recordatorios están desactivados ·{' '}
              <Text style={styles.remindersOffLink}>Activar</Text>
            </Text>
          </Pressable>
        )}

        {showForm && (
          <View style={styles.form}>
            <Field label="Nombre">
              <TextInput
                style={styles.input}
                accessibilityLabel="Nombre"
                placeholder="ej. Wegovy"
                placeholderTextColor={colors.textMuted}
                value={form.name}
                onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              />
            </Field>

            <Field label="Presentación">
              <View style={styles.chipRow}>
                {(['pen', 'tablet'] as Presentation[]).map((presentation) => (
                  <Chip
                    key={presentation}
                    label={presentation === 'pen' ? 'Pluma' : 'Tabletas'}
                    selected={form.presentation === presentation}
                    onPress={() => setForm((f) => ({ ...f, presentation }))}
                    style={styles.segment}
                  />
                ))}
              </View>
            </Field>

            {/* Sin placeholder numérico: la app nunca sugiere una dosis. */}
            <Field label="Dosis indicada por tu médico">
              <TextInput
                style={styles.input}
                accessibilityLabel="Dosis indicada por tu médico"
                value={form.doseAmount}
                onChangeText={(doseAmount) => setForm((f) => ({ ...f, doseAmount }))}
                keyboardType="decimal-pad"
              />
              <View style={styles.chipRow}>
                {DOSE_UNITS.map((unit) => (
                  <Chip
                    key={unit}
                    label={unit}
                    selected={form.doseUnit === unit}
                    onPress={() => setForm((f) => ({ ...f, doseUnit: unit }))}
                  />
                ))}
              </View>
            </Field>

            <Field label={`Cantidad por toma (${QUANTITY_UNIT[form.presentation]})`}>
              <TextInput
                style={styles.input}
                accessibilityLabel={`Cantidad por toma, en ${QUANTITY_UNIT[form.presentation]}`}
                value={form.quantityPerDose}
                onChangeText={(quantityPerDose) => setForm((f) => ({ ...f, quantityPerDose }))}
                keyboardType="decimal-pad"
              />
            </Field>

            <Field label="Hora">
              <Pressable
                style={({ pressed }) => [styles.input, pressed && { opacity: opacity.pressed }]}
                accessibilityRole="button"
                accessibilityLabel={`Hora, ${formatTimeOfDay(form.time)}`}
                accessibilityHint="Abre el selector de hora"
                onPress={() => setShowTimePicker(true)}>
                <Text style={styles.inputText}>{formatTimeOfDay(form.time)}</Text>
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={form.time}
                  mode="time"
                  onValueChange={handleTimeChange}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}
            </Field>

            <Field label="Frecuencia">
              <View style={styles.chipRow}>
                {(['daily', 'weekly'] as Frequency[]).map((frequency) => (
                  <Chip
                    key={frequency}
                    label={frequency === 'daily' ? 'Diario' : 'Semanal'}
                    selected={form.frequency === frequency}
                    onPress={() => setForm((f) => ({ ...f, frequency, dayOfWeek: null }))}
                    style={styles.segment}
                  />
                ))}
              </View>
            </Field>

            {form.frequency === 'weekly' && (
              <Field label="Día de la semana">
                <View style={styles.chipRow}>
                  {DAYS.map((label, index) => (
                    <Chip
                      key={label}
                      label={label}
                      selected={form.dayOfWeek === index}
                      onPress={() => setForm((f) => ({ ...f, dayOfWeek: index }))}
                    />
                  ))}
                </View>
              </Field>
            )}

            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}

            <Button
              label={saving ? 'Guardando…' : 'Guardar'}
              onPress={handleSave}
              disabled={saving}
            />
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
          />
        ))}

        {archived.length > 0 && (
          <View style={styles.archived}>
            <Pressable
              onPress={() => setShowArchived((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showArchived }}
              hitSlop={12}
              style={({ pressed }) => [styles.archivedToggle, pressed && { opacity: opacity.pressed }]}>
              <Ionicons
                name={showArchived ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.archivedTitle}>Suspendidos ({archived.length})</Text>
            </Pressable>
            {showArchived &&
              archived.map((med) => (
                <View key={med.id} style={styles.archivedRow}>
                  <Text style={styles.archivedName}>{med.name}</Text>
                  <Pressable
                    onPress={() => handleUnarchive(med.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Reanudar ${med.name}`}
                    hitSlop={12}
                    style={({ pressed }) => pressed && { opacity: opacity.pressed }}>
                    <Text style={styles.remindersOffLink}>Reanudar</Text>
                  </Pressable>
                </View>
              ))}
          </View>
        )}
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
    borderRadius: radii.pill,
  },
  placeholder: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  remindersOff: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  archived: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  archivedTitle: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.textMuted,
  },
  archivedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  archivedName: {
    ...typography.bodyMd,
    color: colors.text,
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
    gap: spacing.md,
  },
  input: {
    ...typography.bodyMd,
    minHeight: 44,
    justifyContent: 'center',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputText: {
    ...typography.bodyMd,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  segment: {
    flex: 1,
  },
  error: {
    ...typography.bodySm,
    color: colors.terracottaText,
  },
});
