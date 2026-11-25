import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchEventos: jest.fn(),
  fetchEventoCategorias: jest.fn(),
  mapEvent: jest.requireActual('../../src/api/eventos').mapEvent,
  fetchNoticias: jest.fn(),
  mapNoticia: jest.requireActual('../../src/api/noticias').mapNoticia,
  todayISO: () => '2026-06-04',
  fetchVivos: jest.fn(),
}));
const { fetchEventos, fetchEventoCategorias, fetchNoticias, fetchVivos } = require('../../src/api');
const { LiveProvider } = require('../../src/LiveContext');
const EventsScreen = require('../../src/screens/EventsScreen').default;
const { T, navStub, flushPromises } = require('../helpers');

beforeEach(() => {
  fetchEventos.mockReset();
  // Por defecto el catálogo no agrega nada: cada test que lo necesite lo dice.
  fetchEventoCategorias.mockReset();
  fetchEventoCategorias.mockResolvedValue({ data: [] });
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

// Hoy, según el mock de todayISO, es el 2026-06-04.
describe('EventsScreen - filtros de mes y actividad', () => {
  const unaPagina = (cats = [{ id: 7, nombre: 'Aparte Campero' }]) =>
    ({ data: [ev({ id: 1, titulo: 'PRIMERO', categorias: cats })] });

  const abrirMeses = async (utils) => {
    await act(async () => { fireEvent.press(utils.getByLabelText('Elegir mes')); await flushPromises(); });
  };
  const elegirMes = async (utils, etiqueta) => {
    await act(async () => { fireEvent.press(utils.getByLabelText(etiqueta)); await flushPromises(); });
  };
  const ultimaLlamada = () => fetchEventos.mock.calls[fetchEventos.mock.calls.length - 1][0];

  test('arranca sin mes elegido y lo dice', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    expect(await utils.findByLabelText('Elegir mes')).toBeTruthy();
    expect(utils.getByText('Todos los meses')).toBeTruthy();
  });

  test('elegir un mes futuro pide ese rango completo', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Elegir mes');
    await abrirMeses(utils);
    await elegirMes(utils, 'Mes Jul 2026');
    expect(ultimaLlamada()).toEqual(expect.objectContaining({
      fecha_desde: '2026-07-01', fecha_hasta: '2026-07-31', sort: 'fecha_asc', offset: 0,
    }));
  });

  test('el mes en curso no pide desde antes de hoy', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Elegir mes');
    await abrirMeses(utils);
    await elegirMes(utils, 'Mes Jun 2026');
    expect(ultimaLlamada()).toEqual(expect.objectContaining({
      fecha_desde: '2026-06-04', fecha_hasta: '2026-06-30',
    }));
  });

  test('en Próximos los meses que ya pasaron están apagados', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Elegir mes');
    await abrirMeses(utils);
    expect(utils.getByLabelText('Mes May 2026').props.accessibilityState.disabled).toBe(true);
    expect(utils.getByLabelText('Mes Jun 2026').props.accessibilityState.disabled).toBe(false);
    const antes = fetchEventos.mock.calls.length;
    fireEvent.press(utils.getByLabelText('Mes May 2026'));
    expect(fetchEventos.mock.calls.length).toBe(antes);   // un mes apagado no pide nada
  });

  test('las flechas mueven el año y se puede elegir uno siguiente', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Elegir mes');
    await abrirMeses(utils);
    await act(async () => { fireEvent.press(utils.getByLabelText('Año siguiente')); await flushPromises(); });
    await elegirMes(utils, 'Mes Ene 2027');
    expect(ultimaLlamada()).toEqual(expect.objectContaining({
      fecha_desde: '2027-01-01', fecha_hasta: '2027-01-31',
    }));
  });

  test('se puede volver a todos los meses', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Elegir mes');
    await abrirMeses(utils);
    await elegirMes(utils, 'Mes Jul 2026');
    await abrirMeses(utils);
    await elegirMes(utils, 'Todos los meses');
    expect(ultimaLlamada().fecha_hasta).toBeUndefined();
    expect(ultimaLlamada().fecha_desde).toBe('2026-06-04');
  });

  test('en Pasados el rango se corta en hoy', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByText('PRIMERO');
    await act(async () => { fireEvent.press(utils.getByText('Pasados')); await flushPromises(); });
    await abrirMeses(utils);
    await elegirMes(utils, 'Mes Jun 2026');
    expect(ultimaLlamada()).toEqual(expect.objectContaining({
      fecha_desde: '2026-06-01', fecha_hasta: '2026-06-04',
    }));
  });

  test('el catálogo trae actividades que los eventos cargados no tienen', async () => {
    fetchEventos.mockResolvedValue(unaPagina([{ id: 7, nombre: 'Aparte Campero' }]));
    fetchEventoCategorias.mockResolvedValue({ data: [
      { id: 7, nombre: 'Aparte Campero' }, { id: 3, nombre: 'Morfología' }, { id: 9, nombre: 'Rienda' },
    ] });
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    // Rienda no está en ningún evento de la página y el selector igual la ofrece.
    expect(await utils.findByLabelText('Actividad: Rienda')).toBeTruthy();
    expect(utils.getByLabelText('Actividad: Morfología')).toBeTruthy();
    await act(async () => { fireEvent.press(utils.getByLabelText('Actividad: Rienda')); await flushPromises(); });
    expect(ultimaLlamada()).toEqual(expect.objectContaining({ id_categorias: '9' }));
  });

  test('el catálogo se pide con la fecha del eje, no con la del mes elegido', async () => {
    fetchEventos.mockResolvedValue(unaPagina());
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Elegir mes');
    expect(fetchEventoCategorias).toHaveBeenLastCalledWith({ fecha_desde: '2026-06-04' });
    await abrirMeses(utils);
    await elegirMes(utils, 'Mes Jul 2026');
    // Moverse de mes no vuelve a pedirlo: la lista de opciones no se achica.
    expect(fetchEventoCategorias).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.press(utils.getByText('Pasados')); await flushPromises(); });
    expect(fetchEventoCategorias).toHaveBeenLastCalledWith({ fecha_hasta: '2026-06-04' });
  });

  test('si el catálogo falla, el selector sigue con lo que traen los eventos', async () => {
    fetchEventos.mockResolvedValue(unaPagina([{ id: 3, nombre: 'Morfología' }]));
    fetchEventoCategorias.mockRejectedValue(new Error('404'));
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    expect(await utils.findByLabelText('Actividad: Morfología')).toBeTruthy();
  });

  test('la actividad sale de lo cargado y viaja como id_categorias', async () => {
    fetchEventos.mockResolvedValue(unaPagina([
      { id: 7, nombre: 'Aparte Campero' }, { id: 3, nombre: 'Morfología' },
    ]));
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    expect(await utils.findByLabelText('Actividad: Morfología')).toBeTruthy();
    expect(utils.getByLabelText('Actividad: Aparte Campero')).toBeTruthy();
    await act(async () => { fireEvent.press(utils.getByLabelText('Actividad: Morfología')); await flushPromises(); });
    expect(ultimaLlamada()).toEqual(expect.objectContaining({ id_categorias: '3' }));
  });

  test('la actividad elegida no borra del selector a las demás', async () => {
    fetchEventos.mockResolvedValueOnce(unaPagina([
      { id: 7, nombre: 'Aparte Campero' }, { id: 3, nombre: 'Morfología' },
    ]));
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Actividad: Morfología');
    // La respuesta filtrada ya no trae Aparte Campero, pero el chip sigue.
    fetchEventos.mockResolvedValueOnce(unaPagina([{ id: 3, nombre: 'Morfología' }]));
    await act(async () => { fireEvent.press(utils.getByLabelText('Actividad: Morfología')); await flushPromises(); });
    expect(utils.getByLabelText('Actividad: Aparte Campero')).toBeTruthy();
  });

  test('sin resultados, el vacío nombra el mes y la actividad', async () => {
    fetchEventos.mockResolvedValueOnce(unaPagina([{ id: 3, nombre: 'Morfología' }]));
    const utils = render(wrap(<EventsScreen t={T} navigation={navStub()} />));
    await utils.findByLabelText('Actividad: Morfología');
    fetchEventos.mockResolvedValue({ data: [] });
    await act(async () => { fireEvent.press(utils.getByLabelText('Actividad: Morfología')); await flushPromises(); });
    await abrirMeses(utils);
    await elegirMes(utils, 'Mes Jul 2026');
    expect(await utils.findByText('No hay eventos próximos de Morfología en julio de 2026.')).toBeTruthy();
  });
});
