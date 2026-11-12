import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  archiveMedication,
  changeDose,
  listDoseHistory,
  updateMedication,
  type DoseHistoryEntry,
  type Frequency,
  type MedicationWithSchedule,
} from '@/db/queries/medications';
import { setStock } from '@/db/queries/inventory';
import { isLowStock, type StockStatus } from '@/features/inventory/stock';
import {
  describeDose,
  DOSE_UNITS,
  formatQuantity,
  QUANTITY_UNIT,
} from '@/features/medications/doseUnits';
import {
  parseDecimal,
  validateDoseAmountAndUnit,
  validateMedicationEdit,
  validateQuantityPerDose,
  validateStock,
} from '@/features/medications/validateMedicationForm';
import { formatTimeOfDay } from '@/lib/formatDate';
import { syncReminders } from '@/notifications';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function describeSchedule(med: MedicationWithSchedule): string {
  const when = med.frequency === 'weekly' && med.dayOfWeek !== null
    ? `${DAYS[med.dayOfWeek]} ${med.timeOfDay}`
    : `Diario ${med.timeOfDay}`;
  return `${describeDose(med)} · ${when}`;
}

function formatChangedAt(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString('es-MX')} ${date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function describeStock(stock: StockStatus, unit: string): string {
  const remaining = `Quedan ${formatQuantity(Math.max(0, stock.remaining))} ${unit}`;
  return stock.daysLeft === null ? remaining : `${remaining} · ~${stock.daysLeft} días`;
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

type Props = {
  medication: MedicationWithSchedule;
  /** undefined si todavía no se registran existencias. */
  stock: StockStatus | undefined;
  onChanged: () => void;
};

export function MedicationCard({ medication, stock, onChanged }: Props) {
  const quantityUnit = QUANTITY_UNIT[medication.presentation];

  const [showChangeForm, setShowChangeForm] = useState(false);
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState(clinicalUnit(medication.unitLabel));
  const [quantityPerDose, setQuantityPerDose] = useState('');
  const [note, setNote] = useState('');

  const [showStockForm, setShowStockForm] = useState(false);
  const [stockInput, setStockInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DoseHistoryEntry[] | null>(null);

  const [showEditForm, setShowEditForm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [edit, setEdit] = useState({
    name: '',
    time: new Date(),
    frequency: 'daily' as Frequency,
    dayOfWeek: null as number | null,
  });

  async function loadHistory() {
    setHistory(await listDoseHistory(medication.id));
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    await loadHistory();
    setShowHistory(true);
  }

  function openChangeForm() {
    setDoseAmount('');
    setDoseUnit(clinicalUnit(medication.unitLabel));
    setQuantityPerDose(
      medication.quantityPerDose == null ? '' : String(medication.quantityPerDose)
    );
    setNote('');
    setError(null);
    setShowStockForm(false);
    setShowEditForm(false);
    setShowChangeForm(true);
  }

  function openStockForm() {
    setStockInput(stock ? String(Math.max(0, stock.remaining)) : '');
    setError(null);
    setShowChangeForm(false);
    setShowEditForm(false);
    setShowStockForm((v) => !v);
  }

  function openEditForm() {
    setEdit({
      name: medication.name,
      time: timeOfDayToDate(medication.timeOfDay),
      frequency: medication.frequency,
      dayOfWeek: medication.dayOfWeek,
    });
    setError(null);
    setShowChangeForm(false);
    setShowStockForm(false);
    setShowEditForm((v) => !v);
  }

  async function handleSaveEdit() {
    const validationError = validateMedicationEdit(edit);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await updateMedication(medication.id, edit);
      syncReminders(); // la hora o el día pudieron cambiar
      setShowEditForm(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  function confirmArchive() {
    Alert.alert(
      `¿Suspender ${medication.name}?`,
      'Dejará de aparecer en Hoy y no recibirás recordatorios. Tu historial se conserva y puedes reanudarlo cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender',
          style: 'destructive',
          onPress: async () => {
            await archiveMedication(medication.id);
            syncReminders();
            onChanged();
          },
        },
      ]
    );
  }

  async function handleSaveDoseChange() {
    const validationError =
      validateDoseAmountAndUnit(doseAmount, doseUnit) ?? validateQuantityPerDose(quantityPerDose);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await changeDose({ medicationId: medication.id, doseAmount, doseUnit, quantityPerDose, note });
      setShowChangeForm(false);
      onChanged();
      if (showHistory) await loadHistory();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStock() {
    const validationError = validateStock(stockInput);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await setStock(medication.id, parseDecimal(stockInput)!);
      setShowStockForm(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{medication.name}</Text>
      <Text style={styles.cardSubtitle}>
        {medication.presentation === 'pen' ? 'Pluma' : 'Tabletas'} ·{' '}
        {describeSchedule(medication)}
      </Text>
      {medication.quantityPerDose == null && (
        <Text style={styles.hint}>
          Agrega cuántos {quantityUnit} usas por toma en “Cambiar dosis” para llevar tu
          inventario.
        </Text>
      )}
      {stock && (
        <Text style={[styles.stockText, isLowStock(stock) && styles.stockLow]}>
          {describeStock(stock, quantityUnit)}
        </Text>
      )}

      <View style={styles.actionRow}>
        <Pressable onPress={openChangeForm} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Cambiar dosis</Text>
        </Pressable>
        <Pressable onPress={openStockForm} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Existencias</Text>
        </Pressable>
        <Pressable onPress={toggleHistory} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {showHistory ? 'Ocultar historial' : 'Historial'}
          </Text>
        </Pressable>
        <Pressable onPress={openEditForm} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable onPress={confirmArchive} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Suspender</Text>
        </Pressable>
      </View>

      {showEditForm && (
        <View style={styles.changeForm}>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor={colors.textMuted}
            value={edit.name}
            onChangeText={(name) => setEdit((e) => ({ ...e, name }))}
          />
          <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text style={{ ...typography.bodyMd, color: colors.text }}>
              Hora: {formatTimeOfDay(edit.time)}
            </Text>
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
          <View style={styles.unitRow}>
            {(['daily', 'weekly'] as Frequency[]).map((frequency) => (
              <Pressable
                key={frequency}
                onPress={() => setEdit((e) => ({ ...e, frequency, dayOfWeek: null }))}
                style={[styles.chip, edit.frequency === frequency && styles.chipActive]}>
                <Text
                  style={[styles.chipText, edit.frequency === frequency && styles.chipTextActive]}>
                  {frequency === 'daily' ? 'Diario' : 'Semanal'}
                </Text>
              </Pressable>
            ))}
          </View>
          {edit.frequency === 'weekly' && (
            <View style={styles.unitRow}>
              {DAYS.map((label, index) => (
                <Pressable
                  key={label}
                  onPress={() => setEdit((e) => ({ ...e, dayOfWeek: index }))}
                  style={[styles.chip, edit.dayOfWeek === index && styles.chipActive]}>
                  <Text
                    style={[styles.chipText, edit.dayOfWeek === index && styles.chipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.saveButton} onPress={handleSaveEdit} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
          </Pressable>
        </View>
      )}

      {showChangeForm && (
        <View style={styles.changeForm}>
          <View style={styles.doseRow}>
            <TextInput
              style={[styles.input, styles.doseAmountInput]}
              placeholder="Nueva dosis"
              placeholderTextColor={colors.textMuted}
              value={doseAmount}
              onChangeText={setDoseAmount}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitRow}>
              {DOSE_UNITS.map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => setDoseUnit(unit)}
                  style={[styles.chip, doseUnit === unit && styles.chipActive]}>
                  <Text style={[styles.chipText, doseUnit === unit && styles.chipTextActive]}>
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
              value={quantityPerDose}
              onChangeText={setQuantityPerDose}
              keyboardType="decimal-pad"
            />
            <Text style={styles.quantityUnit}>{quantityUnit}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nota (opcional, ej. indicado por el médico el 20/10)"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.saveButton} onPress={handleSaveDoseChange} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar cambio'}</Text>
          </Pressable>
        </View>
      )}

      {showStockForm && (
        <View style={styles.changeForm}>
          <Text style={styles.cardSubtitle}>
            ¿Cuántos {quantityUnit} te quedan en total? Si acabas de comprar, súmalos.
          </Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={[styles.input, styles.quantityInput]}
              placeholder="Existencias"
              placeholderTextColor={colors.textMuted}
              value={stockInput}
              onChangeText={setStockInput}
              keyboardType="decimal-pad"
            />
            <Text style={styles.quantityUnit}>{quantityUnit}</Text>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.saveButton} onPress={handleSaveStock} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar existencias'}</Text>
          </Pressable>
        </View>
      )}

      {showHistory && (
        <View style={styles.history}>
          {history?.length === 0 && (
            <Text style={styles.cardSubtitle}>Sin cambios registrados todavía.</Text>
          )}
          {history?.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyDose}>
                {describeDose({ ...entry, presentation: medication.presentation })}
              </Text>
              <Text style={styles.historyMeta}>
                {formatChangedAt(entry.changedAt)}
                {entry.note ? ` · ${entry.note}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilyBold,
    color: colors.text,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  hint: {
    ...typography.bodySm,
    color: colors.terracottaText,
  },
  stockText: {
    ...typography.bodySm,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  // terracottaText solo casi no se distingue de colors.text: se marca como píldora.
  stockLow: {
    color: colors.terracottaText,
    backgroundColor: colors.terracottaSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    ...typography.bodySm,
    color: colors.primaryDark,
    fontFamily: fontFamilyMedium,
  },
  changeForm: {
    marginTop: spacing.sm,
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
  chip: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  chipTextActive: {
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
  history: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  historyRow: {
    gap: 2,
  },
  historyDose: {
    ...typography.bodySm,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  historyMeta: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
