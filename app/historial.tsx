import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { listDoseLog } from '@/db/queries/doses';
import { groupDosesByDay, type DoseLogEntry } from '@/features/doses/doseLog';
import { INJECTION_SITE_LABELS } from '@/features/doses/todayDoses';
import { describeDose } from '@/features/medications/doseUnits';
import { formatLongDate, formatTimeOfDay } from '@/lib/formatDate';
import {
  colors,
  fontFamily,
  fontFamilyBold,
  fontFamilyMedium,
  radii,
  spacing,
  typography,
} from '@/theme';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function DoseRow({ entry }: { entry: DoseLogEntry }) {
  const verb = entry.presentation === 'pen' ? 'aplicada' : 'tomada';
  const dose = describeDose({
    doseDescription: entry.doseDescription,
    quantityPerDose: entry.quantityTaken,
    presentation: entry.presentation,
  });
  return (
    <View style={styles.row}>
      <Text style={styles.name}>
        {entry.medicationName} · <Text style={styles.detail}>{dose}</Text>
      </Text>
      <Text style={styles.detail}>
        {formatTimeOfDay(new Date(entry.scheduledTime))} → {verb}{' '}
        {formatTimeOfDay(new Date(entry.takenAt))}
        {entry.injectionSite ? ` · ${INJECTION_SITE_LABELS[entry.injectionSite]}` : ''}
      </Text>
      {entry.sideEffectNote && <Text style={styles.note}>“{entry.sideEffectNote}”</Text>}
    </View>
  );
}

export default function HistorialScreen() {
  // ?med=<id> llega desde el botón "Tomas" de un medicamento.
  const params = useLocalSearchParams<{ med?: string }>();
  const [entries, setEntries] = useState<DoseLogEntry[] | null>(null);
  const [filter, setFilter] = useState<string | null>(params.med ?? null);

  useEffect(() => {
    listDoseLog().then(setEntries);
  }, []);

  // Fichas de filtro: un medicamento por cada uno que tenga tomas registradas.
  const medications = useMemo(() => {
    const names = new Map<string, string>();
    for (const e of entries ?? []) names.set(e.medicationId, e.medicationName);
    return [...names].map(([id, name]) => ({ id, name }));
  }, [entries]);

  const sections = useMemo(
    () =>
      groupDosesByDay((entries ?? []).filter((e) => !filter || e.medicationId === filter)),
    [entries, filter]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Historial de tomas',
          headerBackTitle: 'Atrás',
          headerTintColor: colors.primaryDark,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: fontFamilyBold, color: colors.text },
          headerShadowVisible: false,
        }}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          medications.length > 1 ? (
            <View style={styles.chips}>
              {[{ id: null, name: 'Todos' }, ...medications].map((med) => (
                <Chip
                  key={med.id ?? 'all'}
                  label={med.name}
                  selected={filter === med.id}
                  onPress={() => setFilter(med.id)}
                  style={styles.chip}
                />
              ))}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          entries ? (
            <Text style={styles.detail}>
              Aún no hay tomas registradas. Cuando marques una en Hoy, aparecerá aquí.
            </Text>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.dayTitle}>{capitalize(formatLongDate(section.day))}</Text>
        )}
        renderItem={({ item }) => <DoseRow entry={item} />}
      />
      <MedicalDisclaimer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  dayTitle: {
    ...typography.label,
    fontFamily: fontFamilyBold,
    color: colors.text,
    marginTop: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  name: {
    ...typography.bodyMd,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  detail: {
    ...typography.bodySm,
    fontFamily, // regular aunque vaya dentro del nombre en negritas
    color: colors.textMuted,
  },
  note: {
    ...typography.bodySm,
    color: colors.text,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
});
