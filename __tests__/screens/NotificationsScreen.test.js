import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../src/api', () => ({
  fetchNotificaciones: jest.fn(),
  mapNotificacion: jest.requireActual('../../src/api/notificaciones').mapNotificacion,
  isUnreadSince: jest.requireActual('../../src/api/notificaciones').isUnreadSince,
}));
jest.mock('../../src/NotificationsContext', () => {
  // markAllSeen estable entre renders (como el useCallback real), si no el
  // efecto que depende de él se re-ejecuta en loop.
  const value = { markAllSeen: jest.fn().mockResolvedValue(null) };
  return { useNotifications: () => value };
});
jest.mock('../../src/navigation', () => ({
  navigateOnNotificationTap: jest.fn(),
}));

const { fetchNotificaciones } = require('../../src/api');
const { navigateOnNotificationTap } = require('../../src/navigation');
const NotificationsScreen = require('../../src/screens/NotificationsScreen').default;
const { T, navStub } = require('../helpers');

const flushPromises = () => new Promise((res) => process.nextTick(res));

beforeEach(() => {
  fetchNotificaciones.mockReset();
  navigateOnNotificationTap.mockReset();
});

const items = [
  { id: 1, titulo: 'Noti A', tipo: 'noticia', target: { tipo: 'noticia', id: 42, url: null }, fecha: '2026-06-08 10:00:00' },
  { id: 2, titulo: 'Evento B', tipo: 'evento',  target: { tipo: 'evento',  id: 7,  url: null }, fecha: '2026-06-08 11:00:00' },
  { id: 3, titulo: 'Externo C', tipo: 'generico', target: { tipo: null, id: null, url: 'https://x.com/y' }, fecha: '2026-06-08 12:00:00' },
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
