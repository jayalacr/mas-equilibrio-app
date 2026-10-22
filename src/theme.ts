// Tokens visuales de +EquilibRIo, tomados del prototipo (Stitch + Artifact).
// Un solo lugar para colores, tipografía y espaciado: cambiar el tema es
// cambiar este archivo, nunca los estilos de cada pantalla.

export const colors = {
  // Base
  background: '#FBF9F5', // avena
  surface: '#FFFFFF',
  surfaceSoft: '#F1F6F2', // tarjeta completada / fondo suave verde
  surfaceWarm: '#F7F2EA', // aviso cálido (inventario, notas)
  border: 'rgba(44, 62, 80, 0.08)',

  // Texto
  text: '#2C3E50',
  textMuted: '#55606B',

  // Marca
  primary: '#2D6A4F', // verde salvia
  primaryDark: '#1E4D39',
  primaryLight: '#D8F3DC',
  mint: '#52B788',

  // Acento cálido (nunca para alarmas)
  terracotta: '#E07A5F',
  terracottaText: '#8A3A26',
  terracottaSoft: '#FBE3DB',

  // Estados
  success: '#B7E4C7',
  successText: '#1E4D39',
  pending: '#E8EEF4',
  pendingText: '#34495E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 36,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  pill: 999,
} as const;

export const typography = {
  headlineLg: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  headlineMd: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  headlineSm: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  bodyLg: { fontSize: 17, lineHeight: 26, fontWeight: '400' as const },
  bodyMd: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodySm: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
} as const;

// Fuente cargada con expo-font en app/_layout.tsx (@expo-google-fonts/plus-jakarta-sans).
export const fontFamily = 'PlusJakartaSans_400Regular';
export const fontFamilyMedium = 'PlusJakartaSans_600SemiBold';
export const fontFamilyBold = 'PlusJakartaSans_700Bold';
