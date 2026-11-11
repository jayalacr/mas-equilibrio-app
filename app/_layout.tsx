import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { setupNotifications, syncReminders } from '@/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Recordatorios: se reprograman al abrir la app y al volver del segundo plano
  // (puede haber cambiado el día). Tocar una notificación lleva a Hoy.
  useEffect(() => {
    setupNotifications().then(syncReminders);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders();
    });
    const tap = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/hoy');
    });
    return () => {
      appState.remove();
      tap.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
