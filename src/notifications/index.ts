import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { listDosesTakenSince } from '@/db/queries/doses';
import { listMedicationsWithSchedule } from '@/db/queries/medications';
import { getProfile } from '@/db/queries/profile';

import { planReminders, type ReminderTrigger } from './plan';

const CHANNEL_ID = 'recordatorios';

/** Se llama una vez al iniciar la app. */
export async function setupNotifications(): Promise<void> {
  // Con la app abierta también se muestran (por defecto se ocultan).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de tomas',
      importance: AndroidImportance.HIGH,
    });
  }
}

export async function remindersEnabled(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Pide el permiso si el sistema todavía lo permite; si ya se negó, abre los
 * Ajustes del teléfono (es la única forma de activarlo después).
 */
export async function enableReminders(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    await Linking.openSettings();
    return false;
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  if (granted) await syncReminders();
  return granted;
}

function toExpoTrigger(trigger: ReminderTrigger): Notifications.NotificationTriggerInput {
  const { SchedulableTriggerInputTypes: T } = Notifications;
  switch (trigger.kind) {
    case 'daily':
      return { type: T.DAILY, hour: trigger.hour, minute: trigger.minute, channelId: CHANNEL_ID };
    case 'weekly':
      return {
        type: T.WEEKLY,
        weekday: trigger.weekday,
        hour: trigger.hour,
        minute: trigger.minute,
        channelId: CHANNEL_ID,
      };
    case 'date':
      return { type: T.DATE, date: trigger.date, channelId: CHANNEL_ID };
  }
}

async function runSync(): Promise<void> {
  if (!(await remindersEnabled())) return;
  const now = new Date();
  // 7 días: una semanal cuenta como hecha si se marcó en la última semana.
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const [medications, taken, profile] = await Promise.all([
    listMedicationsWithSchedule(),
    listDosesTakenSince(weekAgo.toISOString()),
    getProfile(),
  ]);

  // Borrar y volver a programar todo: sin ids guardados que puedan desincronizarse.
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of planReminders(medications, taken, profile?.displayName ?? null, now)) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body },
      trigger: toExpoTrigger(reminder.trigger),
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/**
 * Reprograma los recordatorios a partir de la base. Llamarla al abrir la app,
 * al guardar un medicamento y al marcar o deshacer una toma. Nunca lanza error:
 * un fallo aquí no debe impedir registrar una toma.
 */
export function syncReminders(): Promise<void> {
  // En fila: dos sincronizaciones a la vez podrían borrar lo que la otra programó.
  queue = queue.then(runSync).catch((error) => {
    console.warn('[recordatorios] no se pudieron programar', error);
  });
  return queue;
}
