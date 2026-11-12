import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { listStock, setStock } from '@/db/queries/inventory';
import {
  archiveMedication,
  changeDose,
  listDoseHistory,
  listMedicationsWithSchedule,
  updateMedication,
  type DoseHistoryEntry,
  type Frequency,
  type MedicationWithSchedule,
} from '@/db/queries/medications';
import {
  buildStockStatus,
  consumptionWindowStart,
  isLowStock,
  type StockStatus,
} from '@/features/inventory/stock';
import {
  DAYS,
  describePresentation,
  describeSchedule,
  describeStock,
} from '@/features/medications/describe';
import { describeDose, DOSE_UNITS, QUANTITY_UNIT } from '@/features/medications/doseUnits';
import {
  parseDecimal,
  validateDoseAmountAndUnit,
  validateMedicationEdit,
  validateQuantityPerDose,
  validateStock,
} from '@/features/medications/validateMedicationForm';
import { formatTimeOfDay } from '@/lib/formatDate';
import { syncReminders } from '@/notifications';
import {
  colors,
  fontFamilyBold,
  fontFamilyMedium,
  opacity,
  radii,
  spacing,
  typography,
} from '@/theme';

type OpenForm = 'dose' | 'stock' | 'edit' | null;

function formatChangedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX');
}

function timeOfDayToDate(timeOfDay: string): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Los medicamentos dados de alta antes de v2 pueden tener "clicks" o "tabletas" como unidad.
function clinicalUnit(unitLabel: string): string {
  return (DOSE_UNITS as readonly string[]).includes(unitLabel) ? unitLabel : DOSE_UNITS[0];
}

export default function MedicamentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medication, setMedication] = useState<MedicationWithSchedule | null>(null);
  const [stock, setStockStatus] = useState<StockStatus | undefined>(undefined);
  const [history, setHistory] = useState<DoseHistoryEntry[]>([]);

  // Un solo formulario abierto a la vez, con un solo mensaje de error.
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState<string>(DOSE_UNITS[0]);
  const [quantityPerDose, setQuantityPerDose] = useState('');
  const [note, setNote] = useState('');
  const [stockInput, setStockInput] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [edit, setEdit] = useState({
    name: '',
    time: new Date(),
    frequency: 'daily' as Frequency,
    dayOfWeek: null as number | null,
  });

  // ponytail: carga todos los medicamentos activos y toma uno; son pocos. Una consulta por id si crecen.
  const reload = useCallback(async () => {
    const now = new Date();
    const [meds, rows, doseHistory] = await Promise.all([
      listMedicationsWithSchedule(),
      listStock(consumptionWindowStart(now).toISOString()),
      listDoseHistory(id),
    ]);
    const med = meds.find((m) => m.id === id) ?? null;
    setMedication(med);
    setStockStatus(med ? buildStockStatus(meds, rows, now)[id] : undefined);
    setHistory(doseHistory);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!medication) {
    return <Stack.Screen options={{ headerShown: true, title: '' }} />;
  }
  const med = medication;
  const quantityUnit = QUANTITY_UNIT[med.presentation];

  function toggleForm(form: Exclude<OpenForm, null>) {
    setError(null);
    if (openForm === form) {
      setOpenForm(null);
      return;
    }
    if (form === 'dose') {
      setDoseAmount('');
      setDoseUnit(clinicalUnit(med.unitLabel));
      setQuantityPerDose(med.quantityPerDose == null ? '' : String(med.quantityPerDose));
      setNote('');
    } else if (form === 'stock') {
      setStockInput(stock ? String(Math.max(0, stock.remaining)) : '');
    } else {
      setEdit({
        name: med.name,
        time: timeOfDayToDate(med.timeOfDay),
        frequency: med.frequency,
        dayOfWeek: med.dayOfWeek,
      });
    }
    setOpenForm(form);
  }

  /** Valida, guarda y cierra el formulario; recarga la pantalla al terminar. */
  async function save(validationError: string | null, action: () => Promise<void>) {
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await action();
      setOpenForm(null);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  function handleSaveDoseChange() {
    return save(
      validateDoseAmountAndUnit(doseAmount, doseUnit) ?? validateQuantityPerDose(quantityPerDose),
      () => changeDose({ medicationId: med.id, doseAmount, doseUnit, quantityPerDose, note })
    );
  }

  function handleSaveStock() {
    return save(validateStock(stockInput), () => setStock(med.id, parseDecimal(stockInput)!));
  }

  function handleSaveEdit() {
    return save(validateMedicationEdit(edit), async () => {
      await updateMedication(med.id, edit);
      syncReminders(); // la hora o el día pudieron cambiar
    });
  }

  function confirmArchive() {
    Alert.alert(
      `¿Suspender ${med.name}?`,
      'Dejará de aparecer en Hoy y no recibirás recordatorios. Tu historial se conserva y puedes reanudarlo cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender',
          style: 'destructive',
          onPress: async () => {
            await archiveMedication(med.id);
            syncReminders();
            router.back();
          },
        },
      ]
    );
  }

  const errorText = error && (
    <Text style={styles.error} accessibilityRole="alert">
      {error}
    </Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: med.name,
          headerBackTitle: 'Medicamentos',
          headerTintColor: colors.primaryDark,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: fontFamilyBold, color: colors.text },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={styles.subtitle}>
          {describePresentation(med)} · {describeSchedule(med)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosis actual</Text>
          <Text style={styles.value}>{describeDose(med)}</Text>
          {med.quantityPerDose == null && (
            <Text style={styles.hint}>
              Agrega cuántos {quantityUnit} usas por toma para llevar tu inventario.
            </Text>
          )}
          {openForm === 'dose' ? (
            <View style={styles.form}>
              {/* Sin placeholder numérico: la app nunca sugiere una dosis. */}
              <Field label="Nueva dosis indicada por tu médico">
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Nueva dosis indicada por tu médico"
                  value={doseAmount}
                  onChangeText={setDoseAmount}
                  keyboardType="decimal-pad"
                />
                <View style={styles.chipRow}>
                  {DOSE_UNITS.map((unit) => (
                    <Chip
                      key={unit}
                      label={unit}
                      selected={doseUnit === unit}
                      onPress={() => setDoseUnit(unit)}
                    />
                  ))}
                </View>
              </Field>
              <Field label={`Cantidad por toma (${quantityUnit})`}>
                <TextInput
                  style={styles.input}
                  accessibilityLabel={`Cantidad por toma, en ${quantityUnit}`}
                  value={quantityPerDose}
                  onChangeText={setQuantityPerDose}
                  keyboardType="decimal-pad"
                />
              </Field>
              <Field label="Nota (opcional)">
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Nota, opcional"
                  placeholder="ej. indicado por el médico el 20/10"
                  placeholderTextColor={colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              </Field>
              {errorText}
              <View style={styles.formButtons}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => toggleForm('dose')}
                  style={styles.formButton}
                />
                <Button
                  label={saving ? 'Guardando…' : 'Guardar'}
                  onPress={handleSaveDoseChange}
                  disabled={saving}
                  style={styles.formButton}
                />
              </View>
            </View>
          ) : (
            <Button
              label="Cambiar dosis"
              variant="outline"
              onPress={() => toggleForm('dose')}
              style={styles.sectionAction}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existencias</Text>
          <Text style={[styles.value, stock && isLowStock(stock) && styles.stockLow]}>
            {stock ? describeStock(stock, quantityUnit) : 'Sin existencias registradas'}
          </Text>
          {openForm === 'stock' ? (
            <View style={styles.form}>
              <Field
                label={`Existencias actuales (${quantityUnit})`}
                hint="El total que te queda. Si acabas de comprar, súmalo.">
                <TextInput
                  style={styles.input}
                  accessibilityLabel={`Existencias actuales, en ${quantityUnit}`}
                  value={stockInput}
                  onChangeText={setStockInput}
                  keyboardType="decimal-pad"
                />
              </Field>
              {errorText}
              <View style={styles.formButtons}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => toggleForm('stock')}
                  style={styles.formButton}
                />
                <Button
                  label={saving ? 'Guardando…' : 'Guardar'}
                  onPress={handleSaveStock}
                  disabled={saving}
                  style={styles.formButton}
                />
              </View>
            </View>
          ) : (
            <Button
              label="Actualizar"
              variant="outline"
              onPress={() => toggleForm('stock')}
              style={styles.sectionAction}
            />
          )}
        </View>

        <View style={styles.historyBlock}>
          <Text style={styles.sectionTitle}>Historial de dosis</Text>
          {history.length === 0 && (
            <Text style={styles.subtitle}>Sin cambios registrados todavía.</Text>
          )}
          {history.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View style={styles.historyMain}>
                <Text style={styles.historyDose}>
                  {describeDose({ ...entry, presentation: med.presentation })}
                </Text>
                <Text style={styles.historyMeta}>{formatChangedAt(entry.changedAt)}</Text>
              </View>
              {entry.note && <Text style={styles.historyMeta}>{entry.note}</Text>}
            </View>
          ))}
        </View>

        <Button
          label="Ver tomas registradas"
          variant="outline"
          onPress={() => router.push({ pathname: '/historial', params: { med: med.id } })}
        />

        {openForm === 'edit' ? (
          <View style={[styles.section, styles.form]}>
            <Text style={styles.sectionTitle}>Nombre y horario</Text>
            <Field label="Nombre">
              <TextInput
                style={styles.input}
                accessibilityLabel="Nombre"
                value={edit.name}
                onChangeText={(name) => setEdit((e) => ({ ...e, name }))}
              />
            </Field>
            <Field label="Hora">
              <Pressable
                style={({ pressed }) => [styles.input, pressed && { opacity: opacity.pressed }]}
                accessibilityRole="button"
                accessibilityLabel={`Hora, ${formatTimeOfDay(edit.time)}`}
                accessibilityHint="Abre el selector de hora"
                onPress={() => setShowTimePicker(true)}>
                <Text style={styles.inputText}>{formatTimeOfDay(edit.time)}</Text>
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={edit.time}
                  mode="time"
                  onValueChange={(_event: unknown, time: Date) => {
                    setShowTimePicker(false);
                    setEdit((e) => ({ ...e, time }));
                  }}
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
                    selected={edit.frequency === frequency}
                    onPress={() => setEdit((e) => ({ ...e, frequency, dayOfWeek: null }))}
                    style={styles.segment}
                  />
                ))}
              </View>
            </Field>
            {edit.frequency === 'weekly' && (
              <Field label="Día de la semana">
                <View style={styles.chipRow}>
                  {DAYS.map((label, index) => (
                    <Chip
                      key={label}
                      label={label}
                      selected={edit.dayOfWeek === index}
                      onPress={() => setEdit((e) => ({ ...e, dayOfWeek: index }))}
                    />
                  ))}
                </View>
              </Field>
            )}
            {errorText}
            <View style={styles.formButtons}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => toggleForm('edit')}
                style={styles.formButton}
              />
              <Button
                label={saving ? 'Guardando…' : 'Guardar'}
                onPress={handleSaveEdit}
                disabled={saving}
                style={styles.formButton}
              />
            </View>
          </View>
        ) : (
          <Button
            label="Editar nombre y horario"
            variant="outline"
            onPress={() => toggleForm('edit')}
          />
        )}

        <Button label="Suspender" variant="text" onPress={confirmArchive} />
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
  subtitle: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.textMuted,
  },
  sectionAction: {
    alignSelf: 'flex-end',
  },
  value: {
    ...typography.bodyLg,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  // terracottaText solo casi no se distingue de colors.text: se marca como píldora.
  stockLow: {
    ...typography.bodyMd,
    color: colors.terracottaText,
    backgroundColor: colors.terracottaSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  hint: {
    ...typography.bodySm,
    color: colors.terracottaText,
  },
  form: {
    gap: spacing.md,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formButton: {
    flex: 1,
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
  historyBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  historyRow: {
    gap: 2,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  historyDose: {
    ...typography.bodyMd,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  historyMeta: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
