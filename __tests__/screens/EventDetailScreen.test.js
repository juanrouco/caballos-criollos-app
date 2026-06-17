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

  test('auto-pick: con catálogo cargado se abre directo en Catálogo', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 200 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [{
        id: 1, nombre: 'X',
        categorias: [{ id: 2, nombre: 'Cat X', animales: [{ id: 'pdre:1', nombre: 'A' }] }],
      }],
      morfologicas: [],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 200 })} />,
    );
    // Sin tappear, ya tiene que mostrar el contenido del catálogo.
    expect(await findByText('Cat X')).toBeTruthy();
  });

  test('auto-pick: catálogo vacío + resultados con datos abre en Resultados', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 201 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 5, nombre: 'CategMorfo',
          premios: [{ animal: { id: 'pdre:1', nombre: 'Ganador' }, premio: { nombre: '1er' } }],
        }],
      },
    });
    const { findByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 201 })} />,
    );
    // Sin tappear, ya está en Resultados (se ve el accordeón).
    expect(await findByText(/CategMorfo/)).toBeTruthy();
  });

  test('auto-pick: ni catálogo ni resultados → arranca en Info', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 202 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getAllByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 202 })} />,
    );
    // En Info aparece la fila "Fecha" del cuadrito.
    expect(await findByText('Fecha')).toBeTruthy();
    // Y los empty states de Catálogo / Resultados no están visibles (estarían si tappearas).
    expect(getAllByText('Catálogo').length).toBe(1);
  });

  test('resultados con rodeos: la 1° yunta es visible inline sin tap', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 300 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      rodeos: {
        pruebas: [{
          prueba: { id: 2, nombre: 'Rodeos' },
          categoria: { id: 312, nombre: 'Categ. 19 - Final Adulta' },
          clasificacion: 'Final',
          yuntas: [{
            puesto: { general: 1 },
            totales: { dia1: 88, dia2: 86 },
            animales: [
              { id: 'pdre:1', nombre: 'Animal Uno', jinete: { nombre: 'Juan', apellido: 'Pérez' } },
              { id: 'pdre:2', nombre: 'Animal Dos', jinete: { nombre: 'Ana', apellido: 'García' } },
            ],
          }],
        }],
      },
    });
    const { findByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 300 })} />,
    );
    // Auto-pick a Resultados → única sub-tab (Rodeos) → card visible.
    expect(await findByText('Categ. 19 - Final Adulta · Final')).toBeTruthy();
    // 1° yunta inline (sin tap).
    expect(getByText('Animal Uno')).toBeTruthy();
    expect(getByText('Animal Dos')).toBeTruthy();
    expect(getByText('174 pts')).toBeTruthy();
    expect(getByText('Jinete: Juan Pérez')).toBeTruthy();
  });

  test('rodeo CopaEspecial: usa dia1 como total y no muestra fila Día 1 / Día 2', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 301 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      rodeos: {
        pruebas: [{
          prueba: { id: 2, nombre: 'Rodeos' },
          categoria: { id: 50, nombre: 'Copa Solanet' },
          clasificacion: 'CopaEspecial',
          yuntas: [{
            puesto: { general: null },
            totales: { dia1: 92, dia2: null },
            animales: [{ id: 'pdre:1', nombre: 'Ganador Copa', jinete: { nombre: 'Luis', apellido: 'M.' } }],
          }],
        }],
      },
    });
    const { findByText, queryByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 301 })} />,
    );
    // Título "Copa Especial" sin el nombre de categoría + yunta inline.
    expect(await findByText('Copa Especial')).toBeTruthy();
    expect(queryByText('Copa Solanet')).toBeNull();
    expect(getByText('Ganador Copa')).toBeTruthy();
    expect(getByText('92 pts')).toBeTruthy();
    expect(queryByText('Día 1')).toBeNull();
    expect(queryByText('Día 2')).toBeNull();
  });

  test('"Ver N más" expande el resto de los puestos y luego permite ocultar', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 310 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 1, nombre: 'Cat. A',
          premios: [
            { animal: { id: 'pdre:1', nombre: 'Primero' }, premio: { nombre: '1°' } },
            { animal: { id: 'pdre:2', nombre: 'Segundo' }, premio: { nombre: '2°' } },
            { animal: { id: 'pdre:3', nombre: 'Tercero' }, premio: { nombre: '3°' } },
          ],
        }],
      },
    });
    const { findByText, getByText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 310 })} />,
    );
    expect(await findByText('Primero')).toBeTruthy();
    // 2°/3° escondidos hasta tap.
    expect(queryByText('Segundo')).toBeNull();
    expect(queryByText('Tercero')).toBeNull();
    const expandBtn = getByText('Ver 2 puestos más');
    fireEvent.press(expandBtn);
    await waitFor(() => expect(getByText('Segundo')).toBeTruthy());
    expect(getByText('Tercero')).toBeTruthy();
    // Ahora el botón vuelve a "Ocultar".
    fireEvent.press(getByText('Ocultar'));
    await waitFor(() => expect(queryByText('Segundo')).toBeNull());
  });

  test('botón Refrescar re-pide /resultados y actualiza el contenido', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 320 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 1, nombre: 'Cat. única',
          premios: [{ animal: { id: 'pdre:1', nombre: 'Ganador Viejo' }, premio: { nombre: '1°' } }],
        }],
      },
    });
    // Segunda respuesta — la que vuelve al apretar el botón.
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 1, nombre: 'Cat. única',
          premios: [{ animal: { id: 'pdre:2', nombre: 'Ganador Nuevo' }, premio: { nombre: '1°' } }],
        }],
      },
    });
    const { findByText, getByText, getByLabelText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 320 })} />,
    );
    expect(await findByText('Ganador Viejo')).toBeTruthy();
    expect(fetchEventoResultados).toHaveBeenCalledTimes(1);
    fireEvent.press(getByLabelText('Refrescar resultados'));
    expect(fetchEventoResultados).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(getByText('Ganador Nuevo')).toBeTruthy());
    expect(queryByText('Ganador Viejo')).toBeNull();
  });

  test('sub-tabs: cambiar de Morfología a Rodeos cambia el contenido', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 311 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 1, nombre: 'CatMorfo',
          premios: [{ animal: { id: 'pdre:1', nombre: 'GanadorMorfo' }, premio: { nombre: '1°' } }],
        }],
      },
      rodeos: {
        pruebas: [{
          prueba: { id: 2, nombre: 'Rodeos' },
          categoria: { id: 8, nombre: 'CatRodeo' },
          clasificacion: 'Final',
          yuntas: [{
            puesto: { general: 1 },
            totales: { dia1: 50, dia2: 40 },
            animales: [{ id: 'pdre:9', nombre: 'GanadorRodeo' }],
          }],
        }],
      },
    });
    const { findByText, queryByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 311 })} />,
    );
    // Auto-pick: arranca en Morfología → ganador morfo visible, rodeo escondido.
    expect(await findByText('GanadorMorfo')).toBeTruthy();
    expect(queryByText('GanadorRodeo')).toBeNull();
    fireEvent.press(getByText('Rodeos'));
    await waitFor(() => expect(getByText('GanadorRodeo')).toBeTruthy());
    expect(queryByText('GanadorMorfo')).toBeNull();
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
