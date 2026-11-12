import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MedicationWithSchedule } from '@/db/queries/medications';
import { isLowStock, type StockStatus } from '@/features/inventory/stock';
import {
  describePresentation,
  describeSchedule,
  describeStock,
} from '@/features/medications/describe';
import { describeDose, QUANTITY_UNIT } from '@/features/medications/doseUnits';
import { colors, fontFamilyBold, fontFamilyMedium, opacity, radii, spacing, typography } from '@/theme';

type Props = {
  medication: MedicationWithSchedule;
  /** undefined si todavía no se registran existencias. */
  stock: StockStatus | undefined;
};

/** Resumen de un medicamento en la lista; al tocarlo abre su detalle (app/medicamento/[id].tsx). */
export function MedicationCard({ medication, stock }: Props) {
  const quantityUnit = QUANTITY_UNIT[medication.presentation];

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/medicamento/[id]', params: { id: medication.id } })
      }
      accessibilityRole="button"
      accessibilityHint="Abre el detalle del medicamento"
      style={({ pressed }) => [styles.card, pressed && { opacity: opacity.pressed }]}>
      <View style={styles.text}>
        <Text style={styles.title}>{medication.name}</Text>
        <Text style={styles.subtitle}>
          {describePresentation(medication)} · {describeDose(medication)}
        </Text>
        <Text style={styles.subtitle}>{describeSchedule(medication)}</Text>
        {stock ? (
          <Text style={[styles.stockText, isLowStock(stock) && styles.stockLow]}>
            {describeStock(stock, quantityUnit)}
          </Text>
        ) : (
          medication.quantityPerDose == null && (
            <Text style={styles.hint}>Sin inventario: agrega la cantidad por toma.</Text>
          )
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textMuted}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.headlineSm,
    fontFamily: fontFamilyBold,
    color: colors.text,
  },
  subtitle: {
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
});
