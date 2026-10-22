import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { colors, fontFamilyBold, spacing, typography } from '@/theme';

export default function HoyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Hoy</Text>
        <Text style={styles.placeholder}>
          Aquí verás tus tomas pendientes del día. Se construye en la Fase 1.
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
