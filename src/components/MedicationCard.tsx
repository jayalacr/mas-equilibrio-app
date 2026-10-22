import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  changeDose,
  listDoseHistory,
  type DoseHistoryEntry,
  type MedicationWithSchedule,
} from '@/db/queries/medications';
import { DOSE_UNITS } from '@/features/medications/doseUnits';
import { validateDoseAmountAndUnit } from '@/features/medications/validateMedicationForm';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function describeSchedule(med: MedicationWithSchedule): string {
  const when = med.frequency === 'weekly' && med.dayOfWeek !== null
    ? `${DAYS[med.dayOfWeek]} ${med.timeOfDay}`
    : `Diario ${med.timeOfDay}`;
  return `${med.doseDescription} · ${when}`;
}

function formatChangedAt(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString('es-MX')} ${date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

type Props = {
  medication: MedicationWithSchedule;
  onDoseChanged: () => void;
};

export function MedicationCard({ medication, onDoseChanged }: Props) {
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState(medication.unitLabel);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DoseHistoryEntry[] | null>(null);

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
    setDoseUnit(medication.unitLabel);
    setNote('');
    setError(null);
    setShowChangeForm(true);
  }

  async function handleSaveDoseChange() {
    const validationError = validateDoseAmountAndUnit(doseAmount, doseUnit);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await changeDose({ medicationId: medication.id, doseAmount, doseUnit, note });
      setShowChangeForm(false);
      onDoseChanged();
      if (showHistory) await loadHistory();
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

      <View style={styles.actionRow}>
        <Pressable onPress={openChangeForm} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Cambiar dosis</Text>
        </Pressable>
        <Pressable onPress={toggleHistory} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {showHistory ? 'Ocultar historial' : 'Historial'}
          </Text>
        </Pressable>
      </View>

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

      {showHistory && (
        <View style={styles.history}>
          {history?.length === 0 && (
            <Text style={styles.cardSubtitle}>Sin cambios registrados todavía.</Text>
          )}
          {history?.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyDose}>{entry.doseDescription}</Text>
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
  actionRow: {
    flexDirection: 'row',
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
