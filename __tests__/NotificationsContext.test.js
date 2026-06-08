import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/api', () => ({
  fetchNotificaciones: jest.fn(),
}));

const { fetchNotificaciones } = require('../src/api');
const { NotificationsProvider, useNotifications } = require('../src/NotificationsContext');

function Probe() {
  const { unreadCount, lastSeenAt, markAllSeen } = useNotifications();
  return (
    <>
      <Text testID="count">{String(unreadCount)}</Text>
      <Text testID="seen">{lastSeenAt || 'null'}</Text>
      <Text testID="mark" onPress={() => markAllSeen()}>mark</Text>
    </>
  );
}

const flushPromises = () => new Promise((res) => process.nextTick(res));

beforeEach(async () => {
  fetchNotificaciones.mockReset();
  fetchNotificaciones.mockResolvedValue({ data: [], meta: { total: 0 } });
  await AsyncStorage.clear();
});

describe('NotificationsProvider', () => {
  test('primer boot: si no hay lastSeenAt, lo seedea con now y lo persiste', async () => {
    const { getByTestId } = render(<NotificationsProvider><Probe /></NotificationsProvider>);
    await waitFor(() => expect(getByTestId('seen').children[0]).not.toBe('null'));
    const seeded = getByTestId('seen').children[0];
    expect(seeded).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await AsyncStorage.getItem('notifs:lastSeenAt')).toBe(seeded);
  });

  test('boot subsiguiente: reusa el lastSeenAt persistido', async () => {
    await AsyncStorage.setItem('notifs:lastSeenAt', '2026-01-01T10:00:00.000Z');
    const { getByTestId } = render(<NotificationsProvider><Probe /></NotificationsProvider>);
    await waitFor(() => expect(getByTestId('seen').children[0]).toBe('2026-01-01T10:00:00.000Z'));
    // y no debe sobrescribirlo
    expect(await AsyncStorage.getItem('notifs:lastSeenAt')).toBe('2026-01-01T10:00:00.000Z');
  });

  test('refresh inicial: llama fetchNotificaciones con since=lastSeenAt formateado y limit=1', async () => {
    await AsyncStorage.setItem('notifs:lastSeenAt', '2026-01-02T03:04:05.000Z');
    fetchNotificaciones.mockResolvedValueOnce({ data: [], meta: { total: 7 } });
    const { getByTestId } = render(<NotificationsProvider><Probe /></NotificationsProvider>);
    await waitFor(() => expect(getByTestId('count').children[0]).toBe('7'));
    expect(fetchNotificaciones).toHaveBeenCalledTimes(1);
    const args = fetchNotificaciones.mock.calls[0][0];
    expect(args.limit).toBe(1);
    // El backend espera "YYYY-MM-DD HH:MM:SS" en hora local del device.
    expect(args.since).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  test('si el fetch falla, mantiene el último unreadCount conocido', async () => {
    fetchNotificaciones
      .mockResolvedValueOnce({ data: [], meta: { total: 3 } })
      .mockRejectedValueOnce(new Error('boom'));
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      const { getByTestId } = render(<NotificationsProvider><Probe /></NotificationsProvider>);
      await waitFor(() => expect(getByTestId('count').children[0]).toBe('3'));
      await act(async () => { jest.advanceTimersByTime(30_000); await flushPromises(); });
      expect(fetchNotificaciones).toHaveBeenCalledTimes(2);
      expect(getByTestId('count').children[0]).toBe('3');
    } finally {
      jest.useRealTimers();
    }
  });

  test('polling cada 30s', async () => {
    fetchNotificaciones.mockResolvedValue({ data: [], meta: { total: 1 } });
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      render(<NotificationsProvider><Probe /></NotificationsProvider>);
      await act(async () => { await flushPromises(); });
      expect(fetchNotificaciones).toHaveBeenCalledTimes(1);
      await act(async () => { jest.advanceTimersByTime(30_000); await flushPromises(); });
      expect(fetchNotificaciones).toHaveBeenCalledTimes(2);
      await act(async () => { jest.advanceTimersByTime(30_000); await flushPromises(); });
      expect(fetchNotificaciones).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  test('markAllSeen: persiste now, baja unreadCount a 0 y el próximo refresh usa el nuevo since', async () => {
    await AsyncStorage.setItem('notifs:lastSeenAt', '2026-01-01T00:00:00.000Z');
    fetchNotificaciones
      .mockResolvedValueOnce({ data: [], meta: { total: 5 } })   // boot
      .mockResolvedValueOnce({ data: [], meta: { total: 0 } });  // refresh post-markAllSeen (si lo hubiera)
    const { getByTestId } = render(<NotificationsProvider><Probe /></NotificationsProvider>);
    await waitFor(() => expect(getByTestId('count').children[0]).toBe('5'));
    await act(async () => {
      getByTestId('mark').props.onPress();
      await flushPromises();
    });
    expect(getByTestId('count').children[0]).toBe('0');
    const persisted = await AsyncStorage.getItem('notifs:lastSeenAt');
    expect(persisted).not.toBe('2026-01-01T00:00:00.000Z');
    expect(persisted).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('markAllSeen devuelve el lastSeenAt previo (snapshot para destacar "nuevas")', async () => {
    await AsyncStorage.setItem('notifs:lastSeenAt', '2026-01-01T00:00:00.000Z');
    const captured = [];
    function Capturer() {
      const { lastSeenAt, markAllSeen } = useNotifications();
      return (
        <Text
          testID="cap"
          onPress={async () => {
            const prev = await markAllSeen();
            captured.push(prev);
          }}
        >
          {lastSeenAt || 'null'}
        </Text>
      );
    }
    const { getByTestId } = render(<NotificationsProvider><Capturer /></NotificationsProvider>);
    await waitFor(() => expect(getByTestId('cap').children[0]).toBe('2026-01-01T00:00:00.000Z'));
    await act(async () => {
      getByTestId('cap').props.onPress();
      await flushPromises();
    });
    expect(captured).toEqual(['2026-01-01T00:00:00.000Z']);
  });
});
