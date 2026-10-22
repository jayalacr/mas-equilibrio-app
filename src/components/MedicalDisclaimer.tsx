import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme';

/**
 * Aviso obligatorio en toda pantalla principal (regla de seguridad en
 * CLAUDE.md): la app es apoyo, nunca sustituye al médico.
 */
export function MedicalDisclaimer() {
  return (
    <Text style={styles.text}>
      +EquilibRIo es una herramienta de apoyo y no sustituye la atención
      médica.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
