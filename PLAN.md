# Plan de desarrollo — +EquilibRIo

> *Más equilibrio, un día a la vez.*

Este documento divide el proyecto en **fases** (bloques grandes con un objetivo
claro) y cada fase en **etapas** (pasos pequeños que se pueden terminar y
probar uno por uno). Marca las casillas `[x]` conforme avances.

---

## Mapa general

```
Fase 0  Preparación             → la app abre en tu teléfono
Fase 1  Medicamentos            → la usuaria ya puede usarla a diario   ┐
Fase 2  Estudios y gráficas     → ve su progreso en el tiempo           ┘ MVP
Fase 3  Login y respaldo        → sus datos no se pierden si cambia de teléfono
Fase 4  Liria con IA            → toma foto del estudio y se llena solo
Fase 5  Hábitos y salud         → caminar, método del plato, Apple Health
Fase 6  Publicación             → disponible en App Store y Google Play
```

| Fase | ¿Necesita internet? | ¿Funciona en Expo Go? | ¿Cuesta dinero? |
|---|---|---|---|
| 0 – 2 | No | Sí | No |
| 3 – 4 | Sí (solo para respaldo e IA) | Parcialmente | Supabase y Claude tienen capa gratis / pago por uso |
| 5 | No | **No** (requiere development build) | No |
| 6 | — | — | Apple 99 USD/año, Google 25 USD una vez |

**Regla de oro:** no se empieza una fase sin terminar y probar la anterior.
Al final de cada fase la app debe ser usable, aunque le falten cosas.

---

## Fase 0 — Preparación

**Objetivo:** tener el proyecto creado y corriendo en tu iPhone con las tres
pestañas vacías.

- [ ] **0.1 Crear el proyecto Expo** con TypeScript estricto y Expo Router.
- [ ] **0.2 Configurar `app.json`:** nombre "+EquilibRIo", identificador
      `com.code4u.masequilibrio`, ícono y color provisionales.
- [ ] **0.3 Herramientas de verificación:** `tsc`, `expo lint` y `jest-expo`
      funcionando con una prueba de ejemplo.
- [ ] **0.4 Correr en tu teléfono** con Expo Go (escaneando el QR).
- [ ] **0.5 Navegación base:** pestañas **Hoy**, **Medicamentos** y
      **Progreso**, y el aviso *"+EquilibRIo es una herramienta de apoyo y no
      sustituye la atención médica."*

**Conceptos móviles que aparecen:** Expo Go, Metro (el servidor que manda el
código al teléfono), `app.json`, rutas por archivo.

**Terminada cuando:** abres la app en tu iPhone y navegas entre las 3 pestañas.

---

## Fase 1 — Medicamentos y recordatorios (MVP)

**Objetivo:** que la primera usuaria registre sus medicamentos, marque sus
tomas y reciba recordatorios. Todo sin internet.

- [ ] **1.1 Base de datos local** (`expo-sqlite`): tablas de medicamentos,
      cambios de dosis, horarios, tomas e inventario. IDs tipo UUID y
      migraciones (cómo cambia el esquema entre versiones).
- [ ] **1.2 Alta de medicamentos:** nombre, presentación (pluma o tabletas),
      dosis *tal como la indicó el médico* y horario.
- [ ] **1.3 Historial de dosis:** registrar cuando el médico cambia la dosis
      (Wegovy sube por etapas). La app solo anota, nunca sugiere.
- [ ] **1.4 Pantalla Hoy:** lista de tomas pendientes; marcar como tomada con
      hora, dosis, zona de inyección (abdomen, muslo, brazo) y notas de
      efectos secundarios.
- [ ] **1.5 Inventario:** tabletas o dosis restantes en la pluma, descontadas
      en cada toma, y aviso *"te quedan ~5 días"*.
- [ ] **1.6 Recordatorios:**
  - Pedir permiso de notificaciones explicando para qué (y que la app
    funcione aunque digan que no).
  - Recordatorio diario por toma y semanal para la inyección.
  - Segundo aviso si no se marcó la toma.
- [ ] **1.7 Bienvenida de Liria:** al abrir la app, el ajolote saluda con una
      frase del banco común (rota cada día).
- [ ] **1.8 Prueba real:** la primera usuaria la usa 1–2 semanas y anotamos lo
      que falla o estorba.

**Conceptos móviles que aparecen:** permisos, notificaciones locales, límite de
~64 notificaciones en iOS, ciclo de vida (la app se "duerme" en segundo plano),
almacenamiento local.

**Terminada cuando:** la usuaria deja de usar alarmas o notas aparte para sus
medicamentos.

---

## Fase 2 — Estudios y gráficas (MVP)

**Objetivo:** capturar InBody y laboratorios a mano y ver la evolución.

- [ ] **2.1 Decidir librería de gráficas:** `victory-native` o
      `react-native-gifted-charts` (te presento opciones antes).
- [ ] **2.2 Captura de InBody:** peso, masa muscular, % grasa, grasa visceral,
      tasa metabólica basal.
- [ ] **2.3 Captura de laboratorio:** glucosa, insulina, HbA1c,
      triglicéridos, HDL, cada uno con **su unidad** y **el rango de referencia
      del reporte**.
- [ ] **2.4 Cálculos:** HOMA-IR y TG/HDL, con pruebas unitarias.
- [ ] **2.5 Gráficas en el tiempo** con la franja del rango de referencia y
      notas en la línea del tiempo.
- [ ] **2.6 Comparar dos fechas** lado a lado.
- [ ] **2.7 Exportar resumen** en PDF para llevar a consulta.
- [ ] **2.8 Elige a tu Liria:** paso opcional al iniciar para escoger entre
      brote, colibrí, ajolote o gota (por defecto, ajolote), cambiable en
      Ajustes. Requiere ilustraciones finales de los 4.
- [ ] **2.9 Primer APK de prueba** con EAS Build para instalar en Android sin
      tienda.

**Conceptos móviles que aparecen:** teclados numéricos, generar y compartir
archivos, EAS Build (compilar en la nube).

**Terminada cuando:** la usuaria lleva el PDF a su consulta.

> 🏁 **Aquí termina el MVP.** Decisión pendiente: ¿se publica ya, o se espera
> a tener respaldo (Fase 3) para que nadie pierda datos al cambiar de teléfono?

---

## Fase 3 — Login y respaldo con Supabase

**Objetivo:** que los datos se respalden en la nube, sin dejar de funcionar
sin internet.

- [ ] **3.1 Proyecto Supabase:** elegir región, crear tablas equivalentes a
      las locales con Row Level Security (cada quien ve solo lo suyo).
- [ ] **3.2 Aviso de privacidad y consentimiento** explícito para datos de
      salud (revisar con alguien de legal: nueva ley de datos personales 2025).
- [ ] **3.3 Login:** correo con enlace mágico o código. Si se agrega Google,
      Apple exige también "Iniciar sesión con Apple".
- [ ] **3.4 Sincronización:** la app sigue guardando local primero y sube los
      cambios cuando hay internet.
- [ ] **3.5 Restaurar en un teléfono nuevo.**
- [ ] **3.6 Borrar cuenta y datos** desde la app (lo exigen ambas tiendas).

**Conceptos móviles que aparecen:** deep links (regresar a la app desde el
correo), development build, guardar la sesión de forma segura.

**Terminada cuando:** borras la app, la reinstalas, inicias sesión y aparece
todo.

---

## Fase 4 — Liria con IA

**Objetivo:** leer estudios desde una foto o PDF y explicarlos en lenguaje
sencillo.

- [ ] **4.1 Edge Function** en Supabase que llama a Claude (la API key vive
      solo en los secretos de Supabase).
- [ ] **4.2 Consentimiento específico** para enviar el estudio a la IA.
- [ ] **4.3 Subir foto o PDF** (cámara, galería o archivos).
- [ ] **4.4 Extracción de valores:** Liria propone los valores, unidades y
      rangos → **pantalla de confirmación** → solo entonces se guardan.
- [ ] **4.5 Explicación sencilla** de los resultados, sin diagnóstico y
      sugiriendo comentarlos con el médico.
- [ ] **4.6 Resumen semanal** de adherencia.

**Terminada cuando:** una foto de un estudio real termina guardada
correctamente después de que la usuaria la confirma.

---

## Fase 5 — Hábitos e integraciones

- [ ] **5.1 Recordatorio de caminar** después de comer.
- [ ] **5.2 Método del plato** con comida mexicana (sin culpa ni presión).
- [ ] **5.3 Apple Health / Health Connect** (pasos, peso).

**Concepto móvil que aparece:** development build obligatorio — Expo Go ya no
alcanza porque se necesita código nativo extra.

---

## Fase 6 — Publicación

Puede empezar al terminar el MVP o la Fase 3, según la decisión de la Fase 2.

- [ ] **6.1 Material de tienda:** descripción sin promesas médicas, capturas,
      política de privacidad publicada en una URL.
- [ ] **6.2 Google Play:** pagar cuenta (25 USD) e iniciar **cuanto antes** la
      prueba cerrada con **12 testers durante 14 días seguidos** (es requisito
      para cuentas personales nuevas).
- [ ] **6.3 Apple:** pagar Apple Developer (99 USD/año), subir a TestFlight y
      probar.
- [ ] **6.4 Enviar a revisión** con EAS Submit y atender observaciones (las
      apps de salud se revisan con detalle).

---

## Decisiones pendientes

| Decisión | Cuándo hay que tomarla |
|---|---|
| Librería de gráficas | Inicio de Fase 2 |
| ¿Publicar el MVP sin respaldo en la nube? | Fin de Fase 2 |
| Región de Supabase | Inicio de Fase 3 |
| Método de login | Fase 3 |

## Ya decidido

- Identificador: `com.code4u.masequilibrio`.
- Cifrado local: solo el del sistema operativo (sin SQLCipher).
- IDs UUID, fechas en UTC, valores de laboratorio con su unidad original.
- Estilos: `StyleSheet` + tokens; animaciones con reanimated y expo-haptics.
- Liria: avatar ajolote por ahora; todas las formas se llaman Liria y comparten
  banco de frases.

## Glosario rápido

- **Expo Go:** app que descargas de la tienda y que corre tu código sin
  compilar. Rápida para desarrollar, pero no admite código nativo extra.
- **Development build:** tu propia versión de "Expo Go" con las librerías
  nativas que necesites. Se necesita en las Fases 3 y 5.
- **EAS Build:** servicio de Expo que compila la app en la nube (APK para
  Android, IPA para iOS).
- **Notificación local:** la programa el propio teléfono, no necesita
  internet ni servidor.
- **RLS (Row Level Security):** regla en la base de Supabase que impide que un
  usuario lea datos de otro.
- **Edge Function:** pequeño servidor en Supabase; ahí vive la llave de Claude
  para que nunca esté dentro de la app.
