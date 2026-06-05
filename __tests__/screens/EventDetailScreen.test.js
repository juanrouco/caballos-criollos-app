import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/api', () => {
  const actual = jest.requireActual('../../src/api/eventos');
  return {
    fetchEvento:           jest.fn(),
    fetchEventoCatalogo:   jest.fn(),
    fetchEventoResultados: jest.fn(),
    isEmptyCatalog:        actual.isEmptyCatalog,
    isEmptyResults:        actual.isEmptyResults,
    mapEvent:              actual.mapEvent,
  };
});
const {
  fetchEvento, fetchEventoCatalogo, fetchEventoResultados,
} = require('../../src/api');
const EventDetailScreen = require('../../src/screens/EventDetailScreen').default;
const { T, navStub, routeStub } = require('../helpers');

beforeEach(() => {
  fetchEvento.mockReset();
  fetchEventoCatalogo.mockReset();
  fetchEventoResultados.mockReset();
});

const evento = (overrides = {}) => ({
  id: Math.floor(Math.random() * 100000),
  titulo: 'Expo Nacional',
  fecha: '2026-04-10',
  fecha_hasta: '2026-04-15',
  suspendido: false,
  provincia: { id: 5, nombre: 'Buenos Aires' },
  localidad: 'Palermo',
  direccion: 'Av. Sarmiento 2704',
  categorias: [{ id: 7, nombre: 'Exposición Nacional' }],
  vivo_actual: null,
  ...overrides,
});

describe('EventDetailScreen', () => {
  test('sin id muestra error', async () => {
    const { findByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({})} />,
    );
    expect(await findByText(/Falta el id del evento/)).toBeTruthy();
  });

  test('renderea hero + categorías como chips + tab Info por default', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 1 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({ morfologia: null, tipo_aptitud: null });
    const { findByText, getAllByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 1 })} />,
    );
    expect(await findByText('Expo Nacional')).toBeTruthy();
    // "Exposición Nacional" aparece dos veces (chip + fila "Categorías" en Info).
    expect(getAllByText('Exposición Nacional').length).toBeGreaterThanOrEqual(1);
    expect(await findByText('10 de Abril, 2026')).toBeTruthy();
  });

  test('cap a 3 chips + chip "+N" cuando hay más categorías', async () => {
    fetchEvento.mockResolvedValueOnce(evento({
      categorias: [
        { id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }, { id: 3, nombre: 'C' },
        { id: 4, nombre: 'D' }, { id: 5, nombre: 'E' },
      ],
    }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 2 })} />,
    );
    await findByText('A');
    expect(queryByText('B')).toBeTruthy();
    expect(queryByText('C')).toBeTruthy();
    expect(queryByText('D')).toBeNull();
    expect(queryByText('+2')).toBeTruthy();
  });

  test('error al cargar el evento muestra mensaje + Volver', async () => {
    fetchEvento.mockRejectedValueOnce(new Error('500'));
    fetchEventoCatalogo.mockResolvedValueOnce({});
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 3 })} />,
    );
    expect(await findByText('Volver')).toBeTruthy();
  });

  test('switch a la tab Catálogo muestra el empty state cuando viene vacío', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 4 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 4 })} />,
    );
    await findByText('Expo Nacional');
    fireEvent.press(getByText('Catálogo'));
    await waitFor(() => expect(getByText('Sin catálogo')).toBeTruthy());
  });

  test('vivo con link_pagina (sin link_youtube) muestra botón que abre en el browser', async () => {
    const { Linking } = require('react-native');
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    fetchEvento.mockResolvedValueOnce(evento({
      id: 99,
      vivo_actual: {
        id: 1, titulo: 'Aparte vacuno',
        link_pagina: 'https://transmision.example.com/expo',
        link_youtube: '',
        estado: 'en_vivo',
      },
    }));
    fetchEventoCatalogo.mockResolvedValueOnce({});
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, queryByLabelText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 99 })} />,
    );
    const btn = await findByText('Ver transmisión en vivo');
    // No debe renderearse el player de YouTube en este caso.
    expect(queryByLabelText('YoutubePlayer')).toBeNull();
    fireEvent.press(btn);
    expect(openSpy).toHaveBeenCalledWith('https://transmision.example.com/expo');
    openSpy.mockRestore();
  });

  test('vivo con link_youtube rendera el player y NO el botón de página', async () => {
    fetchEvento.mockResolvedValueOnce(evento({
      id: 100,
      vivo_actual: {
        id: 1, titulo: 'X',
        link_youtube: 'https://youtube.com/watch?v=abc123',
        link_pagina: 'https://example.com/page',
        estado: 'en_vivo',
      },
    }));
    fetchEventoCatalogo.mockResolvedValueOnce({});
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByLabelText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 100 })} />,
    );
    expect(await findByLabelText('YoutubePlayer')).toBeTruthy();
    expect(queryByText('Ver transmisión en vivo')).toBeNull();
  });

  test('catálogo con animales renderea acordeón + nombre de la categoría', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 5 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [{
        id: 12, nombre: 'Aparte',
        categorias: [{
          id: 95, nombre: 'Cat. 17',
          animales: [{ id: 'pdre:1', nombre: 'X', box: 'A-1' }],
        }],
      }],
      morfologicas: [],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 5 })} />,
    );
    await findByText('Expo Nacional');
    fireEvent.press(getByText('Catálogo'));
    await waitFor(() => expect(getByText('Cat. 17')).toBeTruthy());
  });
});
