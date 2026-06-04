import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchNoticias: jest.fn(),
  mapNoticia: jest.requireActual('../../src/api/noticias').mapNoticia,
}));
const { fetchNoticias } = require('../../src/api');
const NewsScreen = require('../../src/screens/NewsScreen').default;
const { T, navStub, routeStub, flushPromises } = require('../helpers');

beforeEach(() => { fetchNoticias.mockReset(); });

const noticia = (overrides = {}) => ({
  id: Math.floor(Math.random() * 100000),
  titulo: 'Una noticia',
  fecha: '2026-05-05',
  categoria: { id: 7, nombre: 'Eventos' },
  imagen: { big: 'b', thumb: 't' },
  ...overrides,
});

describe('NewsScreen', () => {
  test('al montar, pide la primera página con PAGE_SIZE=10 y offset=0', async () => {
    fetchNoticias.mockResolvedValueOnce({ data: [noticia({ id: 1, titulo: 'PRIMERA' })] });
    const { findByText } = render(<NewsScreen t={T} navigation={navStub()} route={routeStub()} />);
    await findByText('PRIMERA');
    expect(fetchNoticias).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10, offset: 0,
    }));
  });

  test('si route.params.categoria viene seteado, filtra por categoría y muestra el nombre como título', async () => {
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    const { findByText } = render(
      <NewsScreen t={T} navigation={navStub()}
        route={routeStub({ categoria: 13, categoriaNombre: 'Remates' })} />,
    );
    await findByText(/No hay noticias/);
    expect(fetchNoticias).toHaveBeenCalledWith(expect.objectContaining({ categoria: 13 }));
    expect(findByText('Remates')).toBeTruthy();
  });

  test('lista vacía muestra "No hay noticias"', async () => {
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    const { findByText } = render(<NewsScreen t={T} navigation={navStub()} route={routeStub()} />);
    expect(await findByText(/No hay noticias/)).toBeTruthy();
  });

  test('error inicial muestra mensaje + Reintentar', async () => {
    fetchNoticias.mockRejectedValueOnce(new Error('boom'));
    const { findByText } = render(<NewsScreen t={T} navigation={navStub()} route={routeStub()} />);
    expect(await findByText(/boom/)).toBeTruthy();
    expect(await findByText('Reintentar')).toBeTruthy();
  });

  test('tap en card navega a NewsDetail con id + tag', async () => {
    fetchNoticias.mockResolvedValueOnce({
      data: [noticia({ id: 42, titulo: 'TAP_ME', categoria: { id: 5, nombre: 'Institucional' } })],
    });
    const nav = navStub();
    const { findByText } = render(<NewsScreen t={T} navigation={nav} route={routeStub()} />);
    fireEvent.press(await findByText('TAP_ME'));
    expect(nav.navigate).toHaveBeenCalledWith('NewsDetail', expect.objectContaining({
      id: 42, tag: 'Institucional',
    }));
  });

  test('al ir al final, dispara segunda página con offset = primera.length', async () => {
    // primera página: 10 items (= PAGE_SIZE, así que NO marca reachedEnd)
    const first = Array.from({ length: 10 }, (_, i) => noticia({ id: 100 + i, titulo: `P1-${i}` }));
    const second = [noticia({ id: 200, titulo: 'P2-0' })];
    fetchNoticias.mockResolvedValueOnce({ data: first });
    fetchNoticias.mockResolvedValueOnce({ data: second });
    const { findByText, UNSAFE_getByType } = render(
      <NewsScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    await findByText('P1-0');
    // Simulamos onEndReached pegándole directo a la FlatList
    const flatList = UNSAFE_getByType(require('react-native').FlatList);
    await act(async () => { flatList.props.onEndReached(); await flushPromises(); });
    await waitFor(() => expect(fetchNoticias).toHaveBeenCalledTimes(2));
    expect(fetchNoticias).toHaveBeenNthCalledWith(2, expect.objectContaining({
      offset: 10, limit: 10,
    }));
  });
});
