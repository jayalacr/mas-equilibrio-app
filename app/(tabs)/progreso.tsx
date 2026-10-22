import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { colors, fontFamilyBold, spacing, typography } from '@/theme';

export default function ProgresoScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Progreso</Text>
        <Text style={styles.placeholder}>
          Aquí verás tus estudios de InBody y laboratorio. Se construye en la
          Fase 2.
        </Text>
      </View>
      <MedicalDisclaimer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineLg,
    fontFamily: fontFamilyBold,
    color: colors.text,
  },
  placeholder: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
});
