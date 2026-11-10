import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkDoseSheet } from '@/components/MarkDoseSheet';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { listDosesTakenSince, undoDoseTaken } from '@/db/queries/doses';
import { listStock } from '@/db/queries/inventory';
import { listMedicationsWithSchedule, type MedicationWithSchedule } from '@/db/queries/medications';
import { buildTodayDoses, INJECTION_SITE_LABELS, type TodayDose } from '@/features/doses/todayDoses';
import {
  buildStockStatus,
  consumptionWindowStart,
  isLowStock,
  type StockStatus,
} from '@/features/inventory/stock';
import { describeDose } from '@/features/medications/doseUnits';
import { formatLongDate, formatTimeOfDay, formatWeekday } from '@/lib/formatDate';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

type Dose = TodayDose<MedicationWithSchedule>;
type LowStock = { medication: MedicationWithSchedule; stock: StockStatus };

// Voz de Liria: informa sin presionar.
function lowStockMessage({ medication, stock }: LowStock): string {
  if (stock.daysLeft === 0) {
    return `Ya no te quedan existencias registradas de ${medication.name}. Si ya conseguiste más, actualízalas en Medicamentos.`;
  }
  return `Te quedan ~${stock.daysLeft} días de ${medication.name}. Puede ser buen momento para conseguir más.`;
}

export default function HoyScreen() {
  const [now, setNow] = useState(new Date());
  const [doses, setDoses] = useState<Dose[]>([]);
  const [selected, setSelected] = useState<Dose | null>(null);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);

  const reload = useCallback(async () => {
    const current = new Date();
    // Una semana atrás alcanza para encontrar la semanal pendiente más vieja.
    const weekAgo = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7);
    const [meds, taken, stockRows] = await Promise.all([
      listMedicationsWithSchedule(),
      listDosesTakenSince(weekAgo.toISOString()),
      listStock(consumptionWindowStart(current).toISOString()),
    ]);
    const stock = buildStockStatus(meds, stockRows, current);
    setNow(current);
    setDoses(buildTodayDoses(meds, taken, current));
    setLowStock(
      meds.filter((m) => isLowStock(stock[m.id])).map((m) => ({ medication: m, stock: stock[m.id] }))
    );
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

        {lowStock.map((item) => (
          <View key={item.medication.id} style={styles.stockBanner}>
            <Text style={styles.stockBannerText}>{lowStockMessage(item)}</Text>
          </View>
        ))}

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
                <Text style={styles.detail}>{describeDose(dose.medication)}</Text>
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
  stockBanner: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  stockBannerText: {
    ...typography.bodyMd,
    color: colors.text,
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
