import React from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken, bajaPushToken, getSession, subscribeSession } from './api';
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

// ¿Está concedido el permiso de notificaciones? Con `pedir`, la primera vez se
// promptea (después el sistema contesta solo lo que ya eligió el socio); sin
// `pedir` sólo se consulta, que es lo que corresponde al volver de background:
// ahí volver a pedirlo sería insistir con algo que el socio ya contestó.
async function permisoConcedido(pedir) {
  const { status } = pedir
    ? await Notifications.requestPermissionsAsync()
    : await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// Registra el token de este aparato. Devuelve `false` cuando el aparato NO
// quedó registrado: en el simulador y en Expo Go no hay token que registrar
// (Apple no entrega APNS al sim, y Expo Go dejó de soportar push remoto en SDK
// 53), y un POST que falla tampoco deja nada registrado.
async function registrarEnBackend() {
  if (Device.isDevice === false) {
    if (__DEV__) console.log('[push] skip token: no es un device físico');
    return false;
  }
  if (Constants?.executionEnvironment === 'storeClient') {
    if (__DEV__) console.log('[push] skip token: Expo Go no soporta push remoto desde SDK 53. Usá dev build.');
    return false;
  }
  const projectId = getProjectId();
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  if (!token) return false;
  const device_id = await resolveDeviceId();
  if (__DEV__) {
    console.log('[push] token:', token, '· device_id:', device_id,
      '· sesión:', getSession() ? 'sí' : 'no');
  }
  try {
    await registerPushToken({ token, plataforma: Platform.OS, device_id });
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[push] register falló:', e.message);
    return false;
  }
}

// Da de baja los tokens de este aparato. Devuelve si la baja quedó hecha.
async function darDeBajaEnBackend() {
  const device_id = await resolveDeviceId();
  // Sin aparato que nombrar no hay baja que mandar: el backend rechaza un
  // device_id vacío con 400.
  if (!device_id) return false;
  try {
    await bajaPushToken({ device_id });
    if (__DEV__) console.log('[push] baja del aparato:', device_id);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[push] baja falló:', e.message);
    return false;
  }
}

// Comportamiento por default cuando la app está en foreground: mostramos
// banner + sonido + badge para que se vea igual que en background.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    // No seteamos el badge del ícono con la app en foreground: el usuario ya
    // la está usando. El badge sólo importa con la app cerrada (lo trae el push).
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  // Los pedidos al backend salen de a uno. Dos registros del mismo aparato
  // cruzados dejarían el token atado a la cuenta equivocada —o desatado—,
  // porque el último que llega es el que manda, y eso pasa de verdad: el
  // registro del arranque tarda (permiso, token, device_id) y el del login
  // puede salir mientras ese todavía está en el aire.
  const cola = React.useRef(Promise.resolve());
  // El aparato quedó dado de baja en el backend, y va a seguir así hasta que un
  // register lo reactive. Lo recordamos para re-registrar si el socio vuelve a
  // conceder el permiso sin reiniciar la app.
  const dadoDeBaja = React.useRef(false);

  // El único camino que toca el backend: según el permiso, registra el token o
  // da de baja el aparato. Es idempotente de los dos lados, así que se puede
  // volver a llamar sin pensar — al arrancar, al cambiar la sesión y al volver
  // de background.
  const sincronizar = React.useCallback((pedirPermiso = false) => {
    cola.current = cola.current.then(async () => {
      try {
        if (await permisoConcedido(pedirPermiso)) {
          if (await registrarEnBackend()) dadoDeBaja.current = false;
        } else if (await darDeBajaEnBackend()) {
          dadoDeBaja.current = true;
        }
      } catch (e) {
        if (__DEV__) console.warn('[push] setup falló:', e.message);
      }
    });
    return cola.current;
  }, []);

  // (1) Arranque: permiso + token + register, o baja si el permiso no está.
  // El permiso se pide siempre, incluso donde no hay token que registrar:
  // sirve para las notificaciones locales y para que `xcrun simctl push` pueda
  // entregar payloads simulados al sim.
  React.useEffect(() => { sincronizar(true); }, [sincronizar]);

  // (2) Re-registrar al loguearse y al cerrar sesión. El register es lo que
  // ata el token a la cuenta (con Bearer) o lo desata (sin Bearer), así que sin
  // esto el teléfono del socio nunca queda atado: no recibiría una
  // notificación personal ni aparecería en el selector del admin.
  //
  // `subscribeSession` también emite en cada refresh del access, que pasa cada
  // 60 minutos de uso; lo que importa acá es de quién es la sesión, no cuántas
  // veces se renovó, así que comparamos el id y registramos sólo cuando cambia.
  React.useEffect(() => {
    let usuario = getSession()?.usuarioId ?? null;
    return subscribeSession((s) => {
      const proximo = s?.usuarioId ?? null;
      if (proximo === usuario) return;
      usuario = proximo;
      sincronizar();
    });
  }, [sincronizar]);

  // (3) Tap handler — navega al destino (deeplink) de la notif tocada.
  //
  // addNotificationResponseReceivedListener cubre los taps con la app VIVA
  // (foreground/background). Pero en COLD START (app terminada que se abre
  // tocando la notif) ese listener no dispara de forma confiable y la app queda
  // en el Home. Para ese caso consultamos al montar getLastNotificationResponseAsync(),
  // que devuelve la response que lanzó la app (si la hubo). Dedup por id de notif
  // para no navegar dos veces si ambos caminos entregan la misma.
  React.useEffect(() => {
    let mounted = true;
    let handledId = null;

    const handleResponse = (response) => {
      if (!response) return;
      const req = response.notification?.request;
      const id = req?.identifier ?? null;
      if (id !== null && id === handledId) return; // ya navegamos por esta notif
      handledId = id;

      const content = req?.content || {};
      if (__DEV__) console.log('[push] tap recibido. content:', JSON.stringify(content));
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
    };

    // Cold start: la notif que abrió la app desde estado terminado. El listener
    // de abajo no la entrega confiablemente; esto sí.
    const lastResp = Notifications.getLastNotificationResponseAsync?.();
    if (lastResp?.then) {
      lastResp.then((response) => { if (mounted) handleResponse(response); }).catch(() => {});
    }

    // Taps con la app viva (foreground/background).
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => { mounted = false; sub.remove(); };
  }, []);

  // (4) Badge del ícono de la app. El push trae badge:1 para marcar el ícono
  // mientras la app está cerrada; lo reseteamos a 0 al abrir y cada vez que
  // la app vuelve a foreground, así no queda el indicador después de leerla.
  React.useEffect(() => {
    Notifications.setBadgeCountAsync(0).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') Notifications.setBadgeCountAsync(0).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // (5) El permiso puede cambiar mientras la app está en background: el socio
  // lo apaga (o lo vuelve a prender) desde Ajustes y vuelve. Al volver a
  // foreground re-chequeamos: si ya no está concedido, el aparato se da de baja
  // —el backend tiene que dejar de contarlo como destinatario—, y si volvió a
  // estar concedido después de una baja, se re-registra, que es lo que reactiva
  // el token. Si no cambió nada, no se manda nada.
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      (async () => {
        let concedido = false;
        try { concedido = await permisoConcedido(false); } catch {}
        if (!concedido || dadoDeBaja.current) sincronizar();
      })();
    });
    return () => sub.remove();
  }, [sincronizar]);
}
