import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/api', () => ({
  fetchNotificaciones: jest.fn(),
}));

const { fetchNotificaciones } = require('../src/api');
const { NotificationsProvider, useNotifications } = require('../src/NotificationsContext');

function Probe({ borrar }) {
  const { unreadCount, lastSeenAt, markAllSeen, deletedIds, deleteNotifs } = useNotifications();
  return (
    <>
      <Text testID="count">{String(unreadCount)}</Text>
      <Text testID="seen">{lastSeenAt || 'null'}</Text>
      <Text testID="mark" onPress={() => markAllSeen()}>mark</Text>
      <Text testID="deleted">{[...deletedIds].join(',') || 'none'}</Text>
      <Text testID="del" onPress={() => deleteNotifs(borrar)}>del</Text>
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

describe('NotificationsProvider borrado local', () => {
  // La API no tiene borrado de notifs: el borrado vive en el dispositivo
  // (AsyncStorage) y la pantalla filtra por estos ids al listar.
  const renderProbe = (borrar) =>
    render(<NotificationsProvider><Probe borrar={borrar} /></NotificationsProvider>);

  test('deleteNotifs con un id: lo expone en deletedIds y lo persiste', async () => {
    const { getByTestId } = renderProbe(7);
    await waitFor(() => expect(getByTestId('seen').children[0]).not.toBe('null'));
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    expect(getByTestId('deleted').children[0]).toBe('7');
    expect(JSON.parse(await AsyncStorage.getItem('notifs:deletedIds'))).toEqual(['7']);
  });

  test('deleteNotifs con una lista (borrar todas): guarda todos los ids', async () => {
    const { getByTestId } = renderProbe([3, 1, 2]);
    await waitFor(() => expect(getByTestId('seen').children[0]).not.toBe('null'));
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    expect(getByTestId('deleted').children[0]).toBe('3,1,2');
    expect(JSON.parse(await AsyncStorage.getItem('notifs:deletedIds'))).toEqual(['3', '1', '2']);
  });

  test('borrar dos veces el mismo id no lo duplica', async () => {
    await AsyncStorage.setItem('notifs:deletedIds', JSON.stringify(['7', '8']));
    const { getByTestId } = renderProbe(7);
    await waitFor(() => expect(getByTestId('deleted').children[0]).toBe('7,8'));
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    expect(JSON.parse(await AsyncStorage.getItem('notifs:deletedIds'))).toEqual(['8', '7']);
  });

  test('ids vacíos o nulos se ignoran (no se persiste nada)', async () => {
    const { getByTestId } = renderProbe([null, undefined, '']);
    await waitFor(() => expect(getByTestId('seen').children[0]).not.toBe('null'));
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    expect(getByTestId('deleted').children[0]).toBe('none');
    expect(await AsyncStorage.getItem('notifs:deletedIds')).toBeNull();
  });

  test('boot: lee los ids borrados persistidos', async () => {
    await AsyncStorage.setItem('notifs:deletedIds', JSON.stringify([11, 12]));
    const { getByTestId } = renderProbe(1);
    await waitFor(() => expect(getByTestId('deleted').children[0]).toBe('11,12'));
  });

  test('boot: un valor corrupto en storage no rompe nada', async () => {
    await AsyncStorage.setItem('notifs:deletedIds', '{no json');
    const { getByTestId } = renderProbe(5);
    await waitFor(() => expect(getByTestId('seen').children[0]).not.toBe('null'));
    expect(getByTestId('deleted').children[0]).toBe('none');
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    expect(JSON.parse(await AsyncStorage.getItem('notifs:deletedIds'))).toEqual(['5']);
  });

  test('la lista de borrados se topea en 300 y descarta los más viejos', async () => {
    const viejos = Array.from({ length: 300 }, (_, i) => String(i + 1));
    await AsyncStorage.setItem('notifs:deletedIds', JSON.stringify(viejos));
    const { getByTestId } = renderProbe(9001);
    await waitFor(() => expect(getByTestId('deleted').children[0]).toContain('300'));
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    const guardados = JSON.parse(await AsyncStorage.getItem('notifs:deletedIds'));
    expect(guardados).toHaveLength(300);
    expect(guardados[0]).toBe('2');          // se cayó el más viejo
    expect(guardados[299]).toBe('9001');     // y entró el nuevo
  });

  test('borrar no toca el contador: lo borrado ya quedó detrás de lastSeenAt', async () => {
    await AsyncStorage.setItem('notifs:lastSeenAt', '2026-01-01T00:00:00.000Z');
    fetchNotificaciones.mockResolvedValue({ data: [], meta: { total: 4 } });
    const { getByTestId } = renderProbe(7);
    await waitFor(() => expect(getByTestId('count').children[0]).toBe('4'));
    await act(async () => { getByTestId('del').props.onPress(); await flushPromises(); });
    expect(getByTestId('count').children[0]).toBe('4');
    expect(fetchNotificaciones).toHaveBeenCalledTimes(1);
  });
});
