import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchEventos: jest.fn(),
  mapEvent: jest.requireActual('../../src/api/eventos').mapEvent,
  fetchNoticias: jest.fn(),
  mapNoticia: jest.requireActual('../../src/api/noticias').mapNoticia,
  todayISO: () => '2026-06-04',
  fetchVivos: jest.fn(),
}));
const { fetchEventos, fetchNoticias, fetchVivos } = require('../../src/api');
const { LiveProvider } = require('../../src/LiveContext');
const EventsScreen = require('../../src/screens/EventsScreen').default;
const { T, navStub, flushPromises } = require('../helpers');

beforeEach(() => {
  fetchEventos.mockReset();
  fetchNoticias.mockReset();
  fetchVivos.mockReset();
  fetchVivos.mockResolvedValue({ data: [] });
});

const wrap = (ui) => <LiveProvider>{ui}</LiveProvider>;
const ev = (overrides = {}) => ({
  id: Math.floor(Math.random() * 100000),
  titulo: 'Evento',
  fecha: '2026-06-10',
  provincia: { id: 5, nombre: 'BA' },
  localidad: 'Palermo',
  categorias: [{ id: 7, nombre: 'Aparte Campero' }],
  suspendido: false,
  ...overrides,
});

describe('EventsScreen - Próximos', () => {
  test('al montar, pide /eventos con fecha_desde + sort_asc + paginación', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [ev({ id: 1, titulo: 'PRIMERO' })] });
    const { findByText } = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    expect(await findByText('PRIMERO')).toBeTruthy();
    expect(fetchEventos).toHaveBeenCalledWith(expect.objectContaining({
      fecha_desde: '2026-06-04', sort: 'fecha_asc', limit: 20, offset: 0,
    }));
  });

  test('paginación: onEndReached fetchea con offset = items.length', async () => {
    const first = Array.from({ length: 20 }, (_, i) => ev({ id: 100 + i, titulo: `P1-${i}` }));
    fetchEventos.mockResolvedValueOnce({ data: first });
    fetchEventos.mockResolvedValueOnce({ data: [ev({ id: 200, titulo: 'P2-0' })] });
    const { findByText, UNSAFE_getAllByType } = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await findByText('P1-0');
    // Hay dos FlatLists en pantalla — header (View) + EventsList. Tomamos la que tiene data.
    const flatLists = UNSAFE_getAllByType(require('react-native').FlatList);
    const target = flatLists.find((fl) => (fl.props.data || []).length > 0);
    await act(async () => { target.props.onEndReached(); await flushPromises(); });
    await waitFor(() => expect(fetchEventos).toHaveBeenCalledTimes(2));
    expect(fetchEventos).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 20 }));
  });

  test('tap en una card navega a EventDetail con el id', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [ev({ id: 77, titulo: 'TAP_ME' })] });
    const nav = navStub();
    const { findByText } = render(wrap(<EventsScreen t={T} navigation={nav} />));
    fireEvent.press(await findByText('TAP_ME'));
    expect(nav.navigate).toHaveBeenCalledWith('EventDetail', { id: 77 });
  });
});

describe('EventsScreen - Pasados', () => {
  test('al cambiar de filtro, pide /eventos con fecha_hasta', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] }); // próximos inicial
    const { findByText, getByText } = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await findByText(/No hay eventos próximos/);
    fetchEventos.mockResolvedValueOnce({ data: [ev({ id: 1, titulo: 'PASADO 1' })] });
    fireEvent.press(getByText('Pasados'));
    await findByText('PASADO 1');
    expect(fetchEventos).toHaveBeenLastCalledWith(expect.objectContaining({
      fecha_hasta: '2026-06-04', limit: 20, offset: 0,
    }));
  });
});

describe('EventsScreen - Remates', () => {
  test('cambiar a la pestaña Remates dispara /noticias?categoria=13 con fecha_desc + limit=12', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] }); // próximos inicial vacío
    const { getByText, findByText } = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await findByText(/No hay eventos próximos/);
    fetchNoticias.mockResolvedValueOnce({
      data: [{
        id: 1, titulo: 'REMATE 1', fecha: '2026-07-01',
        categoria: { id: 13, nombre: 'Remates' },
      }],
    });
    fireEvent.press(getByText('Remates'));
    await findByText('REMATE 1');
    expect(fetchNoticias).toHaveBeenCalledWith(expect.objectContaining({
      categoria: 13, sort: 'fecha_desc', limit: 12, offset: 0,
    }));
  });

  test('tap en un remate navega a NewsDetail con id + tag', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    const nav = navStub();
    const { getByText, findByText } = render(wrap(<EventsScreen t={T} navigation={nav} />));
    await findByText(/No hay eventos próximos/);
    fetchNoticias.mockResolvedValueOnce({
      data: [{
        id: 42, titulo: 'REMATE 42', fecha: '2026-07-01',
        categoria: { id: 13, nombre: 'Remates' },
      }],
    });
    fireEvent.press(getByText('Remates'));
    fireEvent.press(await findByText('REMATE 42'));
    expect(nav.navigate).toHaveBeenCalledWith('NewsDetail', expect.objectContaining({
      id: 42, tag: 'Remates',
    }));
  });

  test('error de remates muestra Reintentar', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    const { getByText, findByText } = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await findByText(/No hay eventos próximos/);
    fetchNoticias.mockRejectedValueOnce(new Error('boom'));
    fireEvent.press(getByText('Remates'));
    expect(await findByText(/No se pudieron cargar los remates/)).toBeTruthy();
  });
});
