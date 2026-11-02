import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getLastInjectionSite, recordDoseTaken } from '@/db/queries/doses';
import type { MedicationWithSchedule } from '@/db/queries/medications';
import {
  INJECTION_SITE_LABELS,
  type InjectionSite,
  type TodayDose,
} from '@/features/doses/todayDoses';
import { formatTimeOfDay } from '@/lib/formatDate';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

const SITES = Object.keys(INJECTION_SITE_LABELS) as InjectionSite[];

type Props = {
  dose: TodayDose<MedicationWithSchedule>;
  onClose: () => void;
  onSaved: () => void;
};

export function MarkDoseSheet({ dose, onClose, onSaved }: Props) {
  const [takenAt, setTakenAt] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [site, setSite] = useState<InjectionSite | null>(null);
  const [lastSite, setLastSite] = useState<InjectionSite | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { medication } = dose;
  const isPen = medication.presentation === 'pen';

  // El componente se monta cada vez que se abre, así que el estado empieza limpio.
  useEffect(() => {
    if (isPen) getLastInjectionSite(medication.id).then(setLastSite);
  }, [isPen, medication.id]);

  function handleTimeChange(_event: unknown, selected: Date) {
    setShowTimePicker(false);
    setTakenAt(selected);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await recordDoseTaken({
        medicationId: medication.id,
        scheduledTime: dose.scheduledTime,
        takenAt,
        doseDescription: medication.doseDescription,
        injectionSite: isPen ? site : null,
        sideEffectNote: note,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{medication.name}</Text>
          <Text style={styles.subtitle}>Dosis indicada: {medication.doseDescription}</Text>

          <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.inputText}>Hora de la toma: {formatTimeOfDay(takenAt)}</Text>
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={takenAt}
              mode="time"
              onValueChange={handleTimeChange}
              onDismiss={() => setShowTimePicker(false)}
            />
          )}

          {isPen && (
            <View style={styles.section}>
              <Text style={styles.label}>Zona de inyección</Text>
              <View style={styles.chipRow}>
                {SITES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSite(site === s ? null : s)}
                    style={[styles.chip, site === s && styles.chipActive]}>
                    <Text style={[styles.chipText, site === s && styles.chipTextActive]}>
                      {INJECTION_SITE_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {lastSite && (
                <Text style={styles.hint}>Última vez: {INJECTION_SITE_LABELS[lastSite]}</Text>
              )}
            </View>
          )}

          <TextInput
            style={[styles.input, styles.inputText, styles.noteInput]}
            placeholder="¿Notaste algún efecto? (opcional)"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
          />

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44, 62, 80, 0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.headlineMd,
    fontFamily: fontFamilyBold,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  hint: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
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
  noteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.surfaceWarm,
  },
  saveText: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.surface,
  },
  cancelText: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
});
