import React from 'react';
import { render } from '@testing-library/react-native';
import ConnectionBanner, { isOffline } from '../src/ConnectionBanner';
const { T } = require('./helpers');
const { useNetInfo } = require('@react-native-community/netinfo');

afterEach(() => {
  // Volver al default "online" para no filtrar estado entre tests.
  useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
});

describe('isOffline', () => {
  test('online (conectado + reachable) → false', () => {
    expect(isOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
  });
  test('sin interfaz de red (isConnected false) → true', () => {
    expect(isOffline({ isConnected: false, isInternetReachable: false })).toBe(true);
  });
  test('conectado pero sin salida (isInternetReachable false) → true', () => {
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
  });
  test('reachability aún desconocida (null) → false (anti-parpadeo)', () => {
    expect(isOffline({ isConnected: true, isInternetReachable: null })).toBe(false);
  });
  test('estado nulo → false', () => {
    expect(isOffline(null)).toBe(false);
  });
});

describe('ConnectionBanner', () => {
  test('online: no renderiza nada', () => {
    useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
    const { queryByText } = render(<ConnectionBanner t={T} />);
    expect(queryByText('Sin conexión a internet')).toBeNull();
  });

  test('offline: muestra el banner "Sin conexión a internet"', () => {
    useNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    const { getByText } = render(<ConnectionBanner t={T} />);
    expect(getByText('Sin conexión a internet')).toBeTruthy();
  });

  test('reachability null: no muestra banner (evita parpadeo en arranque)', () => {
    useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: null });
    const { queryByText } = render(<ConnectionBanner t={T} />);
    expect(queryByText('Sin conexión a internet')).toBeNull();
  });
});
