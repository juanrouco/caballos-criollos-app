import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../src/api', () => ({
  registerPushToken: jest.fn(),
  bajaPushToken: jest.fn(),
  getSession: jest.fn(() => null),
  subscribeSession: jest.fn(() => () => {}),
}));
jest.mock('../src/navigation', () => ({
  navigationRef: { isReady: () => true, dispatch: jest.fn(), getState: () => ({ routes: [] }) },
  navigateOnNotificationTap: jest.fn(),
}));

const Notifications = require('expo-notifications');
const Application = require('expo-application');
const Device = require('expo-device');
const Constants = require('expo-constants').default;
const { AppState } = require('react-native');
const {
  registerPushToken, bajaPushToken, getSession, subscribeSession,
} = require('../src/api');
const { navigateOnNotificationTap } = require('../src/navigation');
const { usePushNotifications } = require('../src/usePushNotifications');

function Probe() {
  usePushNotifications();
  return <Text>ok</Text>;
}

const flushPromises = () => new Promise((res) => process.nextTick(res));
// El trabajo del hook sale por una cola de promesas (permiso → token →
// device_id → POST), así que hace falta ceder el turno varias veces.
const flush = async (n = 6) => { for (let i = 0; i < n; i += 1) await flushPromises(); };

// Los callbacks que el hook registró en AppState, para poder simular el
// "volvió a foreground" sin tocar nada nativo.
let enForeground = [];
const volverAlForeground = () => act(async () => {
  enForeground.forEach((cb) => cb('active'));
  await flush();
});

// El listener que el hook le pasó a subscribeSession: así los tests simulan un
// login o un logout emitiendo la sesión, igual que src/api/session.js.
const emitirSesion = async (sesion) => {
  getSession.mockReturnValue(sesion);
  const avisar = subscribeSession.mock.calls[0][0];
  await act(async () => { avisar(sesion); await flush(); });
};

beforeEach(() => {
  enForeground = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((ev, cb) => {
    enForeground.push(cb);
    return { remove: jest.fn() };
  });
  Notifications.requestPermissionsAsync.mockReset();
  Notifications.getPermissionsAsync.mockReset();
  Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
  Notifications.getExpoPushTokenAsync.mockReset();
  Notifications.addNotificationResponseReceivedListener.mockReset();
  Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
  Notifications.getLastNotificationResponseAsync.mockReset();
  Notifications.getLastNotificationResponseAsync.mockResolvedValue(null);
  Notifications.setBadgeCountAsync.mockClear();
  Application.getIosIdForVendorAsync.mockReset();
  Application.getIosIdForVendorAsync.mockResolvedValue('IFV-1234');
  Application.getAndroidId.mockReset();
  Application.getAndroidId.mockReturnValue('AID-5678');
  registerPushToken.mockReset();
  registerPushToken.mockResolvedValue({});
  bajaPushToken.mockReset();
  bajaPushToken.mockResolvedValue({ ok: true });
  getSession.mockReset();
  getSession.mockReturnValue(null);
  subscribeSession.mockReset();
  subscribeSession.mockReturnValue(() => {});
  navigateOnNotificationTap.mockReset();
});

afterEach(() => { AppState.addEventListener.mockRestore(); });

describe('usePushNotifications', () => {
  test('pide permiso → obtiene token + device_id → registra en el backend', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[xyz]' });
    registerPushToken.mockResolvedValue({});
    render(<Probe />);
    await act(async () => { await flushPromises(); await flushPromises(); await flushPromises(); });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    expect(registerPushToken).toHaveBeenCalledWith({
      token: 'ExponentPushToken[xyz]',
      plataforma: expect.any(String),
      device_id: expect.any(String),
    });
  });

  test('si Application falla, device_id queda null pero igual registra', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'tk' });
    Application.getIosIdForVendorAsync.mockRejectedValue(new Error('not available'));
    Application.getAndroidId.mockImplementation(() => { throw new Error('not available'); });
    registerPushToken.mockResolvedValue({});
    render(<Probe />);
    await act(async () => { await flushPromises(); await flushPromises(); await flushPromises(); });
    expect(registerPushToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tk', device_id: null }),
    );
  });

  test('si el usuario rechaza el permiso, no registra: da de baja el aparato', async () => {
    // Sin permiso el token no entrega nada, así que dejarlo activo haría que el
    // backend siga contando este teléfono entre los destinatarios.
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<Probe />);
    await act(async () => { await flush(); });
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(registerPushToken).not.toHaveBeenCalled();
    expect(bajaPushToken).toHaveBeenCalledWith({ device_id: 'IFV-1234' });
  });

  test('si getExpoPushTokenAsync tira (ej. sim sin device), no rompe ni registra', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('no device'));
    render(<Probe />);
    await act(async () => { await flushPromises(); await flushPromises(); });
    expect(registerPushToken).not.toHaveBeenCalled();
  });

  test('si registerPushToken falla, el hook no rompe', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'tk' });
    registerPushToken.mockRejectedValue(new Error('500'));
    expect(() => render(<Probe />)).not.toThrow();
    await act(async () => { await flushPromises(); await flushPromises(); });
  });


  test('en Expo Go (storeClient) pide permiso pero no fetchea token ni registra', async () => {
    const prev = Constants.executionEnvironment;
    Constants.executionEnvironment = 'storeClient';
    try {
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      render(<Probe />);
      await act(async () => { await flushPromises(); await flushPromises(); });
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
      expect(registerPushToken).not.toHaveBeenCalled();
    } finally {
      Constants.executionEnvironment = prev;
    }
  });

  test('suscribe el listener de tap y al recibir una response llama navigateOnNotificationTap', async () => {
    let listener;
    Notifications.addNotificationResponseReceivedListener.mockImplementation((cb) => {
      listener = cb;
      return { remove: jest.fn() };
    });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<Probe />);
    await act(async () => { await flushPromises(); });
    expect(typeof listener).toBe('function');
    const data = { kind: 'vivo', evento_id: 7 };
    act(() => {
      listener({ notification: { request: { content: { data } } } });
    });
    expect(navigateOnNotificationTap).toHaveBeenCalledWith(data);
  });

  test('si content.data viene como string JSON (formato Expo body), lo parsea', async () => {
    let listener;
    Notifications.addNotificationResponseReceivedListener.mockImplementation((cb) => {
      listener = cb;
      return { remove: jest.fn() };
    });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<Probe />);
    await act(async () => { await flushPromises(); });
    act(() => {
      listener({
        notification: {
          request: {
            content: { data: '{"data":{"kind":"vivo","evento_id":42}}' },
          },
        },
      });
    });
    // Parseado y unwrappeado.
    expect(navigateOnNotificationTap).toHaveBeenCalledWith({ kind: 'vivo', evento_id: 42 });
  });

  test('al montar resetea el badge del ícono de la app a 0', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<Probe />);
    await act(async () => { await flushPromises(); });
    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  test('cold start: navega usando getLastNotificationResponseAsync (notif que abrió la app)', async () => {
    // El listener no dispara en cold start; la response viene por getLast*.
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    Notifications.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { identifier: 'abc', content: { data: { kind: 'evento', evento_id: 5 } } } },
    });
    render(<Probe />);
    await act(async () => { await flushPromises(); await flushPromises(); });
    expect(navigateOnNotificationTap).toHaveBeenCalledWith({ kind: 'evento', evento_id: 5 });
  });

  test('dedup: si getLast y el listener entregan la misma notif (mismo id), navega una sola vez', async () => {
    let listener;
    Notifications.addNotificationResponseReceivedListener.mockImplementation((cb) => {
      listener = cb;
      return { remove: jest.fn() };
    });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const response = {
      notification: { request: { identifier: 'dup-1', content: { data: { kind: 'vivo', evento_id: 9 } } } },
    };
    Notifications.getLastNotificationResponseAsync.mockResolvedValue(response);
    render(<Probe />);
    await act(async () => { await flushPromises(); await flushPromises(); });
    // El listener re-entrega la MISMA notif (mismo identifier).
    act(() => { listener(response); });
    expect(navigateOnNotificationTap).toHaveBeenCalledTimes(1);
  });

  test('si content.data ya es {data: {...}} (objeto wrappeado), también lo unwrappea', async () => {
    let listener;
    Notifications.addNotificationResponseReceivedListener.mockImplementation((cb) => {
      listener = cb;
      return { remove: jest.fn() };
    });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<Probe />);
    await act(async () => { await flushPromises(); });
    act(() => {
      listener({
        notification: {
          request: {
            content: { data: { data: { kind: 'noticia', id: 99 } } },
          },
        },
      });
    });
    expect(navigateOnNotificationTap).toHaveBeenCalledWith({ kind: 'noticia', id: 99 });
  });
  // ── Registro atado a la cuenta (Pieza A) ──────────────────────────
  //
  // El register es lo único que ata el teléfono a una cuenta: con Bearer lo
  // ata, sin Bearer lo desata. Por eso tiene que volver a salir cada vez que
  // cambia de quién es la sesión.

  const conPermisoYToken = () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'tk' });
  };

  test('al loguearse vuelve a registrar: sin esto el teléfono nunca queda atado', async () => {
    conPermisoYToken();
    render(<Probe />);
    await act(async () => { await flush(); });
    expect(registerPushToken).toHaveBeenCalledTimes(1);

    await emitirSesion({ usuarioId: 7 });
    expect(registerPushToken).toHaveBeenCalledTimes(2);
  });

  test('al cerrar sesión vuelve a registrar — el register anónimo es lo que desata el token', async () => {
    conPermisoYToken();
    render(<Probe />);
    await act(async () => { await flush(); });
    await emitirSesion({ usuarioId: 7 });
    await emitirSesion(null);
    expect(registerPushToken).toHaveBeenCalledTimes(3);
  });

  test('un refresh del access no re-registra: la sesión sigue siendo del mismo socio', async () => {
    // El access se renueva cada 60 minutos de uso y eso emite igual. Registrar
    // de nuevo ahí sería un POST por hora sin que cambie nada.
    conPermisoYToken();
    render(<Probe />);
    await act(async () => { await flush(); });
    await emitirSesion({ usuarioId: 7, accessToken: 'AT-1' });
    await emitirSesion({ usuarioId: 7, accessToken: 'AT-2' });
    expect(registerPushToken).toHaveBeenCalledTimes(2);
  });

  test('dos registros no se cruzan: el del login espera al del arranque', async () => {
    // Si se cruzaran, el que llega último es el que manda, y podría ser el
    // anónimo del arranque: el token quedaría desatado justo después del login.
    conPermisoYToken();
    const orden = [];
    registerPushToken.mockImplementation(async () => {
      orden.push('entra');
      await flushPromises();
      orden.push('sale');
    });
    render(<Probe />);
    // El login llega sin esperar a que termine el registro del arranque.
    await emitirSesion({ usuarioId: 7 });
    await act(async () => { await flush(10); });
    expect(orden).toEqual(['entra', 'sale', 'entra', 'sale']);
  });

  test('si el permiso se apagó mientras la app estaba en background, al volver da de baja', async () => {
    conPermisoYToken();
    render(<Probe />);
    await act(async () => { await flush(); });
    expect(bajaPushToken).not.toHaveBeenCalled();

    // El socio apagó las notificaciones desde Ajustes y volvió a la app.
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await volverAlForeground();
    expect(bajaPushToken).toHaveBeenCalledWith({ device_id: 'IFV-1234' });
  });

  test('volver a foreground sin que el permiso cambie no manda nada', async () => {
    conPermisoYToken();
    render(<Probe />);
    await act(async () => { await flush(); });
    await volverAlForeground();
    expect(registerPushToken).toHaveBeenCalledTimes(1);
    expect(bajaPushToken).not.toHaveBeenCalled();
  });

  test('al volver a conceder el permiso después de una baja, re-registra', async () => {
    // Es lo que reactiva el token: el backend lo dejó inactivo con la baja.
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'tk' });
    render(<Probe />);
    await act(async () => { await flush(); });
    expect(bajaPushToken).toHaveBeenCalledTimes(1);
    expect(registerPushToken).not.toHaveBeenCalled();

    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await volverAlForeground();
    expect(registerPushToken).toHaveBeenCalledTimes(1);

    // Y una vez reactivado, el siguiente foreground ya no manda nada.
    await volverAlForeground();
    expect(registerPushToken).toHaveBeenCalledTimes(1);
  });

  test('sin device_id no se manda la baja: el backend la rechazaría con 400', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    Application.getIosIdForVendorAsync.mockResolvedValue(null);
    Application.getAndroidId.mockReturnValue(null);
    render(<Probe />);
    await act(async () => { await flush(); });
    expect(bajaPushToken).not.toHaveBeenCalled();
  });

  test('en el simulador no hay token: no registra, pero tampoco da de baja', async () => {
    // Un aparato sin token no está registrado, así que no hay nada que dar de
    // baja; mandarla igual apagaría el token de otra instalación del mismo
    // aparato por nada.
    const prev = Device.isDevice;
    Device.isDevice = false;
    try {
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      render(<Probe />);
      await act(async () => { await flush(); });
      expect(registerPushToken).not.toHaveBeenCalled();
      expect(bajaPushToken).not.toHaveBeenCalled();
    } finally {
      Device.isDevice = prev;
    }
  });
});
