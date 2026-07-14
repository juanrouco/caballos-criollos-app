import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../src/api', () => ({
  fetchRanking: jest.fn(),
  decodeEntities: jest.requireActual('../../src/api/rankings').decodeEntities,
  curateRankingFiltros: jest.requireActual('../../src/api/rankings').curateRankingFiltros,
}));
const { fetchRanking } = require('../../src/api');
const RankingCatScreen = require('../../src/screens/RankingCatScreen').default;
const { T, navStub, routeStub } = require('../helpers');

const FRENO = {
  slug: 'freno', nombre: 'Freno de Oro — Ranking General', familia: 'individual',
  filtros: [
    { param: 'anio', label: 'Año', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', label: 'Categoría', default: 24, opciones: [{ value: 23, label: 'Hembras' }, { value: 24, label: 'Machos' }] },
  ],
};
const RESP = {
  titulo: 'Freno de Oro', subtitulo: 'Machos',
  columnas: [
    { key: 'position', label: '#' }, { key: 'sba', label: 'SBA' },
    { key: 'animal', label: 'Animal' }, { key: 'points', label: 'Puntaje' },
  ],
  filas: [{ position: 1, animalId: 'pdre:1000', sba: '3501 D', animal: 'CARDAL X', points: 87.5 }],
};

beforeEach(() => {
  fetchRanking.mockReset(); fetchRanking.mockResolvedValue(RESP);
  // Año "actual" fijo = 2026, para que "Próximamente" vs "No disponible" no
  // dependa de cuándo se corra la suite. `new Date(Date.now())` lee este mock.
  jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 14));
});
afterEach(() => { Date.now.mockRestore?.(); });

const renderCat = (nav = navStub()) =>
  render(<RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: FRENO })} />);

describe('RankingCatScreen', () => {
  test('pide el ranking con los filtros default y muestra el resumen en el subtítulo', async () => {
    const { findByText, getByText } = renderCat();
    expect(await findByText('CARDAL X')).toBeTruthy();
    expect(fetchRanking).toHaveBeenCalledWith('freno', { anio: 2026, categoria: 24 });
    expect(getByText('Año: 2026 - Categoría: Machos')).toBeTruthy(); // subtítulo desde los filtros fijos
    expect(getByText(/SBA 3501 D/)).toBeTruthy(); // columna secundaria
    expect(getByText('87.5')).toBeTruthy();        // puntaje
  });

  test('usa los initialFilters (año + categoría) por sobre los defaults', async () => {
    const { findByText, getByText } = render(
      <RankingCatScreen t={T} navigation={navStub()} route={routeStub({ ranking: FRENO, initialFilters: { anio: 2025, categoria: 23 } })} />,
    );
    await findByText('CARDAL X');
    expect(fetchRanking).toHaveBeenCalledWith('freno', { anio: 2025, categoria: 23 });
    expect(getByText('Año: 2025 - Categoría: Hembras')).toBeTruthy();
  });

  test('no muestra chips para cambiar año ni categoría', async () => {
    const { findByText, queryByText } = renderCat();
    await findByText('CARDAL X');
    expect(queryByText('Hembras')).toBeNull();
    expect(queryByText('2025')).toBeNull();
  });

  test('tocar una fila con animalId abre HorseDetail', async () => {
    const nav = navStub();
    const { findByText } = renderCat(nav);
    fireEvent.press(await findByText('CARDAL X'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:1000' });
  });

  test('decodifica entidades HTML (Ñ) en las filas', async () => {
    fetchRanking.mockResolvedValue({
      columnas: [{ key: 'position', label: '#' }, { key: 'name', label: 'Propietario' }, { key: 'points', label: 'Puntos' }],
      filas: [{ position: 1, name: 'CABA&Ntilde;A LA ESTRELLA', points: '109.50' }],
    });
    const { findByText } = renderCat();
    expect(await findByText('CABAÑA LA ESTRELLA')).toBeTruthy();
  });

  test('solanet: tocar una fila abre el detalle del propietario', async () => {
    const SOLANET = {
      slug: 'solanet', nombre: 'Premio Emilio Solanet', familia: 'propietario',
      filtros: [{ param: 'premio', default: 1, opciones: [
        { value: 1, label: '2024 - 2025' }, { value: 2, label: '2025 - 2026' }, { value: 3, label: '2026 - 2027' },
      ] }],
    };
    fetchRanking.mockResolvedValue({
      columnas: [{ key: 'position', label: '#' }, { key: 'propertyNumber', label: 'Nro' }, { key: 'name', label: 'Propietario' }, { key: 'points', label: 'Puntos' }],
      filas: [{ position: 1, propertyNumber: '221', name: 'MATHO GARAT, RICARDO D.', points: '109.50' }],
    });
    const nav = navStub();
    const { findByText } = render(<RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: SOLANET })} />);
    fireEvent.press(await findByText('MATHO GARAT, RICARDO D.'));
    // Sin initialFilters usa el default curado = temporada más nueva (2026-2027, value 3).
    expect(nav.navigate).toHaveBeenCalledWith('SolanetDetalle', { premio: 3, propietario: '221', nombre: 'MATHO GARAT, RICARDO D.', points: '109.50' });
  });

  test('apartes: total como puntaje, acordeón con tabla Evento/Tiempo y animales al pedigree', async () => {
    const APARTES = {
      slug: 'apartes_general', nombre: 'Aparte Campero — Ranking General', familia: 'equipo',
      filtros: [
        { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
        { param: 'categoria', default: 15, opciones: [{ value: 15, label: 'A' }] },
      ],
    };
    fetchRanking.mockResolvedValue({
      columnas: [
        { key: 'position', label: '#' }, { key: 'equipo', label: 'Equipo' },
        { key: 'tiempo1', label: 'Tiempo 1' }, { key: 'tiempo2', label: 'Tiempo 2' },
        { key: 'total', label: 'Total' },
        { key: 'evento1', label: 'Evento 1' }, { key: 'evento2', label: 'Evento 2' },
      ],
      filas: [{
        position: 1, equipo: 'los orejanos.', tiempo1: '00:47', tiempo2: '00:59', total: '01:46',
        evento1: 'EXPO LA CARLOTA', evento2: 'EXPO LABOULAYE',
        animales: [
          { sba: '67698', nombre: 'OREVA CARAMELO', jinete: 'ALEJANDRO RYAN', animalId: 'pdre:70970' },
          { sba: '75781', nombre: 'BROCAL PUESTERO', jinete: 'IGNACIO AGUIRRE', animalId: 'pdre:80428' },
        ],
      }],
    });
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(
      <RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: APARTES, initialFilters: { anio: 2026, categoria: 15 } })} />,
    );
    expect(await findByText('los orejanos.')).toBeTruthy();      // nombre del equipo
    expect(getByText('Aparte Campero')).toBeTruthy();            // header: disciplina
    expect(getByText('01:46')).toBeTruthy();                     // total como puntaje
    expect(getByText('Total')).toBeTruthy();                     // etiqueta del puntaje
    expect(getByText('OREVA CARAMELO')).toBeTruthy();            // animales SIEMPRE visibles (fuera del acordeón)
    expect(queryByText('EXPO LA CARLOTA')).toBeNull();           // tabla Evento/Tiempo colapsada

    fireEvent.press(getByText('BROCAL PUESTERO'));               // animal → pedigree sin expandir
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:80428' });

    fireEvent.press(getByText('los orejanos.'));                 // expandir acordeón (solo eventos)
    expect(getByText('EXPO LA CARLOTA')).toBeTruthy();           // tabla Evento/Tiempo
    expect(getByText('EXPO LABOULAYE')).toBeTruthy();
    expect(fetchRanking).toHaveBeenCalledWith('apartes_general', { anio: 2026, categoria: 15 });
  });

  test('fzb: promedio como puntaje, SBA + propietario en líneas y tabla Evento/Puntaje', async () => {
    const FZB2 = {
      slug: 'fzb', nombre: 'FZB — Ranking General', familia: 'individual',
      filtros: [
        { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
        { param: 'categoria', default: 6, opciones: [{ value: 6, label: 'A' }] },
      ],
    };
    fetchRanking.mockResolvedValue({
      columnas: [
        { key: 'position', label: '#' }, { key: 'sba', label: 'SBA' }, { key: 'animal', label: 'Animal' },
        { key: 'propietario', label: 'Propietario' },
        { key: 'evento1', label: 'Evento 1' }, { key: 'total1', label: 'Puntaje 1' },
        { key: 'evento2', label: 'Evento 2' }, { key: 'total2', label: 'Puntaje 2' },
        { key: 'promedio', label: 'Promedio' },
      ],
      filas: [{
        position: 1, animalId: 'exis:81774', sba: '75394', animal: 'MAÑANERA MAESTRA',
        propietario: 'DUTROC, RICARDO ALFREDO',
        evento1: 'EXPO OTOÑO', total1: '52.00', evento2: 'EL VERIJERO', total2: '55.00', promedio: '53.50',
      }],
    });
    const nav = navStub();
    const { findByText, getByText } = render(
      <RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: FZB2, initialFilters: { anio: 2026, categoria: 6 } })} />,
    );
    expect(await findByText('MAÑANERA MAESTRA')).toBeTruthy();   // nombre
    expect(getByText('53.50')).toBeTruthy();                     // promedio a la derecha
    expect(getByText(/SBA 75394/)).toBeTruthy();                 // línea SBA
    expect(getByText('Propietario: DUTROC, RICARDO ALFREDO')).toBeTruthy(); // propietario con label
    expect(getByText('EXPO OTOÑO')).toBeTruthy();                // tabla Evento/Puntaje
    expect(getByText('52.00')).toBeTruthy();
    expect(getByText('55.00')).toBeTruthy();
    fireEvent.press(getByText('MAÑANERA MAESTRA'));              // fila tappable → pedigree
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:81774' });
  });

  test('freno: puntaje a la derecha, líneas SBA·RP·AF / Jinete / Propietario', async () => {
    fetchRanking.mockResolvedValue({
      columnas: [
        { key: 'position', label: '#' }, { key: 'sba', label: 'SBA' }, { key: 'rp', label: 'RP' },
        { key: 'animal', label: 'Animal' }, { key: 'inspection', label: 'AF' },
        { key: 'rider', label: 'Jinete' }, { key: 'ownet', label: 'Propietario' },
        { key: 'event', label: 'Evento' }, { key: 'points', label: 'Puntaje' },
      ],
      filas: [{
        position: 1, animalId: 'pdre:127547', sba: '93182 D', rp: '210', animal: 'FOGATA GATOPARDO',
        inspection: 'Si', rider: 'HORACIO DANIEL CASIN', ownet: 'CRIOLLOS DON MIGUEL S.R.L.', points: '19.783',
      }],
    });
    const nav = navStub();
    const { findByText, getByText } = renderCat(nav);
    expect(await findByText('FOGATA GATOPARDO')).toBeTruthy();
    expect(getByText('19.783')).toBeTruthy();                        // puntaje a la derecha
    expect(getByText('SBA 93182 D  ·  RP 210  ·  AF Si')).toBeTruthy(); // 1ª línea
    expect(getByText('Jinete: HORACIO DANIEL CASIN')).toBeTruthy();  // 2ª línea
    expect(getByText('Propietario: CRIOLLOS DON MIGUEL S.R.L.')).toBeTruthy(); // 3ª línea
    fireEvent.press(getByText('FOGATA GATOPARDO'));                  // fila → pedigree
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:127547' });
  });

  test('corral: puntaje a la derecha, líneas SBA·RP·AF / propietario / evento (sin tabla)', async () => {
    const CORRAL = {
      slug: 'corral_general', nombre: 'Corral Aparte — Ranking General', familia: 'individual',
      filtros: [
        { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
        { param: 'categoria', default: 9, opciones: [{ value: 9, label: 'A' }] },
      ],
    };
    fetchRanking.mockResolvedValue({
      columnas: [
        { key: 'position', label: '#' }, { key: 'sba', label: 'SBA' }, { key: 'rp', label: 'RP' },
        { key: 'animal', label: 'Animal' }, { key: 'inspection', label: 'AF' },
        { key: 'propietario', label: 'Propietario' }, { key: 'puntaje', label: 'Puntaje' },
        { key: 'evento', label: 'Evento' },
      ],
      filas: [{
        position: 1, animalId: 'pdre:119084', sba: '84724', rp: '896', animal: 'TINAJERA ARROPE',
        inspection: 'Si', propietario: 'ESEVICH, VICTOR\r', puntaje: '38.50',
        evento: 'FERIAGRO (LUJAN DE CUYO) 31/05/2025',
      }],
    });
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(
      <RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: CORRAL, initialFilters: { anio: 2026, categoria: 9 } })} />,
    );
    expect(await findByText('TINAJERA ARROPE')).toBeTruthy();       // nombre
    expect(getByText('38.50')).toBeTruthy();                        // puntaje a la derecha
    expect(getByText('SBA 84724  ·  RP 896  ·  AF Si')).toBeTruthy(); // 1ª línea con AF
    expect(getByText('Propietario: ESEVICH, VICTOR')).toBeTruthy();  // 2ª (sin el \r)
    expect(getByText('FERIAGRO (LUJAN DE CUYO) 31/05/2025')).toBeTruthy(); // 3ª: evento
    expect(queryByText('Evento')).toBeNull();                       // no hay tabla (encabezado)
    fireEvent.press(getByText('TINAJERA ARROPE'));                  // fila → pedigree
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:119084' });
  });

  test('rodeos: subtítulo del campeonato viene de la API y usa la yunta (animals)', async () => {
    const RODEOS = {
      slug: 'rodeos', nombre: 'Rodeos — Ranking', familia: 'equipo',
      filtros: [
        { param: 'calendario', default: 22, opciones: [{ value: 22, label: '2024 - 2025' }] },
        { param: 'tipo', default: 1, opciones: [{ value: 1, label: 'General' }] },
      ],
    };
    fetchRanking.mockResolvedValue({
      subtitulo: '57° CAMPEONATO NACIONAL\\nRANKING GENERAL', // barra-n literal, como la API
      columnas: [
        { key: 'position', label: '#' },
        { key: 'totalPointsObtained', label: 'Puntos obtenidos' },
        { key: 'totalPointsRanking', label: 'Puntos ranking' },
      ],
      filas: [{
        position: 1, totalPointsObtained: 148, totalPointsRanking: '95.00',
        animals: [{ sba: '87399', name: 'CONTRAFUEGO TEJEDORA', rider: 'SANTIAGO GABRIELLI', animalId: 'exis:105929' }],
      }],
    });
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(
      <RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: RODEOS, initialFilters: { tipo: 2 } })} />,
    );
    expect(await findByText('CONTRAFUEGO TEJEDORA')).toBeTruthy();
    expect(getByText('57° CAMPEONATO NACIONAL · RANKING GENERAL')).toBeTruthy(); // subtítulo sin \n literal
    expect(getByText('95.00')).toBeTruthy(); // puntaje desde totalPointsRanking
    expect(getByText('Puntos ranking')).toBeTruthy(); // etiqueta bajo el puntaje prominente
    expect(queryByText(/Puntos obtenidos/)).toBeNull(); // oculto por ahora
    fireEvent.press(getByText('CONTRAFUEGO TEJEDORA'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:105929' });
    expect(fetchRanking).toHaveBeenCalledWith('rodeos', { calendario: 22, tipo: 2 });
  });

  test('sin filas muestra empty state', async () => {
    fetchRanking.mockResolvedValue({ columnas: [], filas: [] });
    const { findByText } = renderCat();
    expect(await findByText(/No hay datos/)).toBeTruthy();
  });

  test('modo pdf: muestra el botón "Ver ranking (PDF)" y abre el pdf_url', async () => {
    fetchRanking.mockResolvedValue({ modo: 'pdf', pdf_url: 'https://drive.google.com/file/d/XXX/view', columnas: [], filas: [] });
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText } = renderCat();
    fireEvent.press(await findByText('Ver ranking (PDF)'));
    expect(spy).toHaveBeenCalledWith('https://drive.google.com/file/d/XXX/view');
    spy.mockRestore();
  });

  test('modo not_available en el año actual: muestra "Próximamente"', async () => {
    // renderCat usa FRENO con anio default 2026 (= año actual mockeado).
    fetchRanking.mockResolvedValue({ modo: 'not_available', pdf_url: null, columnas: [], filas: [] });
    const { findByText } = renderCat();
    expect(await findByText('Próximamente')).toBeTruthy();
  });

  test('modo not_available en un año anterior al actual: muestra "No disponible"', async () => {
    fetchRanking.mockResolvedValue({ modo: 'not_available', pdf_url: null, columnas: [], filas: [] });
    const { findByText, queryByText } = render(
      <RankingCatScreen t={T} navigation={navStub()} route={routeStub({ ranking: FRENO, initialFilters: { anio: 2025, categoria: 24 } })} />,
    );
    expect(await findByText('No disponible')).toBeTruthy();
    expect(queryByText('Próximamente')).toBeNull();
  });
});
