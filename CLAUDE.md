# +EquilibRIo

App móvil (iOS y Android) para personas con **resistencia a la insulina (RI)**.
Se escribe **+EquilibRIo** y se pronuncia "Más Equilibrio" (la "RI" resaltada es
por resistencia a la insulina). Eslogan: *"Más equilibrio, un día a la vez."*

El asistente dentro de la app se llama **Liria**: es la voz de los mensajes,
recordatorios y resúmenes.

- Público: personas en México con RI. Solo en **español** por ahora.
- Primera usuaria real: usa Wegovy (inyección semanal), metformina y otras
  pastillas, y se hace estudios de laboratorio e InBody periódicamente.

## Cómo trabajar conmigo

- Soy ingeniero de software, pero **esta es mi primera app móvil**. Explica los
  conceptos propios de móvil (permisos, ciclo de vida, builds nativos, etc.)
  cuando aparezcan.
- **Cada vez que hagas un cambio en el código, explica qué cambiaste, las
  funciones nuevas y los comandos que uses o que yo deba correr.**
- Si hay una decisión de diseño abierta (esquema, librería, estructura),
  propón opciones antes de implementar.
- Antes de cambios grandes, presenta un plan y espera mi confirmación.
- Responde y escribe textos de la interfaz en español de México.

## Stack

- **App:** React Native + Expo + TypeScript (modo estricto), Expo Router.
- **Datos locales:** `expo-sqlite`. La app debe funcionar **sin internet**.
- **Recordatorios:** `expo-notifications` (notificaciones locales).
- **Gráficas:** `victory-native` o `react-native-gifted-charts` (por decidir).
- **Backend:** Supabase (auth, Postgres con Row Level Security, storage para
  fotos/PDFs de estudios, Edge Functions).
- **IA:** API de Claude llamada **solo desde una Supabase Edge Function**.
- **Builds y publicación:** EAS Build y EAS Submit.

## Comandos

```bash
npx expo start                 # servidor de desarrollo (abrir con Expo Go)
npx expo install <paquete>     # instalar librerías con versión compatible del SDK
npx expo run:ios --device      # build nativo en iPhone conectado (requiere Mac + Xcode)
eas build --platform android --profile preview   # APK instalable para pruebas
eas build --platform all       # builds de producción
eas submit --platform ios|android

# Verificación (correr antes de dar un cambio por terminado)
npx tsc --noEmit               # revisión de tipos
npx expo lint                  # lint
npx jest                       # pruebas (jest-expo)
```

Usa siempre `npx expo install` en lugar de `npm install` para librerías nativas.

Pruebas unitarias obligatorias para la lógica de `src/lib` y `src/features`:
HOMA-IR, TG/HDL, conversión de unidades, descuento de inventario y cálculo de
días restantes.

## Convenciones

- **Código en inglés:** variables, funciones, tipos, tablas, columnas y carpetas
  de `src/`.
- **Español:** textos de la interfaz, nombres de archivo de rutas en `app/`
  (son las URLs, ej. `hoy.tsx`) y mensajes de commit.

## Estructura

```
app/                  # pantallas (Expo Router: cada archivo = una ruta)
  (tabs)/
    hoy.tsx           # tomas pendientes del día
    medicamentos.tsx
    progreso.tsx      # InBody y estudios
src/
  db/                 # esquema, migraciones y consultas SQLite
  notifications/      # programar y cancelar recordatorios
  features/           # lógica por dominio (medications, measurements, ...)
  components/
  lib/                # utilidades (cálculos, fechas, formato)
supabase/
  functions/          # Edge Functions (ej. lectura de estudios con Claude)
```

## Funcionalidades

### 1. Medicamentos y recordatorios (MVP)
- Medicamentos con presentación (pluma, tabletas), dosis indicada por el médico
  y horario.
- Registro de cada toma/inyección: fecha, hora, dosis, zona de inyección (para
  rotar: abdomen, muslo, brazo) y notas de efectos secundarios.
- Historial de cambios de dosis (Wegovy se escala por etapas).
- Inventario de tabletas y dosis restantes en la pluma, descontado con cada
  registro.
- Aviso de compra ("te quedan ~5 días") según el consumo real.
- Recordatorio por toma, segundo aviso si no se marcó y recordatorio semanal de
  la inyección.

### 2. Progreso de estudios (MVP)
- InBody: peso, masa muscular esquelética, % grasa corporal, nivel de grasa
  visceral, tasa metabólica basal.
- Laboratorio: glucosa e insulina en ayunas, HbA1c, triglicéridos, HDL.
- Cálculos:
  - `HOMA-IR = (glucosa mg/dL × insulina µU/mL) / 405`
  - `TG/HDL = triglicéridos / HDL` (ambos en mg/dL)
- **Unidades:** guardar cada valor con su unidad tal como viene en el reporte
  (ej. glucosa en mg/dL o mmol/L, insulina en µU/mL o pmol/L). Convertir solo
  al momento de calcular, nunca sobrescribir el valor original.
- Gráficas en el tiempo con los **rangos de referencia del propio reporte**,
  comparación entre dos fechas y notas en la línea del tiempo.
- Exportar un resumen para llevar a consulta.

### 3. Liria con IA (fase posterior)
- Foto o PDF de estudios → extracción de valores con Claude (visión).
- Explicación de resultados en lenguaje sencillo.
- Resumen semanal de adherencia y hábitos.

### 4. Hábitos (fase posterior)
- Recordatorio de caminar después de comer.
- Método del plato con comida mexicana.
- Apple Health / Health Connect (requiere development build, no Expo Go).

## Orden de desarrollo

1. Medicamentos, tomas, inventario y recordatorios (todo local).
2. Captura manual de InBody y estudios con gráficas.
3. Login y respaldo con Supabase.
4. Lectura de estudios con IA (Liria).
5. Hábitos e integraciones de salud.

## Reglas de seguridad (obligatorias)

- **La app nunca calcula, sugiere ni modifica dosis.** Para la pluma, el usuario
  anota dosis y "clicks" tal como se los indicó su médico; la app solo registra
  y recuerda ese valor.
- **No diagnosticar.** Liria no da diagnósticos ni recomendaciones de
  tratamiento; siempre sugiere comentar los resultados con el médico.
- **Los valores extraídos por IA se muestran para confirmar antes de
  guardarse.** Nunca se guardan automáticamente.
- Usar los rangos de referencia del reporte del laboratorio, no rangos fijos
  inventados.
- Incluir el aviso: *"+EquilibRIo es una herramienta de apoyo y no sustituye
  la atención médica."*
- Lenguaje sin culpa ni presión sobre comida o peso.

## Privacidad y datos

- Los datos de salud son **datos sensibles** según la ley mexicana de
  protección de datos personales: consentimiento explícito, aviso de
  privacidad, mínimo de datos necesarios.
- Row Level Security en todas las tablas de Supabase (cada usuario solo ve lo
  suyo).
- **Nunca** poner API keys en el código de la app ni en el repositorio; usar
  variables de entorno y secretos de Supabase.
- No enviar datos de salud a servicios externos salvo la llamada a Claude desde
  la Edge Function.
- **Cifrado local (decidido):** la base SQLite no se cifra aparte; se confía en
  el sandbox y el cifrado de disco de iOS/Android. No agregar SQLCipher ni
  bloqueo biométrico sin que yo lo pida. Todo acceso a la base pasa por
  `src/db/` para poder cambiarlo después.

## Consideraciones técnicas de móvil

- iOS permite ~64 notificaciones locales programadas a la vez: usar
  notificaciones **repetitivas** (diarias/semanales) en vez de programar cada
  toma por separado.
- Pedir permiso de notificaciones con contexto; la app debe funcionar aunque
  el usuario lo niegue.
- La app se suspende en segundo plano: recalcular inventario y alertas al abrir
  la app o al registrar una toma, no con procesos continuos.
- Fechas y horas: guardar timestamps en **UTC (ISO 8601)** y mostrarlos en la
  zona horaria del dispositivo. Los horarios de recordatorio ("08:00") se
  guardan como hora local, sin fecha ni zona.
- **Llaves primarias UUID** en todas las tablas locales (no autoincrementales),
  para poder sincronizar con Supabase en la fase 3 sin migrar IDs.

## Publicación

- Desarrollar y probar gratis el mayor tiempo posible (Expo Go, Xcode con Apple
  ID gratuito, APK en Android).
- Apple Developer (99 USD/año) solo al llegar a TestFlight/publicación.
- Google Play (25 USD, pago único): una cuenta personal nueva requiere prueba
  cerrada con **12 testers durante 14 días continuos** antes de publicar.
- Las tiendas revisan con detalle las apps de salud: política de privacidad,
  descripción sin promesas médicas y avisos de que no sustituye al médico.
- Identificador de la app (iOS `bundleIdentifier` y Android `package`):
  `com.code4u.masequilibrio`. No cambiarlo nunca después del primer build.
