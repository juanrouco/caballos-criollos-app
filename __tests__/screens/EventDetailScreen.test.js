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

  test('Info: fecha_hasta e inscripciones se rendean como DD/MM/YYYY', async () => {
    fetchEvento.mockResolvedValueOnce(evento({
      id: 50,
      fecha: '2026-04-10',
      fecha_hasta: '2026-04-15',
      fecha_inscripcion_desde: '2026-03-01',
      fecha_inscripcion_hasta: '2026-04-05',
    }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 50 })} />,
    );
    await findByText('Fecha');
    expect(getByText('15/04/2026')).toBeTruthy();
    expect(getByText('01/03/2026')).toBeTruthy();
    expect(getByText('05/04/2026')).toBeTruthy();
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

  test('morfología: Campeonato + Premios + Menciones van en un solo bloque sin sub-header', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 312 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 1, nombre: 'Categ. 17',
          premios: [
            { animal: { id: 'pdre:c', nombre: 'CampeonMacho' },  premio: { nombre: 'Campeón Macho',    tipo_id: 2, tipo_nombre: 'Campeonato' } },
            { animal: { id: 'pdre:r', nombre: 'Reservado' },     premio: { nombre: 'Reservado Campeón', tipo_id: 2, tipo_nombre: 'Campeonato' } },
            { animal: { id: 'pdre:1', nombre: 'PrimerPremio' },  premio: { nombre: '1er Premio',       tipo_id: 3, tipo_nombre: 'Premios' } },
            { animal: { id: 'pdre:m', nombre: 'Mencionado' },    premio: { nombre: 'Mención',          tipo_id: 4, tipo_nombre: 'Menciones' } },
          ],
        }],
      },
    });
    const { findByText, getByText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 312 })} />,
    );
    expect(await findByText('CampeonMacho')).toBeTruthy();
    expect(queryByText('PrimerPremio')).toBeNull();
    fireEvent.press(getByText('Ver 3 puestos más'));
    await waitFor(() => expect(getByText('PrimerPremio')).toBeTruthy());
    expect(getByText('Reservado')).toBeTruthy();
    expect(getByText('Mencionado')).toBeTruthy();
    // No tiene que aparecer ningún sub-header para Campeonato / Premios / Menciones.
    expect(queryByText('Campeonato')).toBeNull();
    expect(queryByText('Premios')).toBeNull();
    expect(queryByText('Menciones')).toBeNull();
  });

  test('morfología: "Sin Premio" sí sale en un sub-grupo aparte con su sub-header', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 313 }));
    fetchEventoCatalogo.mockResolvedValueOnce({ pruebas_funcionales: [], morfologicas: [] });
    fetchEventoResultados.mockResolvedValueOnce({
      morfologia: {
        categorias: [{
          id: 1, nombre: 'Categ. 18',
          premios: [
            { animal: { id: 'pdre:c', nombre: 'CampeonHembra' }, premio: { nombre: 'Campeón Hembra', tipo_id: 2, tipo_nombre: 'Campeonato' } },
            { animal: { id: 'pdre:s1', nombre: 'SinPremio1' },   premio: { nombre: 'Sin Premio',      tipo_id: 5, tipo_nombre: 'Sin Premio' } },
            { animal: { id: 'pdre:s2', nombre: 'SinPremio2' },   premio: { nombre: 'Sin Premio',      tipo_id: 5, tipo_nombre: 'Sin Premio' } },
          ],
        }],
      },
    });
    const { findByText, getByText, queryByText, getAllByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 313 })} />,
    );
    expect(await findByText('CampeonHembra')).toBeTruthy();
    expect(queryByText('Sin Premio')).toBeNull();
    fireEvent.press(getByText('Ver 2 puestos más'));
    await waitFor(() => expect(getByText('SinPremio1')).toBeTruthy());
    expect(getByText('SinPremio2')).toBeTruthy();
    // "Sin Premio" aparece como sub-header + como premio.nombre de cada entry → 3 nodos.
    expect(getAllByText('Sin Premio').length).toBe(3);
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

  test('catálogo: sub-tabs Morfología → Tipo y Aptitud → <funcionales>, auto-pick a la primera con datos', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 6 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [{
        id: 2, nombre: 'Rodeos',
        categorias: [{ id: 1, nombre: 'CatFuncional', animales: [{ id: 'pdre:a', nombre: 'F' }] }],
      }],
      morfologicas: [
        { id: 10, nombre: 'CatMorfo',  tipo_aptitud: false, animales: [{ id: 'pdre:b', nombre: 'M' }] },
        { id: 11, nombre: 'CatTipoAp', tipo_aptitud: true,  animales: [{ id: 'pdre:c', nombre: 'T' }] },
      ],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText, getAllByText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 6 })} />,
    );
    // Auto-pick va a Morfología → solo se ve su categoría.
    await findByText('CatMorfo');
    expect(queryByText('CatTipoAp')).toBeNull();
    expect(queryByText('CatFuncional')).toBeNull();
    // Las 3 sub-tabs (chips) existen en el orden esperado.
    const subtabs = getAllByText(/^(Morfología|Tipo y Aptitud|Rodeos)$/);
    expect(subtabs.map((n) => n.props.children)).toEqual([
      'Morfología', 'Tipo y Aptitud', 'Rodeos',
    ]);
    // Tap a Tipo y Aptitud cambia el contenido visible.
    fireEvent.press(getByText('Tipo y Aptitud'));
    await waitFor(() => expect(getByText('CatTipoAp')).toBeTruthy());
    expect(queryByText('CatMorfo')).toBeNull();
    expect(queryByText('CatFuncional')).toBeNull();
    // Tap a Rodeos.
    fireEvent.press(getByText('Rodeos'));
    await waitFor(() => expect(getByText('CatFuncional')).toBeTruthy());
  });

  test('catálogo morfo: muestra sexo, nac, pelaje, R.P. y S.B.A. del animal', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 30 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [],
      morfologicas: [{
        id: 1, nombre: 'CatMorfo', tipo_aptitud: false,
        animales: [{
          id: 'pdre:1', box: 'A-1', nombre: 'CaballoMorfo',
          sexo: 'M', fecha_nacimiento: '2018-08-10', pelaje: 'Tordillo',
          rp: '12345', sba: '67890',
        }],
      }],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 30 })} />,
    );
    fireEvent.press(await findByText('CatMorfo'));
    await waitFor(() => expect(getByText('CaballoMorfo')).toBeTruthy());
    expect(getByText('M · Nac. 10/08/2018 · Tordillo')).toBeTruthy();
    expect(getByText('S.B.A. 67890 · R.P. 12345')).toBeTruthy();
  });

  test('catálogo de rodeo: lista las yuntas con sus animales y jinetes', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 7 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [{
        id: 2, nombre: 'Rodeos',
        categorias: [{
          id: 312, nombre: 'Categ. 19 - Final Adulta',
          yuntas: [{
            orden: 1,
            animales: [
              { id: 'pdre:1', box: 'A-15', nombre: 'Animal Uno', jinete: { nombre: 'Juan',  apellido: 'Pérez' } },
              { id: 'pdre:2', box: 'A-22', nombre: 'Animal Dos', jinete: { nombre: 'Ana',   apellido: 'García' } },
            ],
          }, {
            orden: 2,
            animales: [
              { id: 'pdre:3', box: 'B-3',  nombre: 'Animal Tres', jinete: { nombre: 'Luis', apellido: 'M.' } },
              { id: 'pdre:4', box: 'B-4',  nombre: 'Animal Cuatro' },
            ],
          }],
        }],
      }],
      morfologicas: [],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 7 })} />,
    );
    // Auto-pick selecciona Catálogo. Header muestra "N yuntas" en lugar de animales.
    const accordion = await findByText('Categ. 19 - Final Adulta');
    expect(getByText('2 yuntas')).toBeTruthy();
    // Yuntas no se ven hasta abrir el acordeón.
    expect(queryByText('Animal Uno')).toBeNull();
    fireEvent.press(accordion);
    await waitFor(() => expect(getByText('Animal Uno')).toBeTruthy());
    expect(getByText('Yunta 1')).toBeTruthy();
    expect(getByText('Yunta 2')).toBeTruthy();
    expect(getByText('Animal Dos')).toBeTruthy();
    expect(getByText('Jinete: Juan Pérez')).toBeTruthy();
    expect(getByText('Jinete: Ana García')).toBeTruthy();
    expect(getByText('Animal Cuatro')).toBeTruthy();
  });

  test('catálogo rodeo: cada animal de la yunta muestra sexo, nac, pelaje, R.P., S.B.A. y jinete', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 31 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [{
        id: 2, nombre: 'Rodeos',
        categorias: [{
          id: 312, nombre: 'Categ. 19 - Final Adulta',
          yuntas: [{
            orden: 1,
            animales: [{
              id: 'pdre:1', box: 'A-15', nombre: 'AnimalRod',
              sexo: 'M', fecha_nacimiento: '2018-08-10', pelaje: 'Tordillo',
              rp: '111', sba: '222',
              jinete: { nombre: 'Juan', apellido: 'Pérez' },
            }],
          }],
        }],
      }],
      morfologicas: [],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, getByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 31 })} />,
    );
    fireEvent.press(await findByText('Categ. 19 - Final Adulta'));
    await waitFor(() => expect(getByText('AnimalRod')).toBeTruthy());
    expect(getByText('M · Nac. 10/08/2018 · Tordillo')).toBeTruthy();
    expect(getByText('S.B.A. 222 · R.P. 111')).toBeTruthy();
    expect(getByText('Jinete: Juan Pérez')).toBeTruthy();
  });

  test('catálogo: categoría con clasificacion CopaEspecial muestra "Copa Especial" en vez del nombre', async () => {
    fetchEvento.mockResolvedValueOnce(evento({ id: 8 }));
    fetchEventoCatalogo.mockResolvedValueOnce({
      pruebas_funcionales: [{
        id: 2, nombre: 'Rodeos',
        categorias: [{
          id: 50, nombre: 'Categ. Solanet 2026', clasificacion: 'CopaEspecial',
          yuntas: [{ orden: 1, animales: [{ id: 'pdre:1', nombre: 'Ganador' }] }],
        }],
      }],
      morfologicas: [],
    });
    fetchEventoResultados.mockResolvedValueOnce({});
    const { findByText, queryByText } = render(
      <EventDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 8 })} />,
    );
    expect(await findByText('Copa Especial')).toBeTruthy();
    expect(queryByText('Categ. Solanet 2026')).toBeNull();
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
