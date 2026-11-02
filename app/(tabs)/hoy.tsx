import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkDoseSheet } from '@/components/MarkDoseSheet';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { listDosesTakenSince, undoDoseTaken } from '@/db/queries/doses';
import { listMedicationsWithSchedule, type MedicationWithSchedule } from '@/db/queries/medications';
import { buildTodayDoses, INJECTION_SITE_LABELS, type TodayDose } from '@/features/doses/todayDoses';
import { formatLongDate, formatTimeOfDay, formatWeekday } from '@/lib/formatDate';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

type Dose = TodayDose<MedicationWithSchedule>;

export default function HoyScreen() {
  const [now, setNow] = useState(new Date());
  const [doses, setDoses] = useState<Dose[]>([]);
  const [selected, setSelected] = useState<Dose | null>(null);

  const reload = useCallback(async () => {
    const current = new Date();
    // Una semana atrás alcanza para encontrar la semanal pendiente más vieja.
    const weekAgo = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7);
    const [meds, taken] = await Promise.all([
      listMedicationsWithSchedule(),
      listDosesTakenSince(weekAgo.toISOString()),
    ]);
    setNow(current);
    setDoses(buildTodayDoses(meds, taken, current));
  }, []);

  // Al entrar a la pestaña (p. ej. después de dar de alta un medicamento).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Al regresar del segundo plano: puede ser otro día.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => subscription.remove();
  }, [reload]);

  async function handleUndo(id: string) {
    await undoDoseTaken(id);
    await reload();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Hoy</Text>
          <Text style={styles.date}>{formatLongDate(now)}</Text>
        </View>

        {doses.length === 0 && (
          <Text style={styles.placeholder}>
            No tienes tomas para hoy. Puedes agregar tus medicamentos en la pestaña Medicamentos.
          </Text>
        )}

        {doses.map((dose) => (
          <View
            key={`${dose.medication.id}-${dose.scheduledTime}`}
            style={[styles.card, dose.taken && styles.cardTaken]}>
            <View style={styles.cardInfo}>
              <Text style={styles.time}>{dose.medication.timeOfDay}</Text>
              <View style={styles.cardText}>
                <Text style={styles.name}>{dose.medication.name}</Text>
                <Text style={styles.detail}>{dose.medication.doseDescription}</Text>
                {dose.fromPastDay && !dose.taken && (
                  <Text style={styles.pastDay}>
                    Pendiente desde el {formatWeekday(dose.scheduledAt)}
                  </Text>
                )}
                {dose.taken && (
                  <Text style={styles.takenText}>
                    ✓ Tomada {formatTimeOfDay(new Date(dose.taken.takenAt))}
                    {dose.taken.injectionSite
                      ? ` · ${INJECTION_SITE_LABELS[dose.taken.injectionSite]}`
                      : ''}
                  </Text>
                )}
              </View>
            </View>
            {dose.taken ? (
              <Pressable onPress={() => handleUndo(dose.taken!.id)} style={styles.undoButton}>
                <Text style={styles.undoText}>Deshacer</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setSelected(dose)} style={styles.markButton}>
                <Text style={styles.markText}>Marcar tomada</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
      <MedicalDisclaimer />

      {selected && (
        <MarkDoseSheet
          dose={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
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
  header: {
    marginTop: spacing.md,
  },
  title: {
    ...typography.headlineLg,
    fontFamily: fontFamilyBold,
    color: colors.text,
  },
  date: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  placeholder: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTaken: {
    backgroundColor: colors.surfaceSoft,
  },
  cardInfo: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  time: {
    ...typography.headlineSm,
    fontFamily: fontFamilyBold,
    color: colors.primaryDark,
  },
  name: {
    ...typography.bodyLg,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  detail: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  pastDay: {
    ...typography.bodySm,
    color: colors.terracottaText,
  },
  takenText: {
    ...typography.bodySm,
    fontFamily: fontFamilyMedium,
    color: colors.successText,
  },
  markButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  markText: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.surface,
  },
  undoButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  undoText: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
    color: colors.textMuted,
  },
});
