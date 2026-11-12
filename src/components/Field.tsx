import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilyMedium, spacing, typography } from '@/theme';

type Props = {
  label: string;
  /** Texto de ayuda bajo la etiqueta (opcional). */
  hint?: string;
  children: ReactNode;
};

/** Etiqueta visible arriba de un campo: no desaparece al escribir, a diferencia del placeholder. */
export function Field({ label, hint, children }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
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
});
