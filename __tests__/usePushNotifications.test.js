import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../src/api', () => ({
  registerPushToken: jest.fn(),
}));
jest.mock('../src/navigation', () => ({
  navigationRef: { isReady: () => true, dispatch: jest.fn(), getState: () => ({ routes: [] }) },
  navigateOnNotificationTap: jest.fn(),
}));

const Notifications = require('expo-notifications');
const Application = require('expo-application');
const Constants = require('expo-constants').default;
const { registerPushToken } = require('../src/api');
const { navigateOnNotificationTap } = require('../src/navigation');
const { usePushNotifications } = require('../src/usePushNotifications');

function Probe() {
  usePushNotifications();
  return <Text>ok</Text>;
}

const flushPromises = () => new Promise((res) => process.nextTick(res));

beforeEach(() => {
  Notifications.requestPermissionsAsync.mockReset();
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
  navigateOnNotificationTap.mockReset();
});

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

  test('si el usuario rechaza el permiso, no pide token ni registra', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<Probe />);
    await act(async () => { await flushPromises(); await flushPromises(); });
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(registerPushToken).not.toHaveBeenCalled();
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
});
