import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamilyMedium, opacity, radii, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'text';

type Props = {
  label: string;
  /** Opcional solo para usarlo dentro de <Link asChild>, que inyecta su propio onPress. */
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón base de la app: área táctil mínima de 44pt (iOS) / 48dp (Android con ripple),
 * respuesta visual al presionar y estado deshabilitado visible.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={{ color: colors.ripple }}
      style={({ pressed }) => [
        styles.base,
        containerStyles[variant],
        pressed && { opacity: opacity.pressed },
        disabled && { opacity: opacity.disabled },
        style,
      ]}>
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    overflow: 'hidden', // recorta el ripple de Android a las esquinas redondeadas
  },
  label: {
    ...typography.label,
    fontFamily: fontFamilyMedium,
  },
});

const containerStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceWarm },
  outline: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill },
  text: {},
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.surface },
  secondary: { color: colors.text },
  outline: { ...typography.bodySm, color: colors.primaryDark },
  text: { color: colors.primaryDark },
});
