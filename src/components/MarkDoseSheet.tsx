import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { getLastInjectionSite, recordDoseTaken } from '@/db/queries/doses';
import type { MedicationWithSchedule } from '@/db/queries/medications';
import {
  INJECTION_SITE_LABELS,
  type InjectionSite,
  type TodayDose,
} from '@/features/doses/todayDoses';
import { describeDose } from '@/features/medications/doseUnits';
import { formatTimeOfDay } from '@/lib/formatDate';
import { colors, fontFamilyBold, opacity, radii, spacing, typography } from '@/theme';

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
        quantity: medication.quantityPerDose,
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
      {/* En iOS el teclado no empuja el modal solo: sin esto tapa la nota de efectos. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{medication.name}</Text>
          <Text style={styles.subtitle}>Dosis indicada: {describeDose(medication)}</Text>

          <Field label="Hora de la toma">
            <Pressable
              style={({ pressed }) => [styles.input, pressed && { opacity: opacity.pressed }]}
              accessibilityRole="button"
              accessibilityLabel={`Hora de la toma, ${formatTimeOfDay(takenAt)}`}
              accessibilityHint="Abre el selector de hora"
              onPress={() => setShowTimePicker(true)}>
              <Text style={styles.inputText}>{formatTimeOfDay(takenAt)}</Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={takenAt}
                mode="time"
                onValueChange={handleTimeChange}
                onDismiss={() => setShowTimePicker(false)}
              />
            )}
          </Field>

          {isPen && (
            <Field
              label="Zona de inyección"
              hint={lastSite ? `Última vez: ${INJECTION_SITE_LABELS[lastSite]}` : undefined}>
              <View style={styles.chipRow}>
                {SITES.map((s) => (
                  <Chip
                    key={s}
                    label={INJECTION_SITE_LABELS[s]}
                    selected={site === s}
                    onPress={() => setSite(site === s ? null : s)}
                    style={styles.chip}
                  />
                ))}
              </View>
            </Field>
          )}

          <Field label="Efectos o notas (opcional)">
            <TextInput
              style={[styles.input, styles.inputText, styles.noteInput]}
              accessibilityLabel="Efectos o notas, opcional"
              placeholder="¿Notaste algún efecto?"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </Field>

          <View style={styles.buttonRow}>
            <Button label="Cancelar" variant="secondary" onPress={onClose} style={styles.button} />
            <Button
              label={saving ? 'Guardando…' : 'Guardar'}
              onPress={handleSave}
              disabled={saving}
              style={styles.button}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
  input: {
    minHeight: 44,
    justifyContent: 'center',
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
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
