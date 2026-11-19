import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';

jest.mock('../../src/api', () => ({
  fetchNotificaciones: jest.fn(),
  mapNotificacion: jest.requireActual('../../src/api/notificaciones').mapNotificacion,
  isUnreadSince: jest.requireActual('../../src/api/notificaciones').isUnreadSince,
}));
jest.mock('../../src/NotificationsContext', () => {
  // markAllSeen y deleteNotifs estables entre renders (como los useCallback
  // reales), si no el efecto que depende de markAllSeen se re-ejecuta en loop.
  // El borrado local vive en el contexto, así que el doble lo imita: guarda
  // los ids y avisa a los suscriptores para que la pantalla re-renderice.
  const React = require('react');
  const store = { deleted: new Set(), listeners: new Set() };
  const markAllSeen = jest.fn().mockResolvedValue(null);
  const deleteNotifs = jest.fn((ids) => {
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => store.deleted.add(String(id)));
    store.listeners.forEach((set) => set(new Set(store.deleted)));
  });
  return {
    __store: store,
    __mocks: { markAllSeen, deleteNotifs },
    useNotifications: () => {
      const [deletedIds, setDeletedIds] = React.useState(() => new Set(store.deleted));
      React.useEffect(() => {
        store.listeners.add(setDeletedIds);
        return () => { store.listeners.delete(setDeletedIds); };
      }, []);
      return { markAllSeen, deletedIds, deleteNotifs };
    },
  };
});
jest.mock('../../src/navigation', () => ({
  navigateOnNotificationTap: jest.fn(),
}));

const { fetchNotificaciones } = require('../../src/api');
const { navigateOnNotificationTap } = require('../../src/navigation');
const { __store: notifStore, __mocks: notifMocks } = require('../../src/NotificationsContext');
const NotificationsScreen = require('../../src/screens/NotificationsScreen').default;
const { decidirGesto } = require('../../src/screens/NotificationsScreen');
const { T, navStub } = require('../helpers');

const flushPromises = () => new Promise((res) => process.nextTick(res));

beforeEach(() => {
  fetchNotificaciones.mockReset();
  navigateOnNotificationTap.mockReset();
  notifStore.deleted.clear();
  notifMocks.deleteNotifs.mockClear();
});

const items = [
  { id: 1, titulo: 'Noti A', tipo: 'noticia', target: { tipo: 'noticia', id: 42, url: null }, fecha: '2026-06-08 10:00:00' },
  { id: 2, titulo: 'Evento B', tipo: 'evento',  target: { tipo: 'evento',  id: 7,  url: null }, fecha: '2026-06-08 11:00:00' },
  { id: 3, titulo: 'Externo C', tipo: 'generico', target: { tipo: null, id: null, url: 'https://x.com/y' }, fecha: '2026-06-08 12:00:00' },
  { id: 4, titulo: 'Sin target D', tipo: 'generico', target: null, fecha: '2026-06-08 13:00:00' },
];

async function renderList(nav) {
  fetchNotificaciones.mockResolvedValue({ data: items });
  const utils = render(<NotificationsScreen t={T} navigation={nav} />);
  await act(async () => { await flushPromises(); await flushPromises(); });
  return utils;
}

describe('NotificationsScreen onItemPress', () => {
  test('noticia: pushea NewsDetail en el stack local (back vuelve a la lista)', async () => {
    const nav = navStub();
    const { getByText } = await renderList(nav);
    fireEvent.press(getByText('Noti A'));
    expect(nav.navigate).toHaveBeenCalledWith('NewsDetail', { id: 42 });
    expect(navigateOnNotificationTap).not.toHaveBeenCalled();
  });

  test('evento: delega en el deep-link (resetea EventosTab)', async () => {
    const nav = navStub();
    const { getByText } = await renderList(nav);
    fireEvent.press(getByText('Evento B'));
    expect(navigateOnNotificationTap).toHaveBeenCalledWith({ kind: 'evento', id: 7, evento_id: 7 });
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('target con url externa abre el browser', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const nav = navStub();
    const { getByText } = await renderList(nav);
    fireEvent.press(getByText('Externo C'));
    expect(spy).toHaveBeenCalledWith('https://x.com/y');
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(navigateOnNotificationTap).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('NotificationsScreen borrado', () => {
  test('borrar una: sale de la lista y el id va al borrado local', async () => {
    const { getByLabelText, queryByText, getByText } = await renderList(navStub());
    await act(async () => { fireEvent.press(getByLabelText('Borrar notificación: Evento B')); });
    expect(notifMocks.deleteNotifs).toHaveBeenCalledWith(2);
    expect(queryByText('Evento B')).toBeNull();
    // las otras siguen
    expect(getByText('Noti A')).toBeTruthy();
    expect(getByText('Externo C')).toBeTruthy();
  });

  test('tocar «Borrar» no dispara la navegación del item', async () => {
    const nav = navStub();
    const { getByLabelText } = await renderList(nav);
    await act(async () => { fireEvent.press(getByLabelText('Borrar notificación: Noti A')); });
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(navigateOnNotificationTap).not.toHaveBeenCalled();
  });

  test('borrar todas: confirma, vacía la lista y muestra el estado vacío', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByLabelText, getByText, queryByText, queryByLabelText } = await renderList(navStub());

    fireEvent.press(getByLabelText('Borrar todas'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('Borrar todas');
    // mientras no se confirme, nada se borra
    expect(notifMocks.deleteNotifs).not.toHaveBeenCalled();
    expect(getByText('Noti A')).toBeTruthy();

    const botones = spy.mock.calls[0][2];
    const confirmar = botones.find((b) => b.text === 'Borrar');
    await act(async () => { confirmar.onPress(); });

    expect(notifMocks.deleteNotifs).toHaveBeenCalledWith([1, 2, 3, 4]);
    expect(queryByText('Noti A')).toBeNull();
    expect(queryByText('Evento B')).toBeNull();
    expect(queryByText('Externo C')).toBeNull();
    expect(queryByText('Sin target D')).toBeNull();
    expect(getByText('No hay notificaciones.')).toBeTruthy();
    // sin items, el botón de vaciar no tiene qué borrar
    expect(queryByLabelText('Borrar todas')).toBeNull();
    spy.mockRestore();
  });

  test('borrar todas: cancelar no borra nada', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByLabelText, getByText } = await renderList(navStub());
    fireEvent.press(getByLabelText('Borrar todas'));
    const cancelar = spy.mock.calls[0][2].find((b) => b.text === 'Cancelar');
    expect(cancelar.style).toBe('cancel');
    expect(cancelar.onPress).toBeUndefined();
    expect(notifMocks.deleteNotifs).not.toHaveBeenCalled();
    expect(getByText('Noti A')).toBeTruthy();
    spy.mockRestore();
  });

  test('una notif sin target (item deshabilitado) también se puede borrar', async () => {
    const { getByLabelText, queryByText } = await renderList(navStub());
    await act(async () => { fireEvent.press(getByLabelText('Borrar notificación: Sin target D')); });
    expect(notifMocks.deleteNotifs).toHaveBeenCalledWith(4);
    expect(queryByText('Sin target D')).toBeNull();
  });

  test('lo borrado antes no se lista aunque la API lo siga devolviendo', async () => {
    notifStore.deleted.add('1');
    notifStore.deleted.add('3');
    const { queryByText, getByText } = await renderList(navStub());
    expect(queryByText('Noti A')).toBeNull();
    expect(queryByText('Externo C')).toBeNull();
    expect(getByText('Evento B')).toBeTruthy();
  });

  test('si la API devuelve sólo notifs ya borradas, la lista queda en su estado vacío', async () => {
    notifStore.deleted.add('1');
    notifStore.deleted.add('2');
    notifStore.deleted.add('3');
    notifStore.deleted.add('4');
    const { getByText, queryByLabelText } = await renderList(navStub());
    expect(getByText('No hay notificaciones.')).toBeTruthy();
    expect(queryByLabelText('Borrar todas')).toBeNull();
  });
});

describe('NotificationsScreen gesto de deslizar', () => {
  test('un tirón largo borra sin pasar por el botón', () => {
    expect(decidirGesto(-240)).toBe('borrar');
    expect(decidirGesto(-200)).toBe('borrar');
  });

  test('un deslizamiento corto deja la fila abierta', () => {
    expect(decidirGesto(-96)).toBe('abrir');
    expect(decidirGesto(-44)).toBe('abrir');
  });

  test('un roce no abre nada: la fila vuelve a su lugar', () => {
    expect(decidirGesto(-43)).toBe('cerrar');
    expect(decidirGesto(0)).toBe('cerrar');
  });

  test('el botón «Borrar» está montado aunque la fila esté cerrada (VoiceOver no desliza)', async () => {
    const { getByLabelText } = await renderList(navStub());
    expect(getByLabelText('Borrar notificación: Noti A')).toBeTruthy();
  });
});
