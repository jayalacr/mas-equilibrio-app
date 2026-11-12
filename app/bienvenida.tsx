import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { createProfile } from '@/db/queries/profile';
import { enableReminders } from '@/notifications';
import { colors, fontFamilyBold, fontFamilyMedium, radii, spacing, typography } from '@/theme';

export default function BienvenidaScreen() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function finish(askForReminders: boolean) {
    setSaving(true);
    try {
      // Primero el perfil: si el permiso falla, no se vuelve a mostrar la bienvenida.
      await createProfile(name);
      if (askForReminders) await enableReminders();
      router.replace('/hoy');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Hola, soy Liria</Text>
        <Text style={styles.body}>
          Te acompaño con tus medicamentos y tus estudios. Más equilibrio, un día a la vez.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>¿Cómo te gustaría que te llame?</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre (opcional)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoCapitalize="words"
            autoComplete="given-name"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Recordatorios</Text>
          <Text style={styles.body}>
            Puedo avisarte cuando sea hora de tus tomas y, si todavía no las marcas, otra vez
            30 minutos después.
          </Text>
          <Button
            label="Activar recordatorios"
            onPress={() => finish(true)}
            disabled={saving}
            style={styles.primaryButton}
          />
          <Button label="Ahora no" variant="text" onPress={() => finish(false)} disabled={saving} />
        </View>
      </ScrollView>
      <MedicalDisclaimer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.headlineLg,
    fontFamily: fontFamilyBold,
    color: colors.text,
    marginTop: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    ...typography.headlineSm,
    fontFamily: fontFamilyMedium,
    color: colors.text,
  },
  body: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  input: {
    ...typography.bodyMd,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
  },
  primaryButton: {
    borderRadius: radii.pill,
    minHeight: 52, // acción principal de la bienvenida, un poco más grande
    marginTop: spacing.sm,
  },
});
