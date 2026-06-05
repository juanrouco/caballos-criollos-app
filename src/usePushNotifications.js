import React from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from './api';
import { navigateOnNotificationTap } from './navigation';

// projectId que `getExpoPushTokenAsync` necesita en SDK 50+. Se setea
// en app.json bajo `expo.extra.eas.projectId` después de `eas init`.
// Si no existe, en Expo Go suele inferirse solo; en builds standalone
// es obligatorio.
function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    null
  );
}

// Identificador estable del dispositivo, distinto por install:
//   - iOS: identifierForVendor (UUID por vendor, estable por device).
//   - Android: ANDROID_ID (estable por user/device).
// Si por alguna razón el valor no viene, devolvemos null y el backend
// lo guarda como NULL — el flujo de registro no se rompe por esto.
async function resolveDeviceId() {
  try {
    if (Platform.OS === 'ios')     return await Application.getIosIdForVendorAsync();
    if (Platform.OS === 'android') return Application.getAndroidId();
  } catch {}
  return null;
}

// Comportamiento por default cuando la app está en foreground: mostramos
// banner + sonido + badge para que se vea igual que en background.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  // (1) Permisos + token + register. Idempotente: si el usuario rechaza
  // el permiso, no insistimos. En sim de iOS sin device, getExpoPushTokenAsync
  // tira — lo capturamos en silencio.
  React.useEffect(() => {
    (async () => {
      try {
        // Pedimos permiso siempre — sirve para local notifications y para
        // que `xcrun simctl push` pueda entregar payloads simulados al sim.
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        // Skip del token fetch: el sim no entrega APNS real (Apple lo bloquea)
        // y Expo Go SDK 53+ removió el soporte de getExpoPushTokenAsync.
        // El listener de tap más abajo sigue activo, así local notifs +
        // nav siguen funcionando para demos.
        if (Device.isDevice === false) {
          if (__DEV__) console.log('[push] skip token: no es un device físico');
          return;
        }
        if (Constants?.executionEnvironment === 'storeClient') {
          if (__DEV__) console.log('[push] skip token: Expo Go no soporta push remoto desde SDK 53. Usá dev build.');
          return;
        }
        const projectId = getProjectId();
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (!token) return;
        const device_id = await resolveDeviceId();
        if (__DEV__) console.log('[push] token:', token, '· device_id:', device_id);
        try {
          await registerPushToken({ token, plataforma: Platform.OS, device_id });
        } catch (e) {
          if (__DEV__) console.warn('[push] register falló:', e.message);
        }
      } catch (e) {
        if (__DEV__) console.warn('[push] setup falló:', e.message);
      }
    })();
  }, []);

  // (2) Listener de tap. addNotificationResponseReceivedListener atrapa
  // tanto los taps con la app en foreground como los cold-start desde
  // una notif (Expo bufferea hasta que te suscribís).
  React.useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response?.notification?.request?.content || {};
      if (__DEV__) {
        console.log('[push] tap recibido. content:', JSON.stringify(content));
      }
      // El payload llega con shapes distintos según el origen:
      //   - Push real del API de Expo: content.data ya es {kind, ...} parseado.
      //   - simctl push (raw APNS con el body de Expo): content.data es
      //     un string '{"data":{kind,...}}' que hay que parsear y unwrappear.
      let data = content.data || {};
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }
      // Si quedó wrappeado en {data: {...}} sin kind al top level, unwrappear.
      if (data && data.data && !data.kind) {
        data = data.data;
      }
      if (__DEV__) console.log('[push] data extraída:', data);
      navigateOnNotificationTap(data);
    });
    return () => sub.remove();
  }, []);
}
