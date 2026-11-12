import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamilyMedium, opacity, radii, spacing, typography } from '@/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ficha de selección (unidad, frecuencia, día, zona, filtro). El lector de pantalla
 * anuncia "seleccionado" gracias a accessibilityState; el color no es la única señal.
 */
export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipActive,
        pressed && { opacity: opacity.pressed },
        style,
      ]}>
      <Text style={[styles.text, selected && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  text: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  textActive: {
    color: colors.primaryDark,
    fontFamily: fontFamilyMedium,
  },
});
